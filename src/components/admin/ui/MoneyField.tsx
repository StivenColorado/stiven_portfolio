import Field from "./Field";

const group = (raw: string) => { const d = raw.replace(/\D/g, ""); return d ? new Intl.NumberFormat("es-CO").format(Number(d)) : ""; };
const currencyName = (code: string) => new Intl.DisplayNames(["es"], { type: "currency" }).of(code) ?? code;

/** Guarda solo dígitos (ej. "1500000") y muestra el valor con puntos de miles (1.500.000). */
export default function MoneyField({ label, value, onChange, currency, error }: { label: string; value: string; onChange: (raw: string) => void; currency: string; error?: string }) {
    return (
        <Field
            label={`${label} (${currency})`}
            value={group(value)}
            placeholder={currency === "USD" ? "1.500" : "1.500.000"}
            hint={currencyName(currency)}
            error={error}
            onChange={(v) => onChange(v.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12))}
        />
    );
}
