import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ApiError, adminApi } from "../lib/api";
import { useDocumentMeta } from "../lib/seo";
import { AuthWindow, Field, MIN_PASSWORD, Notice } from "../components/admin/AuthWindow";

const AdminReset = () => {
    useDocumentMeta({ title: "Restablecer contraseña", noindex: true });
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (password !== confirm) return setError("Las contraseñas no coinciden.");
        setBusy(true);
        setError("");
        try {
            await adminApi.reset(token, password);
            setDone(true);
        } catch (err) {
            const code = err instanceof ApiError ? err.code : undefined;
            setError(
                code === "weak_password" ? `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`
                : code === "invalid_token" ? "El enlace no es válido o venció. Pide uno nuevo."
                : "No se pudo restablecer la contraseña.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl justify-center bg-paper px-4 pb-16 pt-24 text-ink">
            <AuthWindow title="restablecer.app" className="mt-8">
                {done ? (
                    <div className="space-y-4">
                        <Notice>Contraseña actualizada.</Notice>
                        <Link to="/admin" className="btn btn-primary w-full">Ir al login</Link>
                    </div>
                ) : !token ? (
                    <div className="space-y-4">
                        <Notice>Falta el token del enlace. Pide uno nuevo desde el login.</Notice>
                        <Link to="/admin" className="btn w-full">Volver</Link>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-4">
                        <p className="eyebrow">Nueva contraseña</p>
                        <Field label="Contraseña nueva" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={`Mínimo ${MIN_PASSWORD} caracteres.`} />
                        <Field label="Repite la contraseña" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
                        {error && <Notice>{error}</Notice>}
                        <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button>
                    </form>
                )}
            </AuthWindow>
        </div>
    );
};

export default AdminReset;
