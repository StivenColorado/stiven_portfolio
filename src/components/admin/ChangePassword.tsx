import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, adminApi } from "../../lib/api";
import { AuthWindow, Field, MIN_PASSWORD, Notice } from "./AuthWindow";

export default function ChangePassword({ onUnauthorized }: { onUnauthorized: () => void }) {
    const { t } = useTranslation();
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
        if (next !== confirm) return setError(t("admin.account.mismatch"));
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
                code === "invalid_current" ? t("admin.account.invalidCurrent")
                : code === "weak_password" ? t("admin.account.weak", { count: MIN_PASSWORD })
                : t("admin.account.failed"),
            );
        } finally {
            setBusy(false);
        }
    }

    if (!open) {
        return <button type="button" onClick={() => setOpen(true)} className="btn">{t("admin.account.changePassword")}</button>;
    }

    return (
        <AuthWindow title={t("admin.account.passwordWindow")}>
            <form onSubmit={submit} className="space-y-4">
                <Field label={t("admin.account.current")} type="password" autoComplete="current-password" value={current} onChange={setCurrent} />
                <Field label={t("admin.account.new")} type="password" autoComplete="new-password" value={next} onChange={setNext} hint={t("admin.auth.minHint", { count: MIN_PASSWORD })} />
                <Field label={t("admin.account.repeatNew")} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
                {error && <Notice>{error}</Notice>}
                {done && <Notice>{t("admin.account.done")}</Notice>}
                <div className="flex gap-3">
                    <button type="submit" disabled={busy} className="btn btn-primary flex-1 disabled:opacity-50">{busy ? t("admin.account.saving") : t("admin.account.save")}</button>
                    <button type="button" onClick={() => setOpen(false)} className="btn flex-1">{t("admin.account.close")}</button>
                </div>
            </form>
        </AuthWindow>
    );
}
