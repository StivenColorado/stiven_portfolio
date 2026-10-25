import { useId, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

interface Props {
    label: string;
    value: string;
    onChange: (v: string) => void;
    as?: "input" | "textarea";
    type?: "text" | "url" | "number" | "email" | "date";
    hint?: ReactNode;
    error?: string;
    maxLength?: number;
    required?: boolean;
    rows?: number;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    autoComplete?: string;
    min?: number;
    max?: number;
    onBlur?: () => void;
}

const CONTROL = "field";

export default function Field({
    label, value, onChange, as = "input", type = "text", hint, error, maxLength, required,
    rows = 4, placeholder, disabled, id, autoComplete, min, max, onBlur,
}: Props) {
    const uid = useId();
    const area = useRef<HTMLTextAreaElement>(null);
    const lastWidth = useRef(0);
    const wrapped = as === "input" && (type === "text" || type === "email" || type === "url");
    useLayoutEffect(() => {
        const el = area.current;
        if (!el) return;
        const fit = () => {
            el.style.height = "auto";
            if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight + 4}px`;
        };
        fit();
        const ro = new ResizeObserver(() => { if (el.offsetWidth !== lastWidth.current) { lastWidth.current = el.offsetWidth; fit(); } });
        ro.observe(el);
        return () => ro.disconnect();
    }, [value, wrapped]);
    const fieldId = id ?? uid;
    const hintId = `${fieldId}-hint`;
    const errId = `${fieldId}-err`;
    const describedBy = [hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
    const common = {
        id: fieldId,
        value,
        required,
        disabled,
        onBlur,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: `${CONTROL} ${error ? "!border-dashed" : ""}`,
    } as const;

    return (
        <div className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <label htmlFor={fieldId} className="eyebrow min-w-0 break-words">
                    {label}{required && <span aria-hidden="true"> *</span>}
                </label>
                {maxLength !== undefined && (as === "textarea" || value.length >= maxLength * 0.8) && (
                    <span className="ml-auto font-mono text-[11px] text-muted" aria-hidden="true">{value.length}/{maxLength}</span>
                )}
            </div>
            {wrapped ? (
                <textarea {...common} ref={area} rows={1} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} inputMode={type === "email" ? "email" : type === "url" ? "url" : undefined} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} className={`${common.className} min-h-11 resize-none overflow-hidden`} onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))} />
            ) : as === "textarea" ? (
                <textarea {...common} rows={rows} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
            ) : (
                <input {...common} className={`${common.className} h-11 py-0 ${type === "date" ? "min-w-[10.5rem]" : ""}`} type={type} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} min={min} max={max} onClick={type === "date" ? (e) => { try { e.currentTarget.showPicker(); } catch { /* sin soporte: queda el icono */ } } : undefined} inputMode={type === "number" ? "numeric" : undefined} onChange={(e) => onChange(e.target.value)} />
            )}
            {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
            {error && <p id={errId} role="alert" className="text-sm font-extrabold text-ink">{error}</p>}
        </div>
    );
}
