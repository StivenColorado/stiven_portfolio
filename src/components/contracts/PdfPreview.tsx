import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, ExternalLink, Maximize2, RotateCw, X } from "lucide-react";
import { previewPdf } from "../../lib/contractsApi";
import type { PreviewPayload } from "../../lib/contractsApi";

interface Props {
    payload?: PreviewPayload;
    src?: string;
    className?: string;
}

type State = { phase: "loading" } | { phase: "error" } | { phase: "ready"; url: string };

const DEBOUNCE_MS = 800;
const link = "btn !min-h-10 !px-3 !py-1 !text-sm";

export default function PdfPreview({ payload, src, className = "" }: Props) {
    const { t } = useTranslation();
    const [state, setState] = useState<State>({ phase: "loading" });
    const [open, setOpen] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const first = useRef(true);
    const key = src ? "" : JSON.stringify(payload ?? {});

    useEffect(() => {
        if (src) return;
        const ctrl = new AbortController();
        let made: string | null = null;
        const timer = window.setTimeout(() => {
            previewPdf(JSON.parse(key) as PreviewPayload, ctrl.signal)
                .then((blob) => {
                    made = URL.createObjectURL(blob);
                    setState({ phase: "ready", url: made });
                })
                .catch((e: unknown) => {
                    if (!(e instanceof DOMException && e.name === "AbortError")) setState({ phase: "error" });
                });
        }, first.current ? 0 : DEBOUNCE_MS);
        first.current = false;
        return () => {
            window.clearTimeout(timer);
            ctrl.abort();
            if (made) URL.revokeObjectURL(made);
        };
    }, [key, src, attempt]);

    useEffect(() => {
        const d = dialogRef.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);

    const retry = useCallback(() => { setState({ phase: "loading" }); setAttempt((n) => n + 1); }, []);
    const url = src ?? (state.phase === "ready" ? state.url : null);
    const phase = src ? "ready" : state.phase;
    const label = t("adminContracts.pdfPreview.title");

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="relative mx-auto aspect-[8.5/11] w-full overflow-hidden border-2 border-ink bg-[#FDFCF8] shadow-[4px_4px_0_var(--ink)]">
                {url && phase === "ready" && (
                    <>
                        <iframe key={url} title={label} src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} tabIndex={-1} className="pointer-events-none absolute inset-0 size-full border-0" />
                        <button type="button" aria-label={t("adminContracts.pdfPreview.enlargeLabel")} onClick={() => setOpen(true)} className="absolute inset-0 cursor-zoom-in bg-transparent" />
                    </>
                )}
                {phase === "loading" && (
                    <div role="status" className="dither absolute inset-0 flex animate-pulse items-center justify-center p-4 text-center text-xs font-extrabold text-ink">{t("adminContracts.pdfPreview.loading")}</div>
                )}
                {phase === "error" && (
                    <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-xs font-extrabold text-[#2B2A24]">
                        <p>{t("adminContracts.pdfPreview.error")}</p>
                        <button type="button" className={link} onClick={retry}><RotateCw size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.retry")}</button>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" className={link} disabled={!url} onClick={() => setOpen(true)}><Maximize2 size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.pdfPreview.enlarge")}</button>
                {url && <a href={url} target="_blank" rel="noopener" className={link}><ExternalLink size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.pdfPreview.newTab")}</a>}
            </div>

            <dialog ref={dialogRef} aria-label={label} onClose={() => setOpen(false)} onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()} className="window m-auto h-[92vh] w-[92vw] max-w-none overflow-hidden p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden">
                {open && (
                    <div className="flex h-full flex-col">
                        <div className="window-bar">
                            <span className="window-dot" aria-hidden="true" />
                            <span className="flex-1 truncate">vista-previa.pdf</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 border-b-2 border-ink p-2">
                            {url && <a href={url} target="_blank" rel="noopener" className={`${link} btn-primary`}><ExternalLink size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.pdfPreview.newTab")}</a>}
                            {url && <a href={url} download="vista-previa.pdf" className={link}><Download size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.pdfPreview.download")}</a>}
                            <button type="button" autoFocus className={link} onClick={() => dialogRef.current?.close()}><X size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.close")}</button>
                        </div>
                        <div className="min-h-0 flex-1 bg-[#EDEBDD]">
                            {url ? <iframe title={label} src={`${url}#toolbar=1&view=FitH`} className="size-full border-0" /> : <p role="status" className="p-4 text-sm font-bold">{t("adminContracts.pdfPreview.loading")}</p>}
                        </div>
                    </div>
                )}
            </dialog>
        </div>
    );
}
