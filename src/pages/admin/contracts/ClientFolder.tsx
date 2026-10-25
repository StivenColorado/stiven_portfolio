import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Download, FilePlus, FolderOpen, Pencil, Send } from "lucide-react";
import ConfirmDialog from "../../../components/admin/ui/ConfirmDialog";
import EmptyState from "../../../components/admin/ui/EmptyState";
import Field from "../../../components/admin/ui/Field";
import { useToast } from "../../../components/admin/ui/toastContext";
import Select from "../../../components/ui/Select";
import DocStatusBadge from "../../../components/contracts/DocStatusBadge";
import SendDialog from "../../../components/contracts/SendDialog";
import ProcessTimeline from "../../../components/contracts/ProcessTimeline";
import { fmtShort } from "../../../components/admin/format";
import { isConflict, isUnauthorized } from "../../../lib/adminApi";
import { clientsApi, docsApi, templatesApi } from "../../../lib/contractsApi";
import { shortHash } from "../../../lib/contractVars";
import { parseId } from "../services/useEditor";
import type { AdminClient, ContractDoc, ContractTemplate, DocKind } from "../../../types/contracts";

const CHILD_KINDS = new Set(["change_order", "acceptance", "data_processing"]);
const RESENDABLE = new Set(["sent"]);
const CANCELLABLE = new Set(["draft", "sent", "client_signed", "active"]);

function flatten(items: ContractDoc[]): ContractDoc[] {
    const seen = new Map<number, ContractDoc>();
    const walk = (list: ContractDoc[]) => list.forEach((d) => {
        if (!seen.has(d.id)) seen.set(d.id, d);
        if (d.children) walk(d.children);
    });
    walk(items);
    return [...seen.values()];
}

