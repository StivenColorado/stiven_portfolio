import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, adminApi } from "../../lib/api";
import { AuthWindow, Field, Notice } from "./AuthWindow";

const DEFAULT_LOCK_SECONDS = 15 * 60;
const SENT = "Si el correo existe, te llegará un enlace.";

function useCountdown() {
    const [left, setLeft] = useState(0);
    useEffect(() => {
        if (left <= 0) return;
        const t = setTimeout(() => setLeft((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [left]);
    const clock = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
    return { left, clock, start: setLeft };
}

function ForgotForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
    const [email, setEmail] = useState(initialEmail);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const lock = useCountdown();

    async function submit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await adminApi.forgot(email);
            setSent(true);
        } catch (err) {
            if (err instanceof ApiError && err.status === 429) {
                lock.start(err.retryAfter ?? DEFAULT_LOCK_SECONDS);
                setError("Demasiadas solicitudes.");
            } else {
                setError("No se pudo enviar. Intenta de nuevo.");
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthWindow title="recuperar.txt" className="mx-auto mt-8">
            <form onSubmit={submit} className="space-y-4">
                <p className="eyebrow">Recuperar acceso</p>
                <Field label="Correo" type="email" autoComplete="username" value={email} onChange={setEmail} />
                {sent && <Notice>{SENT}</Notice>}
                {error && (
                    <Notice>
                        {error}
                        {lock.left > 0 && <span className="font-mono"> Reintenta en {lock.clock}.</span>}
                    </Notice>
                )}
                <button type="submit" disabled={busy || lock.left > 0} className="btn btn-primary w-full disabled:opacity-50">
                    {busy ? "Enviando…" : "Enviar enlace"}
                </button>
                <button type="button" onClick={onBack} className="btn w-full">Volver</button>
            </form>
        </AuthWindow>
    );
}

/** El 429 sin Retry-After asume la ventana de 15 min del servidor. */
export default function LoginForm({ onSuccess, notice }: { onSuccess: () => void; notice?: string }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [forgot, setForgot] = useState(false);
    const lock = useCountdown();

    async function submit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await adminApi.login(email, password);
            onSuccess();
        } catch (err) {
            if (err instanceof ApiError && err.status === 429) {
                lock.start(err.retryAfter ?? DEFAULT_LOCK_SECONDS);
                setError("Demasiados intentos.");
            } else {
                setError("No se pudo iniciar sesión.");
            }
            setPassword("");
        } finally {
            setBusy(false);
        }
    }

    if (forgot) return <ForgotForm initialEmail={email} onBack={() => setForgot(false)} />;

    return (
        <AuthWindow title="admin.app" className="mx-auto mt-8">
            <form onSubmit={submit} className="space-y-4">
                <p className="eyebrow">Admin</p>
                {notice && <Notice>{notice}</Notice>}
                <Field label="Correo" type="email" autoComplete="username" value={email} onChange={setEmail} />
                <Field label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
                {error && (
                    <Notice id="login-error">
                        {error}
                        {lock.left > 0 && <span className="font-mono"> Reintenta en {lock.clock}.</span>}
                    </Notice>
                )}
                <button type="submit" disabled={busy || lock.left > 0} className="btn btn-primary w-full disabled:opacity-50">
                    {lock.left > 0 ? `Bloqueado ${lock.clock}` : busy ? "Entrando…" : "Entrar"}
                </button>
                <button type="button" onClick={() => setForgot(true)} className="w-full text-sm text-ink underline underline-offset-4">
                    ¿Olvidaste tu contraseña?
                </button>
            </form>
        </AuthWindow>
    );
}
