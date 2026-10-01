import { useTranslation } from "react-i18next";
import { Archive, Eye, EyeOff } from "lucide-react";
import type { Status } from "../../../types/content";

const ICON = { published: Eye, hidden: EyeOff, archived: Archive } as const;

export default function StatusBadge({ status }: { status: Status }) {
    const { t } = useTranslation();
    const Icon = ICON[status];
    return (
        <span className={`tag ${status === "published" ? "!bg-ink !text-paper" : status === "archived" ? "dither" : ""}`}>
            <Icon size={13} strokeWidth={2.5} aria-hidden />
            {t(`admin.status.${status}`)}
        </span>
    );
}
