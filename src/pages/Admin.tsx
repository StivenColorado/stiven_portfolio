import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError, adminApi } from "../lib/api";
import type { DeleteTarget, Stats, Visit } from "../lib/api";
import { useDocumentMeta } from "../lib/seo";
import ConfirmDelete from "../components/admin/ConfirmDelete";
import type { PendingDelete } from "../components/admin/ConfirmDelete";
import Filters from "../components/admin/Filters";
import { FILTER_KEYS, matches } from "../components/admin/filterState";
import type { FilterKey, FilterValues } from "../components/admin/filterState";
import ChangePassword from "../components/admin/ChangePassword";
import LoginForm from "../components/admin/LoginForm";
import StatsCards from "../components/admin/StatsCards";
import { RANGES } from "../components/admin/ranges";
import VisitsTable from "../components/admin/VisitsTable";

const PAGE = 50;

type Auth = "checking" | "out" | "in";

function Dashboard({ onLogout }: { onLogout: () => void }) {
    const [params, setParams] = useSearchParams();
    const [stats, setStats] = useState<Stats | null>(null);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [more, setMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [statsKey, setStatsKey] = useState(0);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [pending, setPending] = useState<PendingDelete | null>(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");

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

    const load = useCallback(async (before?: number) => {
        setLoading(true);
        try {
            const { visits: page } = await adminApi.visits(PAGE, before);
            setVisits((prev) => (before === undefined ? page : [...prev, ...page]));
            setMore(page.length === PAGE);
        } catch (err) {
            expired(err);
        } finally {
            setLoading(false);
        }
    }, [expired]);

    useEffect(() => { void load(); }, [load]);

    const shown = useMemo(() => visits.filter((v) => matches(v, filters)), [visits, filters]);
    const activeFilters = FILTER_KEYS.filter((k) => filters[k]);
    const chosen = useMemo(() => shown.filter((v) => selected.has(v.id)).map((v) => v.id), [shown, selected]);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(""), 4000);
        return () => clearTimeout(t);
    }, [notice]);

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
                        setNotice(deleted === 1 ? "1 visita borrada" : `${deleted} visitas borradas`);
                        setStatsKey((n) => n + 1);
                        await load();
                    } catch (err) {
                        setPending(null);
                        expired(err);
                        setNotice(err instanceof ApiError && err.status === 429 ? "Demasiados intentos, espera un momento" : "No se pudo borrar");
                    } finally {
                        setBusy(false);
                    }
                },
            });
        } catch (err) {
            expired(err);
            setNotice("No se pudo borrar");
        }
    }, [expired, load]);

    const toggle = (id: number, on: boolean) => setSelected((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
    });
    const toggleAll = (on: boolean) => setSelected(on ? new Set(shown.map((v) => v.id)) : new Set());

    const deleteFiltered = () => {
        const filter = Object.fromEntries(activeFilters.map((k) => [k, filters[k]]));
        void ask({ filter }, `Coinciden con los filtros activos (${activeFilters.map((k) => `${k}: ${filters[k]}`).join(", ")}).`);
    };

    async function logout() {
        try { await adminApi.logout(); } catch { /* sesión ya caducada */ }
        onLogout();
    }

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between gap-3">
                <div>
                    <p className="eyebrow">Admin</p>
                    <h1 className="font-display text-3xl tracking-tight text-ink">Visitas</h1>
                </div>
                <button type="button" onClick={logout} className="btn">Cerrar sesión</button>
            </header>
            <ChangePassword onUnauthorized={onLogout} />
            <StatsCards stats={stats} days={days} onDays={(d) => setParam("days", String(d))} />
            <section className="space-y-4">
                <Filters values={filters} visits={visits} onChange={(k: FilterKey, v) => setParam(k, v)} />
                {(chosen.length > 0 || activeFilters.length > 0) && (
                    <div className="window window-body !flex-row flex-wrap items-center gap-3 !p-3">
                        {chosen.length > 0 && (
                            <button type="button" className="btn btn-primary" onClick={() => void ask({ ids: chosen }, "Son las visitas seleccionadas.", chosen.length)}>
                                Borrar seleccionadas ({chosen.length})
                            </button>
                        )}
                        {activeFilters.length > 0 && (
                            <button type="button" className="btn" onClick={deleteFiltered}>Borrar todo lo filtrado</button>
                        )}
                    </div>
                )}
                <VisitsTable
                    visits={shown}
                    selected={selected}
                    onToggle={toggle}
                    onToggleAll={toggleAll}
                    onDeleteOne={(v) => void ask({ ids: [v.id] }, "Es la visita elegida.", 1)}
                    onDeleteIp={(v) => void ask({ ip: v.ip }, `Son todas las visitas de la IP ${v.ip}.`)}
                />
                {more && (
                    <button type="button" disabled={loading} onClick={() => load(visits[visits.length - 1]?.ts)} className="btn w-full disabled:opacity-50 md:w-auto">
                        {loading ? "Cargando…" : "Cargar más"}
                    </button>
                )}
            </section>
            <ConfirmDelete pending={pending} busy={busy} onCancel={() => !busy && setPending(null)} />
            <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
                {notice && <p className="window window-body !px-4 !py-2 text-sm font-bold">{notice}</p>}
            </div>
        </div>
    );
}

const Admin = () => {
    useDocumentMeta({ title: "Admin", noindex: true });
    const [auth, setAuth] = useState<Auth>("checking");

    useEffect(() => {
        adminApi.me().then(() => setAuth("in")).catch(() => setAuth("out"));
    }, []);

    return (
        <div className="mx-auto w-full max-w-6xl bg-paper px-4 pb-16 pt-24 text-ink">
            {auth === "checking" && <p className="text-sm text-muted">Cargando…</p>}
            {auth === "out" && <LoginForm onSuccess={() => setAuth("in")} />}
            {auth === "in" && <Dashboard onLogout={() => setAuth("out")} />}
        </div>
    );
};

export default Admin;
