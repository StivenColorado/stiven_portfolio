import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Briefcase, History, LogOut, Menu, Sparkles, UserCog, Wrench, X } from "lucide-react";
import type { ComponentType } from "react";
import { adminApi } from "../lib/api";
import { onUnauthorized } from "../lib/adminApi";
import { useDocumentMeta } from "../lib/seo";
import LoginForm from "../components/admin/LoginForm";
import { AdminContext } from "../components/admin/adminContext";
import ToastProvider from "../components/admin/ui/Toast";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAdminLocales } from "../i18n/useAdminLocales";

type Auth = "checking" | "out" | "in";

const ITEMS: { to: string; labelKey: string; icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }> }[] = [
    { to: "/admin/auditoria", labelKey: "admin.shell.nav.audit", icon: History },
    { to: "/admin/proyectos", labelKey: "admin.shell.nav.projects", icon: Sparkles },
    { to: "/admin/servicios", labelKey: "admin.shell.nav.services", icon: Wrench },
    { to: "/admin/experiencia", labelKey: "admin.shell.nav.experience", icon: Briefcase },
    { to: "/admin/cuenta", labelKey: "admin.shell.nav.account", icon: UserCog },
];

const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 border-b-2 border-ink px-4 py-3 font-extrabold no-underline last:border-b-0 ${isActive ? "bg-ink text-paper" : "text-ink hover:bg-grey"}`;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
    const { t } = useTranslation();
    return (
        <>
            {ITEMS.map(({ to, labelKey, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={onNavigate} className={itemClass}>
                    <Icon size={18} strokeWidth={2.5} aria-hidden />
                    {t(labelKey)}
                </NavLink>
            ))}
        </>
    );
}

function Shell({ email, onLogout }: { email: string; onLogout: () => void }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const wasOpen = useRef(false);

    useEffect(() => setOpen(false), [pathname]);

    useEffect(() => {
        if (open) {
            panelRef.current?.querySelector<HTMLElement>("a")?.focus();
            wasOpen.current = true;
        } else if (wasOpen.current) {
            buttonRef.current?.focus();
            wasOpen.current = false;
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    const sq = "flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper lg:hidden";

    return (
        <div className="window">
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">admin.app</span>
            </div>
            <div className="flex items-center gap-3 border-b-2 border-ink bg-grey px-3 py-2">
                <button
                    ref={buttonRef}
                    type="button"
                    className={sq}
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls="admin-menu"
                    aria-label={open ? t("admin.shell.closeMenu") : t("admin.shell.openMenu")}
                >
                    <Menu size={16} strokeWidth={2.5} aria-hidden />
                </button>
                <p className="min-w-0 flex-1 truncate text-sm" title={email}>{email}</p>
                <LanguageSwitcher />
                <button type="button" className="btn !min-h-8 !px-3 !py-1 !text-sm" onClick={onLogout}>
                    <LogOut size={14} strokeWidth={2.5} aria-hidden /> {t("admin.shell.logout")}
                </button>
            </div>

            <div className="lg:grid lg:grid-cols-[14rem_1fr]">
                <nav aria-label={t("admin.shell.sections")} className="hidden border-r-2 border-ink lg:block">
                    <NavItems />
                </nav>
                <div className="min-w-0 p-4 md:p-6">
                    <Suspense fallback={<p className="text-sm text-muted">{t("admin.common.loading")}</p>}>
                        <Outlet />
                    </Suspense>
                </div>
            </div>

            <div
                aria-hidden="true"
                onClick={() => setOpen(false)}
                className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-250 motion-reduce:transition-none lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
            />
            <nav
                ref={panelRef}
                id="admin-menu"
                role="dialog"
                aria-modal="true"
                aria-label={t("admin.shell.menu")}
                data-open={open}
                className="drawer-panel window lg:hidden"
            >
                <div className="window-bar">
                    <span className="window-dot" aria-hidden="true" />
                    <span className="flex-1 truncate text-center">admin.menu</span>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label={t("admin.shell.closeMenu")}
                        tabIndex={open ? 0 : -1}
                        className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-paper hover:bg-ink hover:text-paper"
                    >
                        <X size={12} strokeWidth={3} aria-hidden />
                    </button>
                </div>
                <div className="flex flex-col">
                    <NavItems onNavigate={() => setOpen(false)} />
                </div>
            </nav>
        </div>
    );
}

const AdminContent = () => {
    const { t } = useTranslation();
    useDocumentMeta({ title: t("admin.meta.admin"), noindex: true });
    const [auth, setAuth] = useState<Auth>("checking");
    const [email, setEmail] = useState("");

    const check = useCallback(() => {
        adminApi.me().then((me) => { setEmail(me.email); setAuth("in"); }).catch(() => setAuth("out"));
    }, []);

    useEffect(() => { check(); }, [check]);
    useEffect(() => onUnauthorized(() => setAuth("out")), []);

    const expire = useCallback(() => setAuth("out"), []);
    const logout = useCallback(async () => {
        try { await adminApi.logout(); } catch { /* sesión ya caducada */ }
        setAuth("out");
    }, []);
    const session = useMemo(() => ({ email, logout, expire }), [email, logout, expire]);

    return (
        <div className="mx-auto w-full max-w-6xl bg-paper px-4 pb-16 pt-10 text-ink">
            {auth === "checking" && <p className="text-sm text-muted">{t("admin.common.loading")}</p>}
            {auth === "out" && <LoginForm onSuccess={check} />}
            {auth === "in" && (
                <AdminContext.Provider value={session}>
                    <ToastProvider>
                        <Shell email={email} onLogout={() => void logout()} />
                    </ToastProvider>
                </AdminContext.Provider>
            )}
        </div>
    );
};

const Admin = () => (useAdminLocales() ? <AdminContent /> : null);

export default Admin;
