import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import ConfirmDialog from "../../../components/admin/ui/ConfirmDialog";
import StatusBadge from "../../../components/admin/ui/StatusBadge";
import type { Status } from "../../../types/content";
import type { Lang } from "./useEditor";

export function LangTabs({ lang, onChange, idPrefix }: { lang: Lang; onChange: (l: Lang) => void; idPrefix: string }) {
    const { t } = useTranslation();
    const tabs: Lang[] = ["es", "en"];
    return (
        <div role="tablist" aria-label={t("adminContent.common.language")} className="flex gap-2">
            {tabs.map((l) => (
                <button
                    key={l}
                    type="button"
                    role="tab"
                    id={`${idPrefix}-tab-${l}`}
                    aria-selected={lang === l}
                    aria-controls={`${idPrefix}-panel`}
                    onClick={() => onChange(l)}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                            e.preventDefault();
                            const next = l === "es" ? "en" : "es";
                            onChange(next);
                            document.getElementById(`${idPrefix}-tab-${next}`)?.focus();
                        }
                    }}
                    tabIndex={lang === l ? 0 : -1}
                    className={`btn !min-h-9 !px-4 !py-1 !text-sm ${lang === l ? "btn-primary" : ""}`}
                >
                    {t(`adminContent.common.lang.${l}`)}
                </button>
            ))}
        </div>
    );
}

interface EditorFrameProps {
    eyebrow: string;
    heading: string;
    backTo: string;
    backLabel: string;
    status?: Status;
    saving: boolean;
    dirty: boolean;
    onSave: (publish: boolean) => void;
    children: React.ReactNode;
}

export function EditorFrame({ eyebrow, heading, backTo, backLabel, status, saving, dirty, onSave, children }: EditorFrameProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [confirmLeave, setConfirmLeave] = useState(false);
    const cancel = () => (dirty ? setConfirmLeave(true) : navigate(backTo));

    return (
        <form noValidate onSubmit={(e) => { e.preventDefault(); onSave(false); }} className="min-w-0 space-y-6">
            <header className="space-y-2">
                <Link to={backTo} className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:bg-ink hover:text-paper">
                    <ArrowLeft size={14} strokeWidth={2.5} aria-hidden /> {backLabel}
                </Link>
                <p className="eyebrow">{eyebrow}</p>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl tracking-tight text-ink">{heading}</h1>
                    {status && <StatusBadge status={status} />}
                    {dirty && <span className="tag" role="status">{t("adminContent.common.unsaved")}</span>}
                </div>
            </header>
            {children}
            <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t-2 border-ink bg-paper px-4 py-2 [&_.btn]:!min-h-10 [&_.btn]:!px-3 [&_.btn]:!py-1.5 md:static md:mx-0 md:border-t-0 md:bg-transparent md:p-0 md:[&_.btn]:!min-h-10 md:[&_.btn]:!px-[1.1rem]">
                <span className="mr-auto hidden text-xs text-muted sm:inline">{t("adminContent.common.shortcut")}</span>
                <button type="button" className="btn" onClick={cancel} disabled={saving}>{t("adminContent.common.cancel")}</button>
                <button type="submit" className="btn" disabled={saving}>{saving ? t("adminContent.common.saving") : t("adminContent.common.save")}</button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => onSave(true)}>{t("adminContent.common.saveAndPublish")}</button>
            </div>
            <ConfirmDialog
                open={confirmLeave}
                title={t("adminContent.common.discardTitle")}
                destructive
                confirmLabel={t("adminContent.common.discard")}
                cancelLabel={t("adminContent.common.keepEditing")}
                onConfirm={() => navigate(backTo)}
                onCancel={() => setConfirmLeave(false)}
            >
                {t("adminContent.common.discardBody")}
            </ConfirmDialog>
        </form>
    );
}

