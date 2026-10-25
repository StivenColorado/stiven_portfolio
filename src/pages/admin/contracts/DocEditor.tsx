import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Download, FilePlus, PenLine, Send, Trash2, Undo2 } from "lucide-react";
import ConfirmDialog from "../../../components/admin/ui/ConfirmDialog";
import EmptyState from "../../../components/admin/ui/EmptyState";
import Field from "../../../components/admin/ui/Field";
import { useToast } from "../../../components/admin/ui/toastContext";
import Select from "../../../components/ui/Select";
import DocStatusBadge from "../../../components/contracts/DocStatusBadge";
import DocView from "../../../components/contracts/DocView";
import type { PartySig } from "../../../components/contracts/DocView";
import SendDialog from "../../../components/contracts/SendDialog";
import SignaturePad from "../../../components/contracts/SignaturePad";
import SignatureView from "../../../components/contracts/SignatureView";
import { fmtDateTime } from "../../../components/admin/format";
import { isConflict, isUnauthorized } from "../../../lib/adminApi";
import { extractVars, fill, missingVars, toBlocks } from "../../../lib/contractText";
import { previewBlocks, shortHash, varLabel, varType } from "../../../lib/contractVars";
import { clientsApi, contractsSettingsApi, docsApi, templatesApi } from "../../../lib/contractsApi";
import type { AdminClient, ContractDoc, DocInput, DocVersion, Signature, Strokes } from "../../../types/contracts";
import { EditorFrame } from "../services/editorKit";
import { parseId, useEditor } from "../services/useEditor";

interface Form { title: string; body: string; variables: Record<string, string>; remindDays: string; expiresAt: string }

const EMPTY: Form = { title: "", body: "", variables: {}, remindDays: "0", expiresAt: "" };

const toForm = (d: ContractDoc): Form => ({
    title: d.title, body: d.body, variables: d.variables ?? {}, remindDays: String(d.remindDays ?? 0), expiresAt: d.expiresAt ?? "",
});

const toInput = (f: Form): DocInput => ({
    title: f.title.trim(),
    body: f.body,
    variables: f.variables,
    remindDays: Math.min(30, Math.max(0, Math.trunc(Number(f.remindDays)) || 0)),
    expiresAt: f.expiresAt || null,
});

const api = {
    get: docsApi.get,
    create: () => Promise.reject(new Error("unsupported")),
    update: docsApi.update,
};

const party = (s?: Signature): PartySig | undefined => (s ? { name: s.name, strokes: s.strokes, date: fmtDateTime.format(s.ts) } : undefined);

const absolute = (link: string) => (link.startsWith("/") ? `${window.location.origin}${link}` : link);

function useDialog(open: boolean, onClose: () => void) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);
    return { ref, onClose };
}

function VersionDialog({ version, doc, onClose }: { version: DocVersion | null; doc: ContractDoc; onClose: () => void }) {
    const { t } = useTranslation();
    const { ref } = useDialog(version !== null, onClose);
    return (
        <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()} className="window m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden">
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate">{version ? `v${version.version}.txt` : ""}</span>
            </div>
            <div className="space-y-3 p-4">
                {version && <DocView blocks={toBlocks(version.rendered)} title={doc.title} cover={doc.cover} />}
                <div className="flex justify-end"><button type="button" className="btn" onClick={() => ref.current?.close()}>{t("adminContracts.common.close")}</button></div>
            </div>
        </dialog>
    );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="window window-body space-y-3 !shadow-none">
            <h2 className="eyebrow">{title}</h2>
            {children}
        </section>
    );
}

function SigBox({ who, sig }: { who: string; sig?: Signature }) {
    const { t } = useTranslation();
    return (
        <div className="min-w-0 space-y-2 border-2 border-ink p-3">
            <p className="eyebrow">{who}</p>
            {sig ? (
                <>
                    <SignatureView strokes={sig.strokes} label={t("adminContracts.sig.of", { name: sig.name })} className="max-h-28" />
                    <dl className="space-y-0.5 break-words text-xs text-muted">
                        <div><dt className="inline font-extrabold text-ink">{sig.name}</dt></div>
                        <div>{fmtDateTime.format(sig.ts)}</div>
                        {sig.ip && <div>IP {sig.ip}</div>}
                        {sig.ua && <div>{sig.ua}</div>}
                        <div className="font-mono">SHA-256 {shortHash(sig.hash)}</div>
                    </dl>
                </>
            ) : <p className="text-sm text-muted">{t("adminContracts.sig.pending")}</p>}
        </div>
    );
}

