import { useTranslation } from "react-i18next";
import Select from "../../ui/Select";
import Field from "./Field";
import { formatGarantia, garantiaDays, parseGarantia } from "../../../lib/plazo";
import type { PlazoUnit } from "../../../lib/plazo";

interface Props {
    label: string;
    text: string;
    days: string;
    onChange: (next: { garantia: string; garantia_dias: string }) => void;
    lang: "es" | "en";
    error?: string;
}

/** `garantia_dias` queda siempre en días (lo que leen las plantillas); `garantia` conserva la unidad elegida. */
export default function GarantiaField({ label, text, days, onChange, lang, error }: Props) {
    const { t } = useTranslation();
    const g = parseGarantia(text, days);
    const qty = g?.qty ?? 0;
    const unit = g?.unit ?? "day";
    const emit = (q: number, u: PlazoUnit) =>
        onChange(q > 0 ? { garantia: formatGarantia({ qty: q, unit: u }, lang), garantia_dias: String(garantiaDays({ qty: q, unit: u })) } : { garantia: "", garantia_dias: "" });

    return (
        <fieldset className="min-w-0 space-y-3">
            <legend className="eyebrow mb-1">{label}</legend>
            <div className="grid items-start gap-3 grid-cols-[6rem_minmax(0,16rem)]">
                <Field label={t("adminContracts.plazo.qty")} type="number" min={0} max={999} value={qty ? String(qty) : ""} placeholder="60" error={error} onChange={(v) => emit(Math.max(0, Math.min(999, Number.parseInt(v, 10) || 0)), unit)} />
                <Select label={t("adminContracts.plazo.unit")} searchable={false} value={unit} onChange={(v: string) => emit(qty, (v || unit) as PlazoUnit)}
                    options={(["day", "week", "month"] as const).map((u) => ({ value: u, label: t(`adminContracts.plazo.units.${u}`) }))} />
            </div>
            <p className="text-xs text-muted">{t("adminContracts.garantia.hint")}{g ? ` ${t("adminContracts.garantia.result", { days: garantiaDays(g) })}` : ""}</p>
        </fieldset>
    );
}
