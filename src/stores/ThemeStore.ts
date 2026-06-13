import { makeAutoObservable } from "mobx";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/** Lee el tema inicial: localStorage > preferencia del SO > 'dark' (look original). */
function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export class ThemeStore {
    theme: Theme = getInitialTheme();

    constructor() {
        makeAutoObservable(this);
        this.apply();
    }

    /** Sincroniza la clase `.dark` en <html> y persiste la elección. */
    apply() {
        if (typeof document === "undefined") return;
        const root = document.documentElement;
        root.classList.toggle("dark", this.theme === "dark");
        root.style.colorScheme = this.theme;
        localStorage.setItem(STORAGE_KEY, this.theme);
    }

    get isDark() {
        return this.theme === "dark";
    }

    toggle() {
        this.theme = this.theme === "dark" ? "light" : "dark";
        this.apply();
    }

    set(theme: Theme) {
        this.theme = theme;
        this.apply();
    }
}
