import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Globe, Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import ConfirmDialog from "../../../components/admin/ui/ConfirmDialog";
import EmptyState from "../../../components/admin/ui/EmptyState";
import { useToast } from "../../../components/admin/ui/toastContext";
import { fmtShort } from "../../../components/admin/format";
import Select from "../../../components/ui/Select";
import { isUnauthorized } from "../../../lib/adminApi";
import { prospectsApi } from "../../../lib/prospectsApi";
import { PROSPECT_STATUSES } from "../../../types/prospects";
import type { Prospect, ProspectStatus } from "../../../types/prospects";
import ProspectStatusBadge from "./ProspectStatusBadge";

type Filter = ProspectStatus | "all";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

export default function ProspectsList() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [items, setItems] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [target, setTarget] = useState<Prospect | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            setItems(await prospectsApi.list());
        } catch (e) {
            if (!isUnauthorized(e)) setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const counts = useMemo(() => {
        const c: Partial<Record<Filter, number>> = { all: items.length };
        for (const p of items) c[p.status] = (c[p.status] ?? 0) + 1;
        return c;
    }, [items]);

    const shown = useMemo(() => {
        const needle = norm(q.trim());
        return items.filter((p) =>
            (filter === "all" || p.status === filter) &&
            (!needle || norm([p.business, p.owner, p.source, ...p.phones, ...p.emails, ...p.websites].join(" ")).includes(needle)));
    }, [items, q, filter]);

    const move = async (p: Prospect, status: ProspectStatus) => {
        if (status === p.status) return;
        try {
            const next = await prospectsApi.setStatus(p.id, status);
            setItems((prev) => prev.map((x) => (x.id === p.id ? next : x)));
        } catch (e) {
            if (!isUnauthorized(e)) toast(t("adminProspects.actionFailed"), "error");
        }
    };

    const remove = async () => {
        if (!target) return;
        setBusy(true);
        try {
            await prospectsApi.remove(target.id);
            setItems((prev) => prev.filter((x) => x.id !== target.id));
            toast(t("adminProspects.deleted"));
        } catch (e) {
            if (!isUnauthorized(e)) toast(t("adminProspects.actionFailed"), "error");
        } finally {
            setBusy(false);
            setTarget(null);
        }
    };

    const statusOptions = PROSPECT_STATUSES.map((v) => ({ value: v, label: t(`adminProspects.status.${v}`) }));
    const filters: Filter[] = ["all", ...PROSPECT_STATUSES];

    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                    <p className="eyebrow">{t("adminProspects.eyebrow")}</p>
                    <h1 className="font-display text-3xl tracking-tight text-ink">{t("adminProspects.title")}</h1>
                </div>
                <Link to="/admin/prospectos/nuevo" className="btn btn-primary"><Plus size={16} strokeWidth={2.5} aria-hidden /> {t("adminProspects.new")}</Link>
            </header>

            <div className="space-y-1">
                <label htmlFor="prospects-q" className="eyebrow">{t("adminProspects.search")}</label>
                <input id="prospects-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="field h-11 py-0" placeholder={t("adminProspects.searchPlaceholder")} />
            </div>

            <div role="group" aria-label={t("adminProspects.filterLabel")} className="flex flex-wrap gap-2">
                {filters.map((f) => (
                    <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`btn !min-h-9 !px-3 !py-1 !text-sm ${filter === f ? "btn-primary" : ""}`}>
                        {t(f === "all" ? "adminProspects.filterAll" : `adminProspects.status.${f}`)} · {counts[f] ?? 0}
                    </button>
                ))}
            </div>

            {loading && <p className="text-sm text-muted" role="status">{t("adminProspects.loading")}</p>}
            {failed && <EmptyState title={t("adminProspects.loadFailed")} action={<button type="button" className="btn" onClick={() => void load()}>{t("adminProspects.retry")}</button>} />}
            {!loading && !failed && shown.length === 0 && (
                <EmptyState title={t("adminProspects.empty")} action={<Link to="/admin/prospectos/nuevo" className="btn">{t("adminProspects.new")}</Link>}>
                    {t("adminProspects.emptyBody")}
                </EmptyState>
            )}

            <ul className="grid gap-4 md:grid-cols-2">
                {shown.map((p) => (
                    <li key={p.id} className="min-w-0">
                        <article className="window h-full">
                            <div className="window-bar">
                                <span className="window-dot" aria-hidden="true" />
                                <span className="flex-1 truncate">{`prospecto-${p.id}.dir`}</span>
                            </div>
                            <div className="window-body flex h-full flex-col gap-3">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="break-words text-xl leading-tight text-ink">{p.business}</h2>
                                        <ProspectStatusBadge status={p.status} />
                                    </div>
                                    {p.owner && <p className="flex items-center gap-1.5 text-sm text-muted"><User size={14} strokeWidth={2.5} aria-hidden /> {p.owner}</p>}
                                </div>
                                <ul className="min-w-0 space-y-1 text-sm">
                                    {p.phones.map((v) => <li key={v} className="flex items-center gap-1.5 break-all"><Phone size={14} strokeWidth={2.5} aria-hidden className="shrink-0" /><a href={`tel:${v.replace(/[^+\d]/g, "")}`} className="underline underline-offset-4">{v}</a></li>)}
                                    {p.emails.map((v) => <li key={v} className="flex items-center gap-1.5 break-all"><Mail size={14} strokeWidth={2.5} aria-hidden className="shrink-0" /><a href={`mailto:${v}`} className="underline underline-offset-4">{v}</a></li>)}
                                    {p.websites.map((v) => <li key={v} className="flex items-center gap-1.5 break-all"><Globe size={14} strokeWidth={2.5} aria-hidden className="shrink-0" /><a href={v} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{host(v)}</a></li>)}
                                </ul>
                                <p className="text-xs text-muted">
                                    {p.lastContactAt ? t("adminProspects.lastContact", { date: fmtShort.format(p.lastContactAt) }) : t("adminProspects.neverContacted")}
                                    {" · "}{t("adminProspects.notesCount", { count: p.noteCount })}
                                </p>
                                <div className="mt-auto flex flex-wrap items-end gap-2">
                                    <div className="w-40">
                                        <Select label={t("adminProspects.changeStatus")} options={statusOptions} value={p.status} onChange={(v: string) => void move(p, (v || p.status) as ProspectStatus)} searchable={false} />
                                    </div>
                                    <Link to={`/admin/prospectos/${p.id}`} className="btn !min-h-10 !px-3 !py-1 !text-sm btn-primary"><Pencil size={14} strokeWidth={2.5} aria-hidden /> {t("adminProspects.open")}</Link>
                                    <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-sm" onClick={() => setTarget(p)}>
                                        <Trash2 size={14} strokeWidth={2.5} aria-hidden /> {t("adminProspects.delete")}
                                    </button>
                                </div>
                            </div>
                        </article>
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                open={target !== null}
                title={t("adminProspects.deleteTitle", { name: target?.business ?? "" })}
                destructive
                busy={busy}
                confirmLabel={t("adminProspects.delete")}
                onConfirm={() => void remove()}
                onCancel={() => setTarget(null)}
            >
                {t("adminProspects.deleteBody")}
            </ConfirmDialog>
        </div>
    );
}
