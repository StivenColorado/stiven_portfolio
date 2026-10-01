import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../../lib/seo";
import ChangePassword from "../../components/admin/ChangePassword";
import { useAdmin } from "../../components/admin/adminContext";

export default function Cuenta() {
    const { t } = useTranslation();
    useDocumentMeta({ title: t("admin.meta.account"), noindex: true });
    const { email, logout, expire } = useAdmin();

    return (
        <div className="space-y-6">
            <header>
                <p className="eyebrow">{t("admin.shell.eyebrow")}</p>
                <h1 className="font-display text-3xl tracking-tight text-ink">{t("admin.account.title")}</h1>
            </header>
            <section className="window window-body space-y-1 !shadow-none">
                <p className="eyebrow">{t("admin.account.signedInAs")}</p>
                <p className="break-all text-lg">{email}</p>
            </section>
            <ChangePassword onUnauthorized={expire} />
            <div>
                <button type="button" className="btn" onClick={() => void logout()}>
                    <LogOut size={16} strokeWidth={2.5} aria-hidden /> {t("admin.account.signOut")}
                </button>
            </div>
        </div>
    );
}
