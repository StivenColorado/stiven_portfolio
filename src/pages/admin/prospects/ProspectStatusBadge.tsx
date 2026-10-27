import { useTranslation } from "react-i18next";
import type { ProspectStatus } from "../../../types/prospects";

const LOOK: Record<ProspectStatus, string> = {
    new: "",
    contacted: "",
    replied: "",
    meeting: "!bg-ink !text-paper",
    proposal: "!bg-ink !text-paper",
    won: "!bg-ink !text-paper",
    lost: "dither",
};

export default function ProspectStatusBadge({ status }: { status: ProspectStatus }) {
    const { t } = useTranslation();
    return <span className={`tag ${LOOK[status]}`}>{t(`adminProspects.status.${status}`)}</span>;
}
