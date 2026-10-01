import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Archive, ArrowDown, ArrowUp, ArchiveRestore, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import Select from "../../ui/Select";
import type { Status } from "../../../types/content";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import StatusBadge from "./StatusBadge";

export interface EntityItem { id: number; status: Status }

interface Props<T extends EntityItem> {
    items: T[];
    loading?: boolean;
    error?: string;
    noun: string;
    nounPlural: string;
    newTo: string;
    editTo: (item: T) => string;
    getTitle: (item: T) => string;
    getSubtitle?: (item: T) => string | undefined;
    renderExtra?: (item: T) => ReactNode;
    extraActions?: (item: T) => ReactNode;
    onSetStatus: (item: T, status: Status) => void | Promise<void>;
    onDelete: (item: T) => void | Promise<void>;
    onReorder?: (ids: number[]) => void | Promise<void>;
    busyId?: number | null;
    onRetry?: () => void;
}

const FILTER_VALUES = ["all", "published", "hidden", "archived"];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const act = "btn !min-h-9 !gap-1.5 !px-3 !py-1 !text-sm disabled:opacity-40";

export default function EntityList<T extends EntityItem>({
    items, loading, error, noun, nounPlural, newTo, editTo, getTitle, getSubtitle, renderExtra, extraActions,
    onSetStatus, onDelete, onReorder, busyId = null, onRetry,
}: Props<T>) {
    const { t } = useTranslation();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [toDelete, setToDelete] = useState<T | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filters = FILTER_VALUES.map((value) => ({ value, label: t(`admin.entity.filters.${value}`) }));
    const unfiltered = !q.trim() && status === "all";
    const visible = useMemo(() => {
        const needle = fold(q.trim());
        return items.filter((it) =>
            (status === "all" || it.status === status) &&
            (!needle || fold(`${getTitle(it)} ${getSubtitle?.(it) ?? ""}`).includes(needle)));
    }, [items, q, status, getTitle, getSubtitle]);

    const move = (index: number, d: -1 | 1) => {
        const ids = items.map((i) => i.id);
        [ids[index], ids[index + d]] = [ids[index + d], ids[index]];
        void onReorder?.(ids);
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try { await onDelete(toDelete); } finally { setDeleting(false); setToDelete(null); }
    };

    return (
        <section className="space-y-4" aria-label={nounPlural}>
            <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 basis-48 space-y-1">
                    <span className="eyebrow">{t("admin.entity.search")}</span>
                    <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.entity.searchPlaceholder", { plural: nounPlural })} className="field !py-2" />
                </label>
                <Select label={t("admin.entity.state")} options={filters} value={status} onChange={(v: string) => setStatus(v || "all")} searchable={false} className="w-44" />
                <Link to={newTo} className="btn btn-primary"><Plus size={16} strokeWidth={2.5} aria-hidden /> {t("admin.entity.new", { noun })}</Link>
            </div>

            {error ? (
                <EmptyState title={t("admin.entity.loadFailed")} action={onRetry && <button type="button" className="btn" onClick={onRetry}>{t("admin.common.retry")}</button>}>{error}</EmptyState>
            ) : loading && items.length === 0 ? (
                <p className="text-sm text-muted" role="status">{t("admin.common.loading")}</p>
            ) : visible.length === 0 ? (
                <EmptyState title={items.length === 0 ? t("admin.entity.none", { plural: nounPlural }) : t("admin.entity.noResults")}>
                    {items.length === 0 ? t("admin.entity.createFirst", { noun }) : t("admin.entity.tryOther")}
                </EmptyState>
            ) : (
                <>
                    {onReorder && !unfiltered && <p className="text-xs text-muted">{t("admin.entity.clearToReorder")}</p>}
                    <ul className="space-y-3">
                        {visible.map((it) => {
                            const index = items.indexOf(it);
                            const busy = busyId === it.id;
                            const sub = getSubtitle?.(it);
                            return (
                                <li key={it.id} className={`window window-body !shadow-none ${it.status === "published" ? "" : "dither"}`}>
                                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                                        <div className="min-w-0 flex-1 basis-56 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="break-words text-lg leading-tight">{getTitle(it)}</h3>
                                                <StatusBadge status={it.status} />
                                                {renderExtra?.(it)}
                                            </div>
                                            {sub && <p className="break-words text-sm text-muted">{sub}</p>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {extraActions?.(it)}
                                            <Link to={editTo(it)} className={act}><Pencil size={14} strokeWidth={2.5} aria-hidden /> {t("admin.entity.edit")}</Link>
                                            {it.status === "published" ? (
                                                <button type="button" className={act} disabled={busy} onClick={() => void onSetStatus(it, "hidden")}><EyeOff size={14} strokeWidth={2.5} aria-hidden /> {t("admin.entity.hide")}</button>
                                            ) : it.status === "hidden" ? (
                                                <button type="button" className={act} disabled={busy} onClick={() => void onSetStatus(it, "published")}><Eye size={14} strokeWidth={2.5} aria-hidden /> {t("admin.entity.publish")}</button>
                                            ) : null}
                                            {it.status === "archived" ? (
                                                <>
                                                    <button type="button" className={act} disabled={busy} onClick={() => void onSetStatus(it, "hidden")}><ArchiveRestore size={14} strokeWidth={2.5} aria-hidden /> {t("admin.entity.restore")}</button>
                                                    <button type="button" className={`${act} !border-dashed`} disabled={busy} onClick={() => setToDelete(it)}><Trash2 size={14} strokeWidth={2.5} aria-hidden /> {t("admin.entity.delete")}</button>
                                                </>
                                            ) : (
                                                <button type="button" className={act} disabled={busy} onClick={() => void onSetStatus(it, "archived")}><Archive size={14} strokeWidth={2.5} aria-hidden /> {t("admin.entity.archive")}</button>
                                            )}
                                            {onReorder && unfiltered && (
                                                <span className="flex gap-1">
                                                    <button type="button" className={`${act} !px-2`} disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={t("admin.entity.moveUp", { title: getTitle(it) })}><ArrowUp size={16} strokeWidth={2.5} aria-hidden /></button>
                                                    <button type="button" className={`${act} !px-2`} disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} aria-label={t("admin.entity.moveDown", { title: getTitle(it) })}><ArrowDown size={16} strokeWidth={2.5} aria-hidden /></button>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            <ConfirmDialog
                open={!!toDelete}
                title={t("admin.entity.deleteTitle", { noun })}
                destructive
                busy={deleting}
                busyLabel={t("admin.entity.deleting")}
                confirmLabel={t("admin.entity.delete")}
                onConfirm={() => void confirmDelete()}
                onCancel={() => !deleting && setToDelete(null)}
            >
                {t("admin.entity.deleteBody", { title: toDelete ? getTitle(toDelete) : "" })}
            </ConfirmDialog>
        </section>
    );
}
