import i18next from "i18next";
import { initReactI18next } from "react-i18next";
const files = import.meta.glob<Record<string, unknown>>(["./locales/*/*.json", "!./locales/*/admin*.json"], { eager: true, import: "default" });
const adminFiles = import.meta.glob<Record<string, unknown>>("./locales/*/admin*.json", { import: "default" });
const bundle = (lng: string) =>
    Object.assign({}, ...Object.entries(files).filter(([path]) => path.includes(`/${lng}/`)).map(([, json]) => json));

let adminLoading: Promise<void> | null = null;

/** Los textos del admin viajan en chunks aparte: el visitante público nunca los descarga. */
export function loadAdminLocales(): Promise<void> {
    adminLoading ??= Promise.all(
        Object.entries(adminFiles).map(async ([path, load]) => {
            const lng = path.split("/")[2];
            i18next.addResourceBundle(lng, "translation", await load(), true, true);
        }),
    ).then(() => undefined);
    return adminLoading;
}

export const SUPPORTED = ["es", "en"] as const;
export type Lang = (typeof SUPPORTED)[number];

const isLang = (v: unknown): v is Lang => SUPPORTED.includes(v as Lang);

function detectLanguage(): Lang {
    try {
        const saved = localStorage.getItem("lang");
        if (isLang(saved)) return saved;
    } catch {
        /* almacenamiento no disponible */
    }
    return navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
}

i18next.use(initReactI18next).init({
    resources: { es: { translation: bundle("es") }, en: { translation: bundle("en") } },
    lng: detectLanguage(),
    fallbackLng: "es",
    supportedLngs: SUPPORTED as unknown as string[],
    interpolation: { escapeValue: false },
    returnNull: false,
});

i18next.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
    try {
        localStorage.setItem("lang", lng);
    } catch {
        /* almacenamiento no disponible */
    }
});
document.documentElement.lang = i18next.resolvedLanguage ?? "es";

export const setLanguage = (lng: Lang) => i18next.changeLanguage(lng);

export default i18next;
