import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ApiError, adminApi } from "../../../lib/api";
import type { DeleteTarget, Stats, Visitor } from "../../../lib/api";
import ConfirmDelete from "../../../components/admin/ConfirmDelete";
import type { PendingDelete } from "../../../components/admin/ConfirmDelete";
import Filters from "../../../components/admin/Filters";
import { FILTER_KEYS } from "../../../components/admin/filterState";
import type { FilterKey, FilterOptions, FilterValues } from "../../../components/admin/filterState";
import StatsCards from "../../../components/admin/StatsCards";
import { RANGES } from "../../../components/admin/ranges";
import VisitorDialog from "../../../components/admin/VisitorDialog";
import VisitsTable from "../../../components/admin/VisitsTable";
import { useAdmin } from "../../../components/admin/adminContext";
import { useToast } from "../../../components/admin/ui/toastContext";

const PAGE = 50;

export default function VisitorsTab() {
    const { t } = useTranslation();
    const { expire: onLogout } = useAdmin();
    const { toast } = useToast();
    const [params, setParams] = useSearchParams();
    const [stats, setStats] = useState<Stats | null>(null);
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [known, setKnown] = useState<FilterOptions>({ os: [], device: [], country: [], path: [] });
    const [detail, setDetail] = useState<Visitor | null>(null);
    const [more, setMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [statsKey, setStatsKey] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pending, setPending] = useState<PendingDelete | null>(null);
    const [busy, setBusy] = useState(false);

    const requested = Number(params.get("days"));
    const days = RANGES.some((r) => r.days === requested) ? requested : 7;
    const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""])) as FilterValues;

    const setParam = useCallback((key: string, value: string) => {
        setParams((prev) => {
            const next = new URLSearchParams(prev);
            if (value) next.set(key, value);
            else next.delete(key);
            return next;
        }, { replace: true });
    }, [setParams]);

    const expired = useCallback((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) onLogout();
    }, [onLogout]);

    useEffect(() => {
        let live = true;
        setStats(null);
        adminApi.stats(days).then((s) => live && setStats(s)).catch(expired);
        return () => { live = false; };
    }, [days, expired, statsKey]);

    const filterKey = FILTER_KEYS.map((k) => params.get(k) ?? "").join("\u0000");
    const latest = useRef(0);

    const load = useCallback(async (offset = 0) => {
        const ticket = ++latest.current;
        const active = Object.fromEntries(FILTER_KEYS.map((k, i) => [k, filterKey.split("\u0000")[i]]));
        setLoading(true);
        try {
            const { visitors: page } = await adminApi.visitors(active, PAGE, offset);
            if (ticket !== latest.current) return;
            setVisitors((prev) => (offset === 0 ? page : [...prev, ...page]));
            setMore(page.length === PAGE);
            setKnown((prev) => {
                const add = (k: FilterKey, xs: string[]) => [...new Set([...prev[k], ...xs])];
                return {
                    os: add("os", page.flatMap((v) => v.oses)),
                    device: add("device", page.flatMap((v) => v.devices)),
                    country: add("country", page.flatMap((v) => (v.country ? [v.country] : []))),
                    path: add("path", page.flatMap((v) => v.paths.map((p) => p.key))),
                };
            });
        } catch (err) {
            expired(err);
        } finally {
            if (ticket === latest.current) setLoading(false);
        }
    }, [expired, filterKey]);

    useEffect(() => { void load(); }, [load]);

    const activeFilters = FILTER_KEYS.filter((k) => filters[k]);
    const chosen = useMemo(() => visitors.filter((v) => selected.has(v.ip)).map((v) => v.ip), [visitors, selected]);

    const ask = useCallback(async (target: DeleteTarget, scope: string, known?: number) => {
        try {
            const count = known ?? (await adminApi.countVisits(target)).matched;
            setPending({
                count,
                scope,
                run: async () => {
                    setBusy(true);
                    try {
                        const { deleted } = await adminApi.deleteVisits(target);
                        setPending(null);
                        setSelected(new Set());
                        setDetail(null);
                        toast(t("admin.visitors.deletedToast", { count: deleted }));
                        setStatsKey((n) => n + 1);
                        await load();
                    } catch (err) {
                        setPending(null);
                        expired(err);
                        toast(err instanceof ApiError && err.status === 429 ? t("admin.visitors.tooMany") : t("admin.visitors.deleteFailed"), "error");
                    } finally {
                        setBusy(false);
                    }
                },
            });
        } catch (err) {
            expired(err);
            toast(t("admin.visitors.deleteFailed"), "error");
        }
    }, [expired, load, toast, t]);

    const toggle = (ip: string, on: boolean) => setSelected((prev) => {
        const next = new Set(prev);
        if (on) next.add(ip);
        else next.delete(ip);
        return next;
    });
    const toggleAll = (on: boolean) => setSelected(on ? new Set(visitors.map((v) => v.ip)) : new Set());

    const deleteFiltered = () => {
        const filter = Object.fromEntries(activeFilters.map((k) => [k, filters[k]]));
        void ask({ filter }, t("admin.visitors.scopeFilters", { filters: activeFilters.map((k) => `${t(`admin.filters.${k}`)}: ${filters[k]}`).join(", ") }));
    };

    return (
        <div className="space-y-8" role="tabpanel" id="panel-visitantes" aria-labelledby="tab-visitantes">
            <StatsCards stats={stats} days={days} onDays={(d) => setParam("days", String(d))} />
            <section className="space-y-4">
                <Filters values={filters} known={known} onChange={(k: FilterKey, v) => setParam(k, v)} />
                {(chosen.length > 0 || activeFilters.length > 0) && (
                    <div className="window window-body !flex-row flex-wrap items-center gap-3 !p-3">
                        {chosen.length > 0 && (
                            <button type="button" className="btn btn-primary" onClick={() => void ask({ ips: chosen }, t("admin.visitors.scopeSelectedIp", { count: chosen.length }))}>
                                {t("admin.visitors.deleteSelected", { count: chosen.length })}
                            </button>
                        )}
                        {activeFilters.length > 0 && (
                            <button type="button" className="btn" onClick={deleteFiltered}>{t("admin.visitors.deleteFiltered")}</button>
                        )}
                    </div>
                )}
                <VisitsTable visitors={visitors} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onOpen={setDetail} />
                {more && (
                    <button type="button" disabled={loading} onClick={() => load(visitors.length)} className="btn w-full disabled:opacity-50 md:w-auto">
                        {loading ? t("admin.common.loading") : t("admin.common.loadMore")}
                    </button>
                )}
            </section>
            <VisitorDialog
                visitor={detail}
                onClose={() => setDetail(null)}
                onDelete={(v) => void ask({ ip: v.ip }, t("admin.visitors.scopeIp", { ip: v.ip }), v.visits)}
                onUnauthorized={expired}
            />
            <ConfirmDelete pending={pending} busy={busy} onCancel={() => !busy && setPending(null)} />
        </div>
    );
}

