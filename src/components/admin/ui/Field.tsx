import { useId } from "react";
import type { ReactNode } from "react";

interface Props {
    label: string;
    value: string;
    onChange: (v: string) => void;
    as?: "input" | "textarea";
    type?: "text" | "url" | "number" | "email";
    hint?: ReactNode;
    error?: string;
    maxLength?: number;
    required?: boolean;
    rows?: number;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    autoComplete?: string;
}

const CONTROL = "field";

export default function Field({
    label, value, onChange, as = "input", type = "text", hint, error, maxLength, required,
    rows = 4, placeholder, disabled, id, autoComplete,
}: Props) {
    const uid = useId();
    const fieldId = id ?? uid;
    const hintId = `${fieldId}-hint`;
    const errId = `${fieldId}-err`;
    const describedBy = [hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
    const common = {
        id: fieldId,
        value,
        required,
        disabled,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: `${CONTROL} ${error ? "!border-dashed" : ""}`,
    } as const;

    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={fieldId} className="eyebrow">
                    {label}{required && <span aria-hidden="true"> *</span>}
                </label>
                {maxLength !== undefined && (
                    <span className="font-mono text-[11px] text-muted" aria-hidden="true">{value.length}/{maxLength}</span>
                )}
            </div>
            {as === "textarea" ? (
                <textarea {...common} rows={rows} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
            ) : (
                <input {...common} type={type} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
            )}
            {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
            {error && <p id={errId} role="alert" className="text-sm font-extrabold text-ink">{error}</p>}
        </div>
    );
}
