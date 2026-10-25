import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import Field from "../admin/ui/Field";
import type { SendInput, Strokes } from "../../types/contracts";
import SignaturePad from "./SignaturePad";

type Mode = "saved" | "draw" | "later";

interface Props {
    open: boolean;
    resend?: boolean;
    title: string;
    defaultEmail: string;
    defaultRemind: number;
    hasSaved: boolean;
    onSubmit: (input: SendInput) => Promise<string>;
    onClose: () => void;
}

const MODES: Mode[] = ["saved", "draw", "later"];

export default function SendDialog({ open, resend = false, title, defaultEmail, defaultRemind, hasSaved, onSubmit, onClose }: Props) {
    const { t } = useTranslation();
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const [email, setEmail] = useState(defaultEmail);
    const [days, setDays] = useState("30");
    const [message, setMessage] = useState("");
    const [remind, setRemind] = useState(String(defaultRemind));
    const [mode, setMode] = useState<Mode>(hasSaved ? "saved" : "draw");
    const [drawn, setDrawn] = useState<Strokes | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [link, setLink] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            setEmail(defaultEmail);
            setRemind(String(defaultRemind));
            setMode(hasSaved ? "saved" : "draw");
            setDrawn(null);
            setLink("");
            setError("");
            setCopied(false);
            dialog.showModal();
        }
        if (!open && dialog.open) dialog.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const clampDays = Math.min(90, Math.max(1, Math.trunc(Number(days)) || 30));
    const needsDrawing = !resend && mode === "draw" && !drawn;

    async function submit() {
        setBusy(true);
        setError("");
        try {
            setLink(await onSubmit({
                email: email.trim(),
                expiresInDays: clampDays,
                message: message.trim() || undefined,
                remindDays: Math.min(30, Math.max(0, Math.trunc(Number(remind)) || 0)),
                signature: !resend && mode === "draw" ? drawn : null,
                useSaved: !resend && mode === "saved",
            }));
        } catch (e) {
            const code = (e as { code?: string }).code;
            setError(code === "no_saved_signature" ? t("adminContracts.send.noSaved") : t("adminContracts.send.failed"));
        } finally {
            setBusy(false);
        }
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => e.target === ref.current && !busy && ref.current?.close()}
            aria-labelledby={titleId}
            className="window m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
        >
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate">{resend ? t("adminContracts.send.fileResend") : t("adminContracts.send.file")}</span>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
                <h2 id={titleId} className="break-words text-xl leading-tight">{resend ? t("adminContracts.send.resendTitle") : t("adminContracts.send.title")}: {title}</h2>
                {link ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted">{t("adminContracts.send.sentBody", { email })}</p>
                        <div className="flex gap-2">
                            <input readOnly value={link} aria-label={t("adminContracts.send.link")} onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 font-mono text-xs" />
                            <button type="button" className="btn !px-3" onClick={() => void copy()}>
                                {copied ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />}
                                {copied ? t("adminContracts.send.copied") : t("adminContracts.send.copy")}
                            </button>
                        </div>
                        <p className="text-xs text-muted">{t("adminContracts.send.linkOnce")}</p>
                        <div className="flex justify-end"><button type="button" className="btn btn-primary" onClick={() => ref.current?.close()}>{t("adminContracts.common.close")}</button></div>
                    </div>
                ) : (
                    <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
                        <Field label={t("adminContracts.send.email")} type="email" value={email} onChange={setEmail} required maxLength={254} autoComplete="off" />
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t("adminContracts.send.days")} type="number" min={1} max={90} value={days} onChange={setDays} hint={t("adminContracts.send.daysHint")} />
                            {!resend && <Field label={t("adminContracts.send.remind")} type="number" min={0} max={30} value={remind} onChange={setRemind} hint={t("adminContracts.send.remindHint")} />}
                        </div>
                        {!resend && (
                            <>
                                <Field label={t("adminContracts.send.message")} as="textarea" rows={3} maxLength={500} value={message} onChange={setMessage} />
                                <fieldset className="space-y-2">
                                    <legend className="eyebrow">{t("adminContracts.send.mySignature")}</legend>
                                    {MODES.filter((m) => m !== "saved" || hasSaved).map((m) => (
                                        <label key={m} className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                                            <input type="radio" name="sig-mode" checked={mode === m} onChange={() => setMode(m)} className="size-4 accent-[var(--ink)]" />
                                            {t(`adminContracts.send.mode.${m}`)}
                                        </label>
                                    ))}
                                    {mode === "later" && <p className="text-xs text-muted">{t("adminContracts.send.laterHint")}</p>}
                                    {mode === "draw" && <SignaturePad onChange={setDrawn} />}
                                </fieldset>
                            </>
                        )}
                        {error && <p role="alert" className="text-sm font-extrabold text-ink">{error}</p>}
                        <div className="flex flex-wrap justify-end gap-3">
                            <button type="button" className="btn" onClick={() => ref.current?.close()} disabled={busy}>{t("adminContracts.common.cancel")}</button>
                            <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={busy || !email.trim() || needsDrawing}>
                                {busy ? t("adminContracts.send.sending") : resend ? t("adminContracts.send.resendAction") : t("adminContracts.send.action")}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </dialog>
    );
}
