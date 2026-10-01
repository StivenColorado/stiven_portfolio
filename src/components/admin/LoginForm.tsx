import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, adminApi } from "../../lib/api";
import LanguageSwitcher from "../LanguageSwitcher";
import { AuthWindow, Field, Notice } from "./AuthWindow";

const DEFAULT_LOCK_SECONDS = 15 * 60;

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
    const { t } = useTranslation();
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
                setError(t("admin.auth.tooManyRequests"));
            } else {
                setError(t("admin.auth.sendFailed"));
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <AuthWindow title={t("admin.auth.recoverWindow")}>
            <form onSubmit={submit} className="space-y-4">
                <p className="eyebrow">{t("admin.auth.recoverTitle")}</p>
                <Field label={t("admin.auth.email")} type="email" autoComplete="username" value={email} onChange={setEmail} />
                {sent && <Notice>{t("admin.auth.sent")}</Notice>}
                {error && (
                    <Notice>
                        {error}
                        {lock.left > 0 && <span className="font-mono">{t("admin.auth.retryIn", { clock: lock.clock })}</span>}
                    </Notice>
                )}
                <button type="submit" disabled={busy || lock.left > 0} className="btn btn-primary w-full disabled:opacity-50">
                    {busy ? t("admin.auth.sending") : t("admin.auth.sendLink")}
                </button>
                <button type="button" onClick={onBack} className="btn w-full">{t("admin.auth.back")}</button>
            </form>
        </AuthWindow>
        </div>
    );
}

/** El 429 sin Retry-After asume la ventana de 15 min del servidor. */
export default function LoginForm({ onSuccess, notice }: { onSuccess: () => void; notice?: string }) {
    const { t } = useTranslation();
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
                setError(t("admin.auth.tooMany"));
            } else {
                setError(t("admin.auth.loginFailed"));
            }
            setPassword("");
        } finally {
            setBusy(false);
        }
    }

    if (forgot) return <ForgotForm initialEmail={email} onBack={() => setForgot(false)} />;

    return (
        <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <AuthWindow title="admin.app">
            <form onSubmit={submit} className="space-y-4">
                <p className="eyebrow">{t("admin.shell.eyebrow")}</p>
                {notice && <Notice>{notice}</Notice>}
                <Field label={t("admin.auth.email")} type="email" autoComplete="username" value={email} onChange={setEmail} />
                <Field label={t("admin.auth.password")} type="password" autoComplete="current-password" value={password} onChange={setPassword} />
                {error && (
                    <Notice id="login-error">
                        {error}
                        {lock.left > 0 && <span className="font-mono">{t("admin.auth.retryIn", { clock: lock.clock })}</span>}
                    </Notice>
                )}
                <button type="submit" disabled={busy || lock.left > 0} className="btn btn-primary w-full disabled:opacity-50">
                    {lock.left > 0 ? t("admin.auth.locked", { clock: lock.clock }) : busy ? t("admin.auth.entering") : t("admin.auth.enter")}
                </button>
                <button type="button" onClick={() => setForgot(true)} className="w-full text-sm text-ink underline underline-offset-4">
                    {t("admin.auth.forgot")}
                </button>
            </form>
        </AuthWindow>
        </div>
    );
}
