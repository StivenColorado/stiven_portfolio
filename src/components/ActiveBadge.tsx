import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
    size?: "sm" | "md";
}

const Sparkle: React.FC = () => (
    <svg viewBox="0 0 24 24" className="active-badge__star" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 0c.7 6.2 3.3 10.4 12 12-8.7 1.6-11.3 5.8-12 12-.7-6.2-3.3-10.4-12-12C8.7 10.4 11.3 6.2 12 0z" />
    </svg>
);

const ActiveBadge: React.FC<Props> = ({ size = "md" }) => {
    const { t } = useTranslation();
    return (
        <span className={`active-badge active-badge--${size}`}>
            <span className="active-badge__halo" aria-hidden="true" />
            <Sparkle />
            <span className="active-badge__label">{t("projects.badge.active")}</span>
        </span>
    );
};

export default ActiveBadge;
