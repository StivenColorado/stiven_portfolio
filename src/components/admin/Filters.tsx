import { useTranslation } from "react-i18next";
import { FILTER_KEYS } from "./filterState";
import type { FilterKey, FilterOptions, FilterValues } from "./filterState";
import Select from "../ui/Select";
import { countryName } from "./country";
import { deviceLabel, osLabel } from "./format";
import { flagIcon } from "./flagIcon";

export default function Filters({ values, known, onChange }: { values: FilterValues; known: FilterOptions; onChange: (k: FilterKey, v: string) => void }) {
    const { t, i18n } = useTranslation();
    const lang = i18n.resolvedLanguage ?? "es";
    const plain = (k: FilterKey, o: string) => (k === "os" ? osLabel(o) : k === "device" ? deviceLabel(o) : o);
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {FILTER_KEYS.map((k) => {
                const options = [...new Set([...known[k], ...(values[k] ? [values[k]] : [])])].sort();
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
