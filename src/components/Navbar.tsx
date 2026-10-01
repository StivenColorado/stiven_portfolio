import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router";
import { observer } from "mobx-react";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../context/store";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV = [
    { to: "/", key: "home" },
    { to: "/projects", key: "projects" },
    { to: "/about", key: "about" },
    { to: "/#contacto", key: "contact" },
];

const squareBtn =
    "flex h-6 w-6 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper";

const ThemeToggle: React.FC = observer(() => {
    const { themeStore } = useStore();
    const { t } = useTranslation();
    const isDark = themeStore.isDark;
    return (
        <button
            type="button"
            onClick={() => themeStore.toggle()}
            aria-label={isDark ? t("nav.toLight") : t("nav.toDark")}
            className={squareBtn}
        >
            {isDark ? <Moon size={14} strokeWidth={2.5} aria-hidden /> : <Sun size={14} strokeWidth={2.5} aria-hidden />}
        </button>
    );
});

const Navbar: React.FC = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const { pathname } = useLocation();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const wasOpen = useRef(false);

    useEffect(() => setIsOpen(false), [pathname]);

    useEffect(() => {
        if (isOpen) {
            panelRef.current?.querySelector<HTMLElement>("a")?.focus();
            wasOpen.current = true;
        } else if (wasOpen.current) {
            buttonRef.current?.focus();
            wasOpen.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    const drawerLink = ({ isActive }: { isActive: boolean }) =>
        `quicklink !text-lg !font-extrabold lg:!border-r-0 lg:!border-b-[length:var(--line)] lg:last:!border-b-0 ${isActive ? "!bg-ink !text-paper" : ""}`;

    return (
        <header className="sticky top-0 z-50">
            <div className="menubar">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setIsOpen((v) => !v)}
                    aria-expanded={isOpen}
                    aria-controls="menu-lateral"
                    aria-label={isOpen ? t("nav.closeMenu") : t("nav.openMenu")}
                    className={squareBtn}
                >
                    <span aria-hidden="true" className="text-base leading-none">{isOpen ? "×" : "☰"}</span>
                </button>
                <Link to="/" aria-label={t("nav.homeAria")} className="flex items-center gap-2">
                    <span className="menubar-logo" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="1" y="1" width="10" height="10" />
                            <path d="M4 5v1M8 5v1M4 8.5h4" />
                        </svg>
                    </span>
                    <span>Stiven</span>
                </Link>

                <div className="ml-auto flex items-center gap-2">
                    <LanguageSwitcher />
                    <ThemeToggle />
                </div>
            </div>

            <div
                aria-hidden="true"
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-250 motion-reduce:transition-none ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
            />

            <nav
                ref={panelRef}
                id="menu-lateral"
                role="dialog"
                aria-modal="true"
                aria-label={t("nav.mainMenu")}
                data-open={isOpen}
                className="drawer-panel window"
            >
                <div className="window-bar">
                    <span className="window-dot" aria-hidden="true" />
                    <span className="window-dot" aria-hidden="true" />
                    <span className="flex-1 truncate text-center">{t("nav.menuTitle")}</span>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        aria-label={t("nav.closeMenu")}
                        tabIndex={isOpen ? 0 : -1}
                        className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-paper text-sm leading-none hover:bg-ink hover:text-paper"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div className="flex flex-col">
                    {NAV.map(({ to, key }) =>
                        to.includes("#") ? (
                            <Link key={to} to={to} onClick={() => setIsOpen(false)} className={drawerLink({ isActive: false })}>
                                {t(`nav.${key}`)}
                            </Link>
                        ) : (
                            <NavLink key={to} to={to} end={to === "/"} onClick={() => setIsOpen(false)} className={drawerLink}>
                                {t(`nav.${key}`)}
                            </NavLink>
                        ),
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
