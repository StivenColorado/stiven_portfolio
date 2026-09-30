import { useEffect, useRef } from "react";

export interface PendingDelete { count: number; scope: string; run: () => void }

export default function ConfirmDelete({ pending, busy, onCancel }: { pending: PendingDelete | null; busy: boolean; onCancel: () => void }) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (pending && !dialog.open) dialog.showModal();
        if (!pending && dialog.open) dialog.close();
    }, [pending]);

    const n = pending?.count ?? 0;
    return (
        <dialog
            ref={ref}
            onClose={onCancel}
            onClick={(e) => e.target === ref.current && ref.current?.close()}
            aria-labelledby="confirm-delete-title"
            className="window m-auto w-[calc(100%-2rem)] max-w-md p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
        >
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate">confirmar.dlg</span>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
                <h2 id="confirm-delete-title" className="text-xl leading-tight">
                    {n === 1 ? "Se borrará 1 visita" : `Se borrarán ${n} visitas`}
                </h2>
                <p className="text-sm text-muted">{pending?.scope} Esta acción no se puede deshacer.</p>
                <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" className="btn" onClick={() => ref.current?.close()} disabled={busy}>Cancelar</button>
                    <button type="button" className="btn btn-primary disabled:opacity-50" onClick={() => pending?.run()} disabled={busy || n === 0}>
                        {busy ? "Borrando…" : "Borrar"}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
