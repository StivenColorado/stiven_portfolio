import { useTranslation } from "react-i18next";
import { FILTER_KEYS } from "./filterState";
import type { FilterKey, FilterOptions, FilterValues } from "./filterState";
import Select from "../ui/Select";
import { countryName } from "./country";
import { deviceLabel, osLabel } from "./format";
import { flagIcon } from "./flagIcon";

const STATIC: Partial<Record<FilterKey, string[]>> = {
    os: ["windows", "macos", "ios", "android", "linux", "other"],
    device: ["desktop", "mobile", "tablet", "bot"],
    path: ["/", "/services", "/projects", "/experience", "/about", "/contact", "/privacidad"],
};
const ROUTE_NAME: Record<string, string> = {
    "/": "nav.home", "/services": "nav.services", "/projects": "nav.projects", "/experience": "nav.experience",
    "/about": "nav.about", "/contact": "nav.contact", "/privacidad": "footer.privacy",
};

export default function Filters({ values, known, onChange }: { values: FilterValues; known: FilterOptions; onChange: (k: FilterKey, v: string) => void }) {
    const { t, i18n } = useTranslation();
    const lang = i18n.resolvedLanguage ?? "es";
    const routeLabel = (p: string) => (ROUTE_NAME[p] ? `${p} · ${t(ROUTE_NAME[p], { defaultValue: "" })}`.replace(/ · $/, "") : p);
    const plain = (k: FilterKey, o: string) => (k === "os" ? osLabel(o) : k === "device" ? deviceLabel(o) : k === "path" ? routeLabel(o) : o);
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {FILTER_KEYS.map((k) => {
                const fixed = STATIC[k] ?? [];
                const options = [...fixed, ...[...new Set([...known[k], ...(values[k] ? [values[k]] : [])])].filter((o) => !fixed.includes(o)).sort()];
                return (
                    <Select
                        key={k}
                        label={t(`admin.filters.${k}`)}
                        options={(k === "country"
                            ? options.map((o) => ({ value: o, label: countryName(o), icon: flagIcon(o) })).sort((a, b) => a.label.localeCompare(b.label, lang))
                            : options.map((o) => ({ value: o, label: plain(k, o) })))}
                        value={values[k]}
                        onChange={(v: string) => onChange(k, v)}
                        placeholder={t("admin.common.all")}
                        searchPlaceholder={t("admin.filters.search")}
                        searchable={k === "country" || k === "path"}
                        clearable
                    />
                );
            })}
        </div>
    );
}
