import { useTranslation } from "react-i18next";
import { BadgeCheck, Ban, Clock, FileEdit, PenLine, Send } from "lucide-react";
import type { DocStatus } from "../../types/contracts";

const ICON = { draft: FileEdit, sent: Send, client_signed: PenLine, active: BadgeCheck, expired: Clock, cancelled: Ban } as const;

export default function DocStatusBadge({ status }: { status: DocStatus }) {
    const { t } = useTranslation();
    const Icon = ICON[status];
    const tone = status === "active" ? "!bg-ink !text-paper" : status === "cancelled" || status === "expired" ? "dither" : "";
    return (
        <span className={`tag ${tone}`}>
            <Icon size={13} strokeWidth={2.5} aria-hidden />
            {t(`adminContracts.status.${status}`)}
        </span>
    );
}
