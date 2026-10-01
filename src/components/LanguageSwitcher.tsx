import React from "react";
import { useTranslation } from "react-i18next";
import { setLanguage, type Lang } from "../i18n";

const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = "" }) => {
    const { t, i18n } = useTranslation();
    const current: Lang = i18n.resolvedLanguage === "en" ? "en" : "es";
    const next: Lang = current === "es" ? "en" : "es";
    return (
        <button
            type="button"
            onClick={() => setLanguage(next)}
            aria-label={t("lang.switchTo", { language: t(`lang.${next}`) })}
            className={`flex h-6 w-6 items-center justify-center border-2 border-ink bg-paper text-[10px] font-extrabold leading-none text-ink hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${className}`}
        >
            {current.toUpperCase()}
        </button>
    );
};

export default LanguageSwitcher;
