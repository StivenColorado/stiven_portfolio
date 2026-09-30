import type { ReactNode } from "react";

export const MIN_PASSWORD = 12;

export function AuthWindow({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
    return (
        <div className={`window w-full max-w-sm ${className}`}>
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">{title}</span>
            </div>
            <div className="window-body space-y-4">{children}</div>
        </div>
    );
}

interface FieldProps {
    label: string;
    type: "email" | "password";
    autoComplete: "username" | "current-password" | "new-password";
    value: string;
    onChange: (v: string) => void;
    hint?: string;
}

export function Field({ label, type, autoComplete, value, onChange, hint }: FieldProps) {
    return (
        <label className="block space-y-1">
            <span className="eyebrow">{label}</span>
            <input
                type={type}
                autoComplete={autoComplete}
                required
                minLength={autoComplete === "new-password" ? MIN_PASSWORD : undefined}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full border-2 border-ink bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            {hint && <span className="block text-xs text-muted">{hint}</span>}
        </label>
    );
}

export function Notice({ id, children }: { id?: string; children: ReactNode }) {
    return (
        <p id={id} role="alert" className="dither border-2 border-ink p-2 text-sm text-ink">
            {children}
        </p>
    );
}
