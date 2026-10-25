import { useId } from "react";
import { useTranslation } from "react-i18next";
import Field from "./Field";

/** `value` es el número de días como texto; "0" significa recordatorios apagados. */
export default function RemindField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
    const { t } = useTranslation();
    const id = useId();
    const days = Math.trunc(Number(value)) || 0;
    const on = days > 0;

    return (
        <div className="min-w-0 space-y-3 sm:col-span-2">
            <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
                <input id={id} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? "3" : "0")} className="mt-1 size-5 shrink-0 cursor-pointer accent-[var(--color-ink,currentColor)]" />
                <span className="min-w-0">
                    <span className="block font-extrabold text-ink">{t("adminContracts.remind.label")}</span>
                    <span className="block text-xs text-muted">{on ? t("adminContracts.remind.onHint") : t("adminContracts.remind.offHint")}</span>
                </span>
            </label>
            {on && (
                <div className="max-w-48 sm:ml-8">
                    <Field label={t("adminContracts.remind.every")} type="number" min={1} max={30} value={String(days)} error={error} onChange={(v) => onChange(String(Math.min(30, Math.max(1, Math.trunc(Number(v)) || 1))))} />
                </div>
            )}
        </div>
    );
}
