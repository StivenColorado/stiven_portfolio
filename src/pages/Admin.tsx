import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError, adminApi } from "../lib/api";
import type { DeleteTarget, Stats, Visitor } from "../lib/api";
import { useDocumentMeta } from "../lib/seo";
import ConfirmDelete from "../components/admin/ConfirmDelete";
import type { PendingDelete } from "../components/admin/ConfirmDelete";
import Filters from "../components/admin/Filters";
import { FILTER_KEYS } from "../components/admin/filterState";
import type { FilterKey, FilterOptions, FilterValues } from "../components/admin/filterState";
import ChangePassword from "../components/admin/ChangePassword";
import LoginForm from "../components/admin/LoginForm";
import StatsCards from "../components/admin/StatsCards";
import { RANGES } from "../components/admin/ranges";
import VisitorDialog from "../components/admin/VisitorDialog";
import VisitsTable from "../components/admin/VisitsTable";

const PAGE = 50;

type Auth = "checking" | "out" | "in";

function Dashboard({ onLogout }: { onLogout: () => void }) {
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
                        setDetail(null);
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

    const toggle = (ip: string, on: boolean) => setSelected((prev) => {
        const next = new Set(prev);
        if (on) next.add(ip);
        else next.delete(ip);
        return next;
    });
    const toggleAll = (on: boolean) => setSelected(on ? new Set(visitors.map((v) => v.ip)) : new Set());

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
                    <h1 className="font-display text-3xl tracking-tight text-ink">Visitantes</h1>
                </div>
                <button type="button" onClick={logout} className="btn">Cerrar sesión</button>
            </header>
            <ChangePassword onUnauthorized={onLogout} />
            <StatsCards stats={stats} days={days} onDays={(d) => setParam("days", String(d))} />
            <section className="space-y-4">
                <Filters values={filters} known={known} onChange={(k: FilterKey, v) => setParam(k, v)} />
                {(chosen.length > 0 || activeFilters.length > 0) && (
                    <div className="window window-body !flex-row flex-wrap items-center gap-3 !p-3">
                        {chosen.length > 0 && (
                            <button type="button" className="btn btn-primary" onClick={() => void ask({ ips: chosen }, `Son todas las visitas de ${chosen.length === 1 ? "la IP seleccionada" : `las ${chosen.length} IP seleccionadas`}.`)}>
                                Borrar seleccionados ({chosen.length})
                            </button>
                        )}
                        {activeFilters.length > 0 && (
                            <button type="button" className="btn" onClick={deleteFiltered}>Borrar todo lo filtrado</button>
                        )}
                    </div>
                )}
                <VisitsTable visitors={visitors} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onOpen={setDetail} />
                {more && (
                    <button type="button" disabled={loading} onClick={() => load(visitors.length)} className="btn w-full disabled:opacity-50 md:w-auto">
                        {loading ? "Cargando…" : "Cargar más"}
                    </button>
                )}
            </section>
            <VisitorDialog
                visitor={detail}
                onClose={() => setDetail(null)}
                onDelete={(v) => void ask({ ip: v.ip }, `Son todas las visitas de la IP ${v.ip}.`, v.visits)}
                onUnauthorized={expired}
            />
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