export default function DocEditor() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();
    const params = useParams();
    const clientId = parseId(params.clientId);
    const docId = parseId(params.docId);
    const [client, setClient] = useState<AdminClient | null>(null);
    const [hasSaved, setHasSaved] = useState(false);
    const [sendOpen, setSendOpen] = useState(false);
    const [resendOpen, setResendOpen] = useState(false);
    const [signOpen, setSignOpen] = useState(false);
    const [signMode, setSignMode] = useState<"saved" | "draw">("saved");
    const [drawn, setDrawn] = useState<Strokes | null>(null);
    const [revokeOpen, setRevokeOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [viewing, setViewing] = useState<DocVersion | null>(null);

    const { item, form, patch, loading, loadError, retry, saving, err, dirty, save } = useEditor<ContractDoc, Form, DocInput>({
        api, id: docId, basePath: `/admin/contratos/${clientId ?? 0}/documentos`, empty: EMPTY, toForm, toInput,
    });

    useEffect(() => {
        if (clientId !== null) clientsApi.get(clientId).then(setClient).catch(() => undefined);
        contractsSettingsApi.getSignature().then((s) => setHasSaved(!!s)).catch(() => undefined);
    }, [clientId]);

    const draft = item?.status === "draft";
    const defs = useMemo(() => item?.varDefs ?? [], [item]);
    const lang = item?.lang ?? "es";
    const keys = useMemo(() => [...new Set([...extractVars(form.body), ...defs.map((d) => d.key)])], [form.body, defs]);
    const blocks = useMemo(() => {
        if (!item) return [];
        return draft ? previewBlocks(form.body, form.variables, defs, lang) : toBlocks(item.rendered ?? "");
    }, [item, draft, form.body, form.variables, defs, lang]);
    const missing = useMemo(() => (draft ? missingVars(fill(form.body, form.variables)) : []), [draft, form.body, form.variables]);

    const back = `/admin/contratos/${clientId ?? ""}`;
    const setVar = (key: string, value: string) => patch({ variables: { ...form.variables, [key]: value } });

    const run = async (action: () => Promise<unknown>, okKey: string, after?: () => void) => {
        setBusy(true);
        try {
            await action();
            toast(t(okKey));
            (after ?? retry)();
        } catch (e) {
            if (!isUnauthorized(e)) toast(isConflict(e) ? t("adminContent.common.conflict") : t("adminContracts.common.actionFailed"), "error");
        } finally {
            setBusy(false);
            setRevokeOpen(false);
            setCancelOpen(false);
            setSignOpen(false);
            setDeleteOpen(false);
        }
    };

    const createAnnex = async (kind: "change_order" | "acceptance") => {
        if (!item || clientId === null) return;
        try {
            const tpl = (await templatesApi.list(item.lang)).find((x) => x.kind === kind);
            if (!tpl) return toast(t("adminContracts.docs.noTemplate"), "error");
            const doc = await clientsApi.createDoc(clientId, { templateId: tpl.id, parentId: item.id });
            navigate(`/admin/contratos/${clientId}/documentos/${doc.id}`);
        } catch (e) {
            if (!isUnauthorized(e)) toast(t("adminContracts.docs.createFailed"), "error");
        }
    };

    if (docId === null || loadError === "notFound") {
        return <EmptyState title={t("adminContracts.docs.notFound")} action={<Link to={back} className="btn">{t("adminContracts.docs.backToFolder")}</Link>} />;
    }
    if (loadError === "failed") return <EmptyState title={t("adminContracts.common.loadFailed")} action={<button type="button" className="btn" onClick={retry}>{t("adminContracts.common.retry")}</button>} />;
    if (loading || !item) return <p className="text-sm text-muted" role="status">{t("adminContracts.common.loading")}</p>;

    const status = item.status;
    const btn = "btn !min-h-9 !px-3 !py-1 !text-sm";
    const typeOf = (k: string) => varType(k, defs);
    const currencyOptions = ["COP", "USD"].map((v) => ({ value: v, label: v }));

    const actions = (
        <div className="flex flex-wrap items-center gap-2">
            {draft && <button type="button" className={`${btn} btn-primary`} disabled={dirty || missing.length > 0 || saving} title={dirty ? t("adminContracts.docs.saveFirst") : undefined} onClick={() => setSendOpen(true)}><Send size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.send")}</button>}
            {status === "sent" && <button type="button" className={btn} onClick={() => setResendOpen(true)}><Send size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.resend")}</button>}
            {status === "client_signed" && <button type="button" className={`${btn} btn-primary`} onClick={() => { setDrawn(null); setSignMode(hasSaved ? "saved" : "draw"); setSignOpen(true); }}><PenLine size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.ownerSign")}</button>}
            {(status === "sent" || status === "client_signed") && <button type="button" className={btn} onClick={() => { setNote(""); setRevokeOpen(true); }}><Undo2 size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.revoke")}</button>}
            {["draft", "sent", "client_signed", "active"].includes(status) && <button type="button" className={btn} onClick={() => { setNote(""); setCancelOpen(true); }}><Ban size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.cancel")}</button>}
            <a href={docsApi.pdfUrl(item.id)} target="_blank" rel="noopener" className={btn}><Download size={14} strokeWidth={2.5} aria-hidden /> {status === "draft" ? t("adminContracts.docs.pdfDraft") : "PDF"}</a>
            {(draft || status === "cancelled") && <button type="button" className={btn} onClick={() => setDeleteOpen(true)}><Trash2 size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.delete")}</button>}
        </div>
    );

    const panels = (
        <>
            {!draft && (
                <Panel title={t("adminContracts.sig.title")}>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <SigBox who={t("adminContracts.sig.owner")} sig={item.signatures?.owner} />
                        <SigBox who={t("adminContracts.sig.client")} sig={item.signatures?.client} />
                    </div>
                    {item.contentHash && <p className="break-all font-mono text-xs text-muted">SHA-256 {item.contentHash}</p>}
                    {item.link && <p className="text-xs text-muted">{item.link.expired ? t("adminContracts.docs.linkExpired") : t("adminContracts.docs.linkUntil", { date: fmtDateTime.format(item.link.expiresAt) })}</p>}
                </Panel>
            )}
            {(item.versions?.length ?? 0) > 0 && (
                <Panel title={t("adminContracts.versions.title")}>
                    <ul className="space-y-2">
                        {item.versions!.map((v) => (
                            <li key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-mono font-extrabold">v{v.version}</span>
                                <span className="font-mono text-xs text-muted">{shortHash(v.contentHash)}</span>
                                <span className="text-xs text-muted">{fmtDateTime.format(v.createdAt)}</span>
                                {v.note && <span className="min-w-0 break-words text-xs">{v.note}</span>}
                                <button type="button" className="btn ml-auto !min-h-8 !px-3 !py-1 !text-xs" onClick={() => setViewing(v)}>{t("adminContracts.versions.view")}</button>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}
            <Panel title={t("adminContracts.annexes.title")}>
                {(item.children?.length ?? 0) > 0 ? (
                    <ul className="space-y-2">
                        {item.children!.map((c) => (
                            <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <Link to={`/admin/contratos/${clientId}/documentos/${c.id}`} className="min-w-0 break-words font-extrabold underline underline-offset-4">{c.title}</Link>
                                <DocStatusBadge status={c.status} />
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted">{t("adminContracts.annexes.none")}</p>}
                {["sent", "client_signed", "active"].includes(status) && item.kind !== "change_order" && item.kind !== "acceptance" && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={btn} onClick={() => void createAnnex("change_order")}><FilePlus size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.annexes.newChange")}</button>
                        <button type="button" className={btn} onClick={() => void createAnnex("acceptance")}><FilePlus size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.annexes.newAcceptance")}</button>
                    </div>
                )}
            </Panel>
        </>
    );

    const body = (
        <div className="space-y-6">
            {actions}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
                <div className="min-w-0 space-y-6">
                    {draft ? (
                        <>
                            <Panel title={t("adminContracts.docs.sectionDoc")}>
                                <Field label={t("adminContracts.docs.titleField")} value={form.title} onChange={(v) => patch({ title: v })} maxLength={160} required error={err("title")} />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label={t("adminContracts.docs.remindDays")} type="number" min={0} max={30} value={form.remindDays} onChange={(v) => patch({ remindDays: v })} hint={t("adminContracts.send.remindHint")} error={err("remindDays")} />
                                    <Field label={t("adminContracts.docs.expiresAt")} type="date" value={form.expiresAt} onChange={(v) => patch({ expiresAt: v })} hint={t("adminContracts.docs.expiresHint")} error={err("expiresAt")} />
                                </div>
                            </Panel>
                            <Panel title={t("adminContracts.docs.sectionVars")}>
                                {missing.length > 0 && <p role="status" className="dither border-2 border-dashed border-ink p-2 text-xs font-extrabold">{t("adminContracts.docs.missing", { vars: missing.join(", ") })}</p>}
                                {keys.length === 0 && <p className="text-sm text-muted">{t("adminContracts.docs.noVars")}</p>}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {keys.map((k) => {
                                        const type = typeOf(k);
                                        const label = varLabel(k, defs);
                                        const value = form.variables[k] ?? "";
                                        const error = err(`variables.${k}`);
                                        if (k === "moneda") return <Select key={k} label={label} options={currencyOptions} value={value || "COP"} onChange={(v: string) => setVar(k, v || value)} searchable={false} />;
                                        if (type === "textarea") return <div key={k} className="sm:col-span-2"><Field label={label} as="textarea" rows={4} maxLength={5000} value={value} onChange={(v) => setVar(k, v)} error={error} /></div>;
                                        return <Field key={k} label={label} type={type === "date" ? "date" : type === "number" || type === "money" ? "number" : "text"} maxLength={5000} value={value} onChange={(v) => setVar(k, v)} error={error} />;
                                    })}
                                </div>
                                {err("variables") && <p role="alert" className="text-sm font-extrabold">{err("variables")}</p>}
                            </Panel>
                            <Panel title={t("adminContracts.docs.sectionBody")}>
                                <div className="space-y-1">
                                    <label htmlFor="doc-body" className="eyebrow">{t("adminContracts.docs.body")}</label>
                                    <textarea id="doc-body" value={form.body} onChange={(e) => patch({ body: e.target.value })} rows={18} maxLength={100000} spellCheck className="field font-mono !text-sm" aria-invalid={err("body") ? true : undefined} />
                                    <p className="text-xs text-muted">{t("adminContracts.markup")}</p>
                                    {err("body") && <p role="alert" className="text-sm font-extrabold">{err("body")}</p>}
                                </div>
                            </Panel>
                        </>
                    ) : (
                        <p role="status" className="dither border-2 border-dashed border-ink p-3 text-sm font-extrabold">{t(status === "cancelled" ? "adminContracts.docs.readonlyCancelled" : "adminContracts.docs.readonly")}</p>
                    )}
                    {panels}
                </div>
                <aside aria-label={t("adminContracts.docs.preview")} className="min-w-0 space-y-2 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
                    <p className="eyebrow">{t("adminContracts.docs.preview")}</p>
                    <DocView
                        blocks={blocks}
                        title={item.title}
                        cover={{ clientName: client?.name, ownerName: item.signatures?.owner?.name, ...item.cover }}
                        owner={party(item.signatures?.owner)}
                        client={party(item.signatures?.client)}
                    />
                </aside>
            </div>
        </div>
    );

    const eyebrow = client ? client.name : t("adminContracts.title");
    const heading = item.title;

    return (
        <>
            {draft ? (
                <EditorFrame eyebrow={eyebrow} heading={heading} backTo={back} backLabel={t("adminContracts.docs.backToFolder")} saving={saving} dirty={dirty} publishLabel={false} onSave={() => void save(false)}>
                    {body}
                </EditorFrame>
            ) : (
                <div className="min-w-0 space-y-6">
                    <header className="space-y-2">
                        <Link to={back} className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:bg-ink hover:text-paper"><ArrowLeft size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.docs.backToFolder")}</Link>
                        <p className="eyebrow">{eyebrow}</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="break-words font-display text-3xl tracking-tight text-ink">{heading}</h1>
                            <DocStatusBadge status={status} />
                            <span className="font-mono text-xs text-muted">v{item.version}</span>
                        </div>
                    </header>
                    {body}
                </div>
            )}

            <SendDialog
                open={sendOpen}
                title={item.title}
                defaultEmail={item.sentTo ?? client?.email ?? ""}
                defaultRemind={Number(form.remindDays) || 0}
                hasSaved={hasSaved}
                onSubmit={async (input) => absolute((await docsApi.send(item.id, input)).link)}
                onClose={() => { if (sendOpen) { setSendOpen(false); retry(); } }}
            />
            <SendDialog
                open={resendOpen}
                resend
                title={item.title}
                defaultEmail={item.sentTo ?? client?.email ?? ""}
                defaultRemind={0}
                hasSaved={false}
                onSubmit={async (input) => absolute((await docsApi.resend(item.id, { email: input.email, expiresInDays: input.expiresInDays })).link)}
                onClose={() => { if (resendOpen) { setResendOpen(false); retry(); } }}
            />
            <ConfirmDialog
                open={signOpen}
                title={t("adminContracts.docs.ownerSignTitle")}
                busy={busy}
                confirmDisabled={signMode === "draw" && !drawn}
                confirmLabel={t("adminContracts.docs.ownerSign")}
                onConfirm={() => void run(() => docsApi.sign(item.id, { signature: signMode === "draw" ? drawn : null, useSaved: signMode === "saved" }), "adminContracts.docs.signed")}
                onCancel={() => setSignOpen(false)}
            >
                {signOpen && (
                    <div className="space-y-3 text-ink">
                        {hasSaved && (["saved", "draw"] as const).map((m) => (
                            <label key={m} className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                                <input type="radio" name="owner-sign" checked={signMode === m} onChange={() => setSignMode(m)} className="size-4 accent-[var(--ink)]" />
                                {t(`adminContracts.send.mode.${m}`)}
                            </label>
                        ))}
                        {signMode === "draw" && <SignaturePad onChange={setDrawn} />}
                    </div>
                )}
            </ConfirmDialog>
            <ConfirmDialog open={revokeOpen} destructive busy={busy} title={t("adminContracts.docs.revokeTitle")} confirmLabel={t("adminContracts.docs.revoke")} onConfirm={() => void run(() => docsApi.revoke(item.id, note.trim() || undefined), "adminContracts.docs.revoked")} onCancel={() => setRevokeOpen(false)}>
                <div className="space-y-3"><p>{t("adminContracts.docs.revokeBody")}</p><Field label={t("adminContracts.docs.note")} value={note} onChange={setNote} maxLength={300} /></div>
            </ConfirmDialog>
            <ConfirmDialog open={cancelOpen} destructive busy={busy} title={t("adminContracts.docs.cancelTitle", { title: item.title })} confirmLabel={t("adminContracts.docs.cancel")} onConfirm={() => void run(() => docsApi.cancel(item.id, note.trim() || undefined), "adminContracts.docs.cancelled")} onCancel={() => setCancelOpen(false)}>
                <div className="space-y-3"><p>{t("adminContracts.docs.cancelBody")}</p><Field label={t("adminContracts.docs.reason")} value={note} onChange={setNote} maxLength={300} /></div>
            </ConfirmDialog>
            <ConfirmDialog open={deleteOpen} destructive busy={busy} title={t("adminContracts.docs.deleteTitle", { title: item.title })} confirmLabel={t("adminContracts.common.delete")} onConfirm={() => void run(() => docsApi.remove(item.id), "adminContracts.common.deleted", () => navigate(back))} onCancel={() => setDeleteOpen(false)}>
                {t("adminContracts.docs.deleteBody")}
            </ConfirmDialog>
            <VersionDialog version={viewing} doc={item} onClose={() => setViewing(null)} />
        </>
    );
}
