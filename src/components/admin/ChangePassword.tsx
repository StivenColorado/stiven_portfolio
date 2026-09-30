import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, adminApi } from "../../lib/api";
import { AuthWindow, Field, MIN_PASSWORD, Notice } from "./AuthWindow";

export default function ChangePassword({ onUnauthorized }: { onUnauthorized: () => void }) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setDone(false);
        if (next !== confirm) return setError("Las contraseñas nuevas no coinciden.");
        setBusy(true);
        setError("");
        try {
            await adminApi.changePassword(current, next);
            setCurrent(""); setNext(""); setConfirm("");
            setDone(true);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) return onUnauthorized();
            const code = err instanceof ApiError ? err.code : undefined;
            setError(
                code === "invalid_current" ? "La contraseña actual no es correcta."
                : code === "weak_password" ? `La nueva contraseña necesita al menos ${MIN_PASSWORD} caracteres.`
                : "No se pudo cambiar la contraseña.",
            );
        } finally {
            setBusy(false);
        }
    }

    if (!open) {
        return <button type="button" onClick={() => setOpen(true)} className="btn">Cambiar contraseña</button>;
    }

    return (
        <AuthWindow title="contraseña.app">
            <form onSubmit={submit} className="space-y-4">
                <Field label="Contraseña actual" type="password" autoComplete="current-password" value={current} onChange={setCurrent} />
                <Field label="Contraseña nueva" type="password" autoComplete="new-password" value={next} onChange={setNext} hint={`Mínimo ${MIN_PASSWORD} caracteres.`} />
                <Field label="Repite la nueva" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
                {error && <Notice>{error}</Notice>}
                {done && <Notice>Contraseña actualizada. Las demás sesiones se cerraron.</Notice>}
                <div className="flex gap-3">
                    <button type="submit" disabled={busy} className="btn btn-primary flex-1 disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button>
                    <button type="button" onClick={() => setOpen(false)} className="btn flex-1">Cerrar</button>
                </div>
            </form>
        </AuthWindow>
    );
}