export default function ClientFolder() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();
    const id = parseId(useParams().clientId);
    const [client, setClient] = useState<AdminClient | null>(null);
    const [docs, setDocs] = useState<ContractDoc[]>([]);
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<"notFound" | "failed" | null>(null);
    const [creating, setCreating] = useState(false);
    const [tplId, setTplId] = useState("");
    const [title, setTitle] = useState("");
    const [parentId, setParentId] = useState("");
    const [busy, setBusy] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<ContractDoc | null>(null);
    const [resendTarget, setResendTarget] = useState<ContractDoc | null>(null);

    const load = useCallback(async () => {
        if (id === null) return setError("notFound");
        setError(null);
        try {
            const [c, d] = await Promise.all([clientsApi.get(id), clientsApi.docs(id)]);
            setClient(c);
            setDocs(flatten(d));
        } catch (e) {
            if (!isUnauthorized(e)) setError((e as { status?: number }).status === 404 ? "notFound" : "failed");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setLoading(true);
        void load();
    }, [load]);

    useEffect(() => {
        if (!client) return;
        templatesApi.list(client.lang).then(setTemplates).catch(() => setTemplates([]));
    }, [client]);

    const roots = useMemo(() => docs.filter((d) => d.parentId === null || !docs.some((p) => p.id === d.parentId)), [docs]);
    const kids = (parent: number) => docs.filter((d) => d.parentId === parent);
    const tpl = templates.find((x) => String(x.id) === tplId);
    const needsParent = !!tpl && CHILD_KINDS.has(tpl.kind);
    const parents = docs.filter((d) => !CHILD_KINDS.has(d.kind) && d.status !== "cancelled");

    const openCreate = () => { setTplId(""); setTitle(""); setParentId(""); setCreating(true); };

    const openCreateFor = (kind: DocKind) => {
        const found = templates.find((x) => x.kind === kind);
        if (!found) return openCreate();
        const contract = docs.find((d) => d.kind === "services" && d.status !== "cancelled");
        setTplId(String(found.id));
        setTitle(found.name);
        setParentId(CHILD_KINDS.has(kind) && contract ? String(contract.id) : "");
        setCreating(true);
    };

    const create = async () => {
        if (id === null || !tpl) return;
        setBusy(true);
        try {
            const doc = await clientsApi.createDoc(id, {
                templateId: tpl.id,
                parentId: needsParent && parentId ? Number(parentId) : undefined,
                title: title.trim() || undefined,
            });
            navigate(`/admin/contratos/${id}/documentos/${doc.id}`);
        } catch (e) {
            if (!isUnauthorized(e)) toast(t("adminContracts.docs.createFailed"), "error");
            setBusy(false);
        }
    };

    const cancelDoc = async () => {
        if (!cancelTarget) return;
        setBusy(true);
        try {
            await docsApi.cancel(cancelTarget.id);
            toast(t("adminContracts.docs.cancelled"));
            setCancelTarget(null);
            await load();
        } catch (e) {
            if (!isUnauthorized(e)) toast(isConflict(e) ? t("adminContent.common.conflict") : t("adminContracts.common.actionFailed"), "error");
        } finally {
            setBusy(false);
        }
    };

    if (error === "notFound") return <EmptyState title={t("adminContracts.clients.notFound")} action={<Link to="/admin/contratos" className="btn">{t("adminContracts.common.backToList")}</Link>} />;
    if (error === "failed") return <EmptyState title={t("adminContracts.common.loadFailed")} action={<button type="button" className="btn" onClick={() => void load()}>{t("adminContracts.common.retry")}</button>} />;
    if (loading || !client) return <p className="text-sm text-muted" role="status">{t("adminContracts.common.loading")}</p>;

    const tplOptions = templates.map((x) => ({ value: String(x.id), label: x.name, group: t(`adminContracts.kind.${x.kind}`) }))
        .sort((a, b) => a.group.localeCompare(b.group));
    const parentOptions = parents.map((d) => ({ value: String(d.id), label: d.title }));

    const row = (d: ContractDoc, depth: number) => (
        <li key={d.id} className="min-w-0">
            <div className={`flex flex-col gap-2 border-2 border-ink bg-paper p-3 ${depth ? "ml-4 sm:ml-8 border-dashed" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/contratos/${client.id}/documentos/${d.id}`} className="min-w-0 break-words font-extrabold text-ink underline underline-offset-4">{d.title}</Link>
                    <DocStatusBadge status={d.status} />
                    <span className="tag">{t(`adminContracts.kind.${d.kind}`)}</span>
                    {d.version > 0 && <span className="font-mono text-xs text-muted">v{d.version}{d.contentHash ? ` · ${shortHash(d.contentHash)}` : ""}</span>}
                </div>
                <p className="text-xs text-muted">
                    {t("adminContracts.docs.updated", { date: fmtShort.format(d.updatedAt) })}
                    {d.sentAt ? ` · ${t("adminContracts.docs.sentOn", { date: fmtShort.format(d.sentAt) })}` : ""}
                    {d.link?.expired && d.status === "sent" ? ` · ${t("adminContracts.docs.linkExpired")}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/contratos/${client.id}/documentos/${d.id}`} className="btn !min-h-10 !px-3 !py-1 !text-xs"><FolderOpen size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.open")}</Link>
                    <a href={docsApi.pdfUrl(d.id)} target="_blank" rel="noopener" className="btn !min-h-10 !px-3 !py-1 !text-xs"><Download size={13} strokeWidth={2.5} aria-hidden /> PDF</a>
                    {RESENDABLE.has(d.status) && <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-xs" onClick={() => setResendTarget(d)}><Send size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.resend")}</button>}
                    {CANCELLABLE.has(d.status) && <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-xs" onClick={() => setCancelTarget(d)}><Ban size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.cancel")}</button>}
                </div>
            </div>
            {kids(d.id).length > 0 && <ul className="mt-2 space-y-2">{kids(d.id).map((k) => row(k, depth + 1))}</ul>}
        </li>
    );

    return (
        <div className="min-w-0 space-y-6">
            <header className="space-y-2">
                <Link to="/admin/contratos" className="inline-flex min-h-10 items-center gap-1 text-sm underline underline-offset-4 hover:bg-ink hover:text-paper">
                    <ArrowLeft size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.backToList")}
                </Link>
                <p className="eyebrow">{t("adminContracts.title")}</p>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="break-words font-display text-3xl tracking-tight text-ink">{client.name}</h1>
                    {client.status === "archived" && <span className="tag dither">{t("adminContracts.clients.statusArchived")}</span>}
                </div>
            </header>

            <section className="window">
                <div className="window-bar">
                    <span className="window-dot" aria-hidden="true" />
                    <span className="flex-1 truncate">{`cliente-${client.id}.dir`}</span>
                </div>
                <div className="window-body flex flex-wrap items-start justify-between gap-4">
                    <dl className="grid min-w-0 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                        {([
                            ["legalName", client.legalName, true],
                            ["docNumber", client.docNumber && `${client.docType} ${client.docNumber}`, true],
                            ["contactName", client.contactName, true], ["email", client.email, false], ["phone", client.phone, false],
                            ["city", client.city && [client.city, client.country].filter(Boolean).join(", "), true], ["lang", t(`adminContracts.lang.${client.lang}`), false],
                        ] as const).filter(([, v, later]) => v || later).map(([k, v]) => (
                            <div key={k} className="min-w-0">
                                <dt className="eyebrow">{t(`adminContracts.clients.${k}`)}</dt>
                                <dd className={`break-words ${v ? "text-ink" : "text-muted underline decoration-dashed"}`}>{v || t("adminContracts.clients.pending")}</dd>
                            </div>
                        ))}
                        {client.provided && <p role="status" className="text-xs font-extrabold sm:col-span-2">{t("adminContracts.clients.providedBy", { date: fmtShort.format(client.provided.at) })}</p>}
                    </dl>
                    <Link to={`/admin/contratos/${client.id}/editar`} className="btn"><Pencil size={16} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.edit")}</Link>
                </div>
            </section>

            <ProcessTimeline docs={docs} clientId={client.id} onCreate={openCreateFor} />

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-2xl tracking-tight text-ink">{t("adminContracts.docs.title")}</h2>
                    <button type="button" className="btn btn-primary" onClick={openCreate}><FilePlus size={16} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.new")}</button>
                </div>
                {roots.length === 0
                    ? <EmptyState title={t("adminContracts.docs.empty")}>{t("adminContracts.docs.emptyBody")}</EmptyState>
                    : <ul className="space-y-3">{roots.map((d) => row(d, 0))}</ul>}
            </section>

            <ConfirmDialog
                open={creating}
                wide
                title={t("adminContracts.docs.newTitle")}
                busy={busy}
                confirmDisabled={!tpl || (needsParent && !parentId)}
                confirmLabel={t("adminContracts.docs.create")}
                onConfirm={() => void create()}
                onCancel={() => { setCreating(false); setBusy(false); }}
            >
                <div className="space-y-4 text-ink">
                    <Select label={t("adminContracts.docs.template")} options={tplOptions} value={tplId} onChange={(v: string) => { setTplId(v); setTitle(templates.find((x) => String(x.id) === v)?.name ?? ""); }} placeholder={t("adminContracts.docs.templatePlaceholder")} searchable={tplOptions.length > 6} />
                    <Field label={t("adminContracts.docs.titleField")} value={title} onChange={setTitle} maxLength={160} />
                    {needsParent && <Select label={t("adminContracts.docs.parent")} options={parentOptions} value={parentId} onChange={(v: string) => setParentId(v)} placeholder={t("adminContracts.docs.parentPlaceholder")} searchable={false} />}
                </div>
            </ConfirmDialog>

            <ConfirmDialog
                open={cancelTarget !== null}
                title={t("adminContracts.docs.cancelTitle", { title: cancelTarget?.title ?? "" })}
                destructive
                busy={busy}
                confirmLabel={t("adminContracts.docs.cancel")}
                onConfirm={() => void cancelDoc()}
                onCancel={() => setCancelTarget(null)}
            >
                {t("adminContracts.docs.cancelBody")}
            </ConfirmDialog>

            <SendDialog
                open={resendTarget !== null}
                resend
                title={resendTarget?.title ?? ""}
                defaultEmail={client.email || resendTarget?.sentTo || ""}
                defaultRemind={0}
                hasSaved={false}
                onSubmit={async (input) => (await docsApi.resend(resendTarget!.id, { email: input.email, expiresInDays: input.expiresInDays })).link}
                onClose={() => { setResendTarget(null); void load(); }}
            />
        </div>
    );
}
