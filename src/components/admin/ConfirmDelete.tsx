import { useTranslation } from "react-i18next";
import ConfirmDialog from "./ui/ConfirmDialog";

export interface PendingDelete { count: number; scope: string; run: () => void }

export default function ConfirmDelete({ pending, busy, onCancel }: { pending: PendingDelete | null; busy: boolean; onCancel: () => void }) {
    const { t } = useTranslation();
    const n = pending?.count ?? 0;
    return (
        <ConfirmDialog
            open={!!pending}
            title={t("admin.visitors.deleteTitle", { count: n })}
            destructive
            busy={busy}
            busyLabel={t("admin.visitors.deleting")}
            confirmLabel={t("admin.visitors.delete")}
            confirmDisabled={n === 0}
            onConfirm={() => pending?.run()}
            onCancel={onCancel}
        >
            {pending?.scope} {t("admin.visitors.irreversible")}
        </ConfirmDialog>
    );
}
