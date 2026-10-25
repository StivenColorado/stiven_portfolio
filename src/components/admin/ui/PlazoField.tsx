import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Select from "../../ui/Select";
import Field from "./Field";
import { entregaOf, formatPlazo, parsePlazo } from "../../../lib/plazo";
import type { PlazoKind, PlazoUnit } from "../../../lib/plazo";

interface Props { lead?: ReactNode; label: string; value: string; onChange: (text: string) => void; start: string; lang: "es" | "en"; error?: string }

export default function PlazoField({ lead, label, value, onChange, start, lang, error }: Props) {
    const { t } = useTranslation();
    const parsed = parsePlazo(value);
    const qty = parsed?.qty ?? 0;
    const unit = parsed?.unit ?? "day";
    const kind = parsed?.kind ?? "business";
    const emit = (next: { qty?: number; unit?: PlazoUnit; kind?: PlazoKind }) => {
        const q = next.qty ?? qty;
        onChange(q > 0 ? formatPlazo({ qty: q, unit: next.unit ?? unit, kind: next.kind ?? kind }, lang) : "");
    };
    const end = entregaOf(value, start);
    const endText = end ? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${end}T00:00:00Z`)) : "";

    return (
        <fieldset className="min-w-0 space-y-3 sm:col-span-2">
            <legend className="eyebrow mb-1">{label}</legend>
            {lead && <div className="max-w-sm">{lead}</div>}
            <div className="grid items-start gap-3 grid-cols-[6rem_minmax(0,1fr)] lg:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label={t("adminContracts.plazo.qty")} type="number" min={1} max={999} value={qty ? String(qty) : ""} placeholder="45" error={error} onChange={(v) => emit({ qty: Math.max(0, Math.min(999, Number.parseInt(v, 10) || 0)) })} />
                <Select label={t("adminContracts.plazo.unit")} searchable={false} value={unit} onChange={(v: string) => emit({ unit: (v || unit) as PlazoUnit })}
                    options={(["day", "week", "month"] as const).map((u) => ({ value: u, label: t(`adminContracts.plazo.units.${u}`) }))} />
                <Select className="col-span-2 lg:col-span-1" label={t("adminContracts.plazo.kind")} searchable={false} value={kind} onChange={(v: string) => emit({ kind: (v || kind) as PlazoKind })}
                    options={(["business", "calendar"] as const).map((k) => ({ value: k, label: t(`adminContracts.plazo.kinds.${k}`) }))} />
            </div>
            <p className="text-xs text-muted">{t("adminContracts.plazo.hint")}{kind === "business" ? ` ${t("adminContracts.plazo.businessNote")}` : ""}</p>
            {value && !parsed && <p className="text-xs font-extrabold text-ink">{t("adminContracts.plazo.legacy", { value })}</p>}
            {parsed && (
                <p className="dither border-2 border-dashed border-ink p-2 text-xs font-extrabold" role="status">
                    {endText ? t("adminContracts.plazo.result", { plazo: value, date: endText }) : t("adminContracts.plazo.needStart", { plazo: value })}
                </p>
            )}
        </fieldset>
    );
}
