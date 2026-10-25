import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Archive, ArchiveRestore, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../components/admin/ui/ConfirmDialog";
import EmptyState from "../../../components/admin/ui/EmptyState";
import { useToast } from "../../../components/admin/ui/toastContext";
import Select from "../../../components/ui/Select";
import { isConflict, isUnauthorized } from "../../../lib/adminApi";
import { clientsApi } from "../../../lib/contractsApi";
import { DOC_STATUSES } from "../../../types/contracts";
import type { AdminClient, ClientStatus } from "../../../types/contracts";

type Filter = ClientStatus | "all";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ClientsList() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [items, setItems] = useState<AdminClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<Filter>("active");
    const [target, setTarget] = useState<AdminClient | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            setItems(await clientsApi.list("all"));
        } catch (e) {
            if (!isUnauthorized(e)) setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const shown = useMemo(() => {
        const needle = norm(q.trim());
        return items.filter((c) =>
            (filter === "all" || c.status === filter) &&
            (!needle || norm(`${c.name} ${c.legalName} ${c.docNumber} ${c.contactName} ${c.email}`).includes(needle)));
    }, [items, q, filter]);

    const toggleArchive = async (c: AdminClient) => {
        try {
            const next = await clientsApi.setStatus(c.id, c.status === "active" ? "archived" : "active");
            setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...next } : x)));
            toast(t(next.status === "archived" ? "adminContracts.clients.archived" : "adminContracts.clients.restored"));
        } catch (e) {
            if (!isUnauthorized(e)) toast(t("adminContracts.common.actionFailed"), "error");
        }
    };

    const remove = async () => {
        if (!target) return;
        setBusy(true);
        try {
            await clientsApi.remove(target.id);
            setItems((prev) => prev.filter((x) => x.id !== target.id));
            toast(t("adminContracts.common.deleted"));
            setTarget(null);
        } catch (e) {
            if (!isUnauthorized(e)) {
                const code = (e as { code?: string }).code;
                toast(isConflict(e) && code ? t(`adminContracts.clients.deleteErrors.${code}`, { defaultValue: t("adminContracts.common.actionFailed") }) : t("adminContracts.common.actionFailed"), "error");
            }
            setTarget(null);
        } finally {
            setBusy(false);
        }
    };

    const filterOptions = (["active", "archived", "all"] as const).map((v) => ({ value: v, label: t(`adminContracts.clients.filter.${v}`) }));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                <div className="space-y-1">
                    <label htmlFor="clients-q" className="eyebrow">{t("adminContracts.clients.search")}</label>
                    <input id="clients-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="field h-11 py-0" placeholder={t("adminContracts.clients.searchPlaceholder")} />
                </div>
                <Select label={t("adminContracts.clients.filterLabel")} options={filterOptions} value={filter} onChange={(v: string) => setFilter((v || "active") as Filter)} searchable={false} />
                <Link to="/admin/contratos/nuevo" className="btn btn-primary"><Plus size={16} strokeWidth={2.5} aria-hidden /> {t("adminContracts.clients.new")}</Link>
            </div>

            {loading && <p className="text-sm text-muted" role="status">{t("adminContracts.common.loading")}</p>}
            {failed && <EmptyState title={t("adminContracts.common.loadFailed")} action={<button type="button" className="btn" onClick={() => void load()}>{t("adminContracts.common.retry")}</button>} />}
            {!loading && !failed && shown.length === 0 && (
                <EmptyState title={t("adminContracts.clients.empty")} action={<Link to="/admin/contratos/nuevo" className="btn">{t("adminContracts.clients.new")}</Link>}>
                    {t("adminContracts.clients.emptyBody")}
                </EmptyState>
            )}

            <ul className="grid gap-4 md:grid-cols-2">
                {shown.map((c) => (
                    <li key={c.id} className="min-w-0">
                        <article className="window h-full">
                            <div className="window-bar">
                                <span className="window-dot" aria-hidden="true" />
                                <span className="flex-1 truncate">{`cliente-${c.id}.dir`}</span>
                                {c.status === "archived" && <span className="tag !py-0">{t("adminContracts.clients.statusArchived")}</span>}
                            </div>
                            <div className="window-body flex h-full flex-col gap-3">
                                <div className="min-w-0">
                                    <h2 className="break-words text-xl leading-tight text-ink">{c.name}</h2>
                                    <p className="break-words text-sm text-muted">
                                        {[c.docNumber && `${c.docType} ${c.docNumber}`, c.contactName, c.email].filter(Boolean).join(" · ")}
                                    </p>
                                </div>
                                <ul className="flex flex-wrap gap-1.5">
                                    {DOC_STATUSES.filter((s) => c.docCounts?.[s]).map((s) => (
                                        <li key={s} className="tag">{t(`adminContracts.status.${s}`)}: {c.docCounts?.[s]}</li>
                                    ))}
                                </ul>
                                <div className="mt-auto flex flex-wrap gap-2">
                                    <Link to={`/admin/contratos/${c.id}`} className="btn !min-h-9 !px-3 !py-1 !text-sm btn-primary"><FolderOpen size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.clients.open")}</Link>
                                    <Link to={`/admin/contratos/${c.id}/editar`} className="btn !min-h-9 !px-3 !py-1 !text-sm"><Pencil size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.edit")}</Link>
                                    <button type="button" className="btn !min-h-9 !px-3 !py-1 !text-sm" onClick={() => void toggleArchive(c)}>
                                        {c.status === "active" ? <Archive size={14} strokeWidth={2.5} aria-hidden /> : <ArchiveRestore size={14} strokeWidth={2.5} aria-hidden />}
                                        {c.status === "active" ? t("adminContracts.clients.archive") : t("adminContracts.clients.restore")}
                                    </button>
                                    <button type="button" className="btn !min-h-9 !px-3 !py-1 !text-sm" onClick={() => setTarget(c)}>
                                        <Trash2 size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.delete")}
                                    </button>
                                </div>
                            </div>
                        </article>
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                open={target !== null}
                title={t("adminContracts.clients.deleteTitle", { name: target?.name ?? "" })}
                destructive
                busy={busy}
                confirmLabel={t("adminContracts.common.delete")}
                onConfirm={() => void remove()}
                onCancel={() => setTarget(null)}
            >
                {t("adminContracts.clients.deleteBody")}
            </ConfirmDialog>
        </div>
    );
}
