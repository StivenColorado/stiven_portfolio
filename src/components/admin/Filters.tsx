import { FILTER_KEYS } from "./filterState";
import type { FilterKey, FilterValues } from "./filterState";
import Select from "../ui/Select";
import { countryName } from "./country";
import { flagIcon } from "./flagIcon";
import type { Visit } from "../../lib/api";

const LABELS: Record<FilterKey, string> = { os: "OS", device: "Dispositivo", country: "País", path: "Ruta" };

export default function Filters({ values, visits, onChange }: { values: FilterValues; visits: Visit[]; onChange: (k: FilterKey, v: string) => void }) {
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {FILTER_KEYS.map((k) => {
                const options = [...new Set([...visits.map((v) => v[k]).filter((x): x is string => !!x), ...(values[k] ? [values[k]] : [])])].sort();
                return (
                    <Select
                        key={k}
                        label={LABELS[k]}
                        options={(k === "country"
                            ? options.map((o) => ({ value: o, label: countryName(o), icon: flagIcon(o) })).sort((a, b) => a.label.localeCompare(b.label, "es"))
                            : options.map((o) => ({ value: o, label: o })))}
                        value={values[k]}
                        onChange={(v: string) => onChange(k, v)}
                        placeholder="Todos"
                        searchable={k === "country" || k === "path"}
                        clearable
                    />
                );
            })}
        </div>
    );
}
