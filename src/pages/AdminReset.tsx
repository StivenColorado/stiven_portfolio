import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ApiError, adminApi } from "../lib/api";
import { useDocumentMeta } from "../lib/seo";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { AuthWindow, Field, MIN_PASSWORD, Notice } from "../components/admin/AuthWindow";
import { useAdminLocales } from "../i18n/useAdminLocales";

const AdminResetContent = () => {
    const { t } = useTranslation();
    useDocumentMeta({ title: t("admin.meta.reset"), noindex: true });
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (password !== confirm) return setError(t("admin.reset.mismatch"));
        setBusy(true);
        setError("");
        try {
            await adminApi.reset(token, password);
            setDone(true);
        } catch (err) {
            const code = err instanceof ApiError ? err.code : undefined;
            setError(
                code === "weak_password" ? t("admin.reset.weak", { count: MIN_PASSWORD })
                : code === "invalid_token" ? t("admin.reset.invalidToken")
                : t("admin.reset.failed"),
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center bg-paper px-4 pb-16 pt-24 text-ink">
            <div className="flex w-full max-w-sm justify-end"><LanguageSwitcher /></div>
            <AuthWindow title={t("admin.reset.window")} className="mt-4">
                {done ? (
                    <div className="space-y-4">
                        <Notice>{t("admin.reset.done")}</Notice>
                        <Link to="/admin" className="btn btn-primary w-full">{t("admin.reset.goLogin")}</Link>
                    </div>
                ) : !token ? (
                    <div className="space-y-4">
                        <Notice>{t("admin.reset.missingToken")}</Notice>
                        <Link to="/admin" className="btn w-full">{t("admin.auth.back")}</Link>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-4">
                        <p className="eyebrow">{t("admin.reset.title")}</p>
                        <Field label={t("admin.reset.newPassword")} type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={t("admin.auth.minHint", { count: MIN_PASSWORD })} />
                        <Field label={t("admin.reset.repeat")} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
                        {error && <Notice>{error}</Notice>}
                        <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-50">{busy ? t("admin.reset.saving") : t("admin.reset.save")}</button>
                    </form>
                )}
            </AuthWindow>
        </div>
    );
};

const AdminReset = () => (useAdminLocales() ? <AdminResetContent /> : null);

export default AdminReset;
