import { useTranslation } from "react-i18next";
import Select from "../../ui/Select";
import Field from "./Field";
import { formatGarantia, parseGarantia } from "../../../lib/plazo";
import type { PlazoUnit } from "../../../lib/plazo";

interface Props { label: string; value: string; onChange: (text: string) => void; lang: "es" | "en"; legacyUnit?: PlazoUnit; error?: string }

/** Duración con unidad elegible; se guarda como texto ("24 meses") para que la plantilla lo cite tal cual. */
export default function DuracionField({ label, value, onChange, lang, legacyUnit = "day", error }: Props) {
    const { t } = useTranslation();
    const g = parseGarantia(value) ?? (/^\d+$/.test(value.trim()) ? { qty: Number(value), unit: legacyUnit } : null);
    const qty = g?.qty ?? 0;
    const unit = g?.unit ?? legacyUnit;
    const emit = (q: number, u: PlazoUnit) => onChange(q > 0 ? formatGarantia({ qty: q, unit: u }, lang) : "");

    return (
        <fieldset className="min-w-0 space-y-1">
            <legend className="eyebrow mb-2">{label}</legend>
            <div className="grid grid-cols-[6rem_minmax(0,16rem)] items-start gap-3">
                <Field label={t("adminContracts.plazo.qty")} type="number" min={1} max={999} value={qty ? String(qty) : ""} error={error} onChange={(v) => emit(Math.max(0, Math.min(999, Number.parseInt(v, 10) || 0)), unit)} />
                <Select label={t("adminContracts.plazo.unit")} searchable={false} value={unit} onChange={(v: string) => emit(qty, (v || unit) as PlazoUnit)}
                    options={(["day", "week", "month"] as const).map((u) => ({ value: u, label: t(`adminContracts.plazo.units.${u}`) }))} />
            </div>
            {value && !g && <p className="text-xs font-extrabold text-ink">{t("adminContracts.plazo.legacy", { value })}</p>}
        </fieldset>
    );
}
