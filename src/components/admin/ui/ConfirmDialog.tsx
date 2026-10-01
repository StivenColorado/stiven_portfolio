import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
    open: boolean;
    title: string;
    children?: ReactNode;
    confirmLabel?: string;
    busyLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    busy?: boolean;
    confirmDisabled?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open, title, children, confirmLabel, busyLabel, cancelLabel,
    destructive = false, busy = false, confirmDisabled = false, onConfirm, onCancel,
}: Props) {
    const { t } = useTranslation();
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onCancel}
            onClick={(e) => e.target === ref.current && !busy && ref.current?.close()}
            aria-labelledby={titleId}
            className="window m-auto w-[calc(100%-2rem)] max-w-md p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
        >
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate">{destructive ? t("admin.dialogDefaults.alertFile") : t("admin.dialogDefaults.confirmFile")}</span>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
                <h2 id={titleId} className="text-xl leading-tight">{title}</h2>
                {children && <div className="text-sm text-muted">{children}</div>}
                <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" className="btn" onClick={() => ref.current?.close()} disabled={busy}>{cancelLabel ?? t("admin.dialogDefaults.cancel")}</button>
                    <button
                        type="button"
                        className={`btn btn-primary disabled:opacity-50 ${destructive ? "!border-dashed" : ""}`}
                        onClick={onConfirm}
                        disabled={busy || confirmDisabled}
                    >
                        {busy ? (busyLabel ?? t("admin.dialogDefaults.busy")) : (confirmLabel ?? t("admin.dialogDefaults.confirm"))}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
