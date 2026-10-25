import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Download, PenLine } from "lucide-react";
import { ApiError } from "../lib/api";
import { useDocumentMeta } from "../lib/seo";
import { getSign, postSign, signPdfUrl } from "../lib/signApi";
import LanguageSwitcher from "../components/LanguageSwitcher";
import DocView from "../components/contracts/DocView";
import SignaturePad from "../components/contracts/SignaturePad";
import type { SignResult, SignView, Strokes } from "../types/contracts";

type State =
    | { kind: "loading" }
    | { kind: "error"; reason: "invalid" | "expired" | "cancelled" | "failed" }
    | { kind: "ready"; view: SignView }
    | { kind: "done"; view: SignView; result: SignResult | null };

const fmt = (ts: number, lang: string) =>
    new Intl.DateTimeFormat(lang, { dateStyle: "long", timeStyle: "short" }).format(ts);

export default function Firmar() {
    const { t, i18n } = useTranslation();
    useDocumentMeta({ title: t("sign.meta"), noindex: true });
    const token = useParams().token ?? "";
    const [state, setState] = useState<State>({ kind: "loading" });
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [strokes, setStrokes] = useState<Strokes | null>(null);
    const [accepted, setAccepted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const lang = i18n.resolvedLanguage ?? "es";

    useEffect(() => {
        let alive = true;
        getSign(token)
            .then((view) => {
                if (!alive) return;
                setName(view.contactName);
                setState(view.clientSigned || view.status === "active" ? { kind: "done", view, result: null } : { kind: "ready", view });
            })
            .catch((e: unknown) => {
                if (!alive) return;
                const status = e instanceof ApiError ? e.status : 0;
                setState({ kind: "error", reason: status === 404 ? "invalid" : status === 410 ? "expired" : status === 409 ? "cancelled" : "failed" });
            });
        return () => { alive = false; };
    }, [token]);

    useEffect(() => {
        const d = dialog.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (state.kind !== "ready" || !strokes) return;
        setBusy(true);
        setError("");
        try {
            const result = await postSign(token, { name: name.trim(), strokes, accepted: true });
            setOpen(false);
            setState({ kind: "done", view: state.view, result });
        } catch (err) {
            const status = err instanceof ApiError ? err.status : 0;
            if (status === 409) { setOpen(false); setState({ kind: "done", view: state.view, result: null }); }
            else if (status === 410) { setOpen(false); setState({ kind: "error", reason: "expired" }); }
            else setError(status === 429 ? t("sign.errors.tooMany") : status === 400 ? t("sign.errors.invalid") : t("sign.errors.failed"));
        } finally {
            setBusy(false);
        }
    }

    const shell = (children: React.ReactNode) => (
        <div className="mx-auto w-full max-w-[860px] bg-paper px-2 pb-28 pt-6 sm:px-4 text-ink">
            <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
            {children}
        </div>
    );

    if (state.kind === "loading") return shell(<p className="text-sm text-muted" role="status">{t("sign.loading")}</p>);

    if (state.kind === "error") {
        return shell(
            <div className="window">
                <div className="window-bar"><span className="window-dot" aria-hidden="true" /><span className="flex-1 truncate">firma.err</span></div>
                <div className="window-body dither space-y-3 text-center">
                    <h1 className="font-display text-2xl tracking-tight">{t(`sign.error.${state.reason}.title`)}</h1>
                    <p className="mx-auto max-w-prose text-sm text-muted">{t(`sign.error.${state.reason}.body`)}</p>
                    {state.reason === "failed" && <button type="button" className="btn" onClick={() => window.location.reload()}>{t("sign.retry")}</button>}
                    <Link to="/" className="btn">{t("sign.home")}</Link>
                </div>
            </div>,
        );
    }

    const { view } = state;
    const done = state.kind === "done";
    const signedAt = state.kind === "done" ? (state.result?.signedAt ?? view.clientSigned?.ts) : undefined;
    const hash = state.kind === "done" ? (state.result?.hash ?? view.hash) : view.hash;
    const canDownload = done && (state.result !== null || view.status === "active");

    return shell(
        <div className="space-y-6">
            {done && (
                <section role="status" className="window">
                    <div className="window-bar"><span className="window-dot" aria-hidden="true" /><span className="flex-1 truncate">firma.ok</span></div>
                    <div className="window-body space-y-3">
                        <p className="flex items-center gap-2 font-display text-xl"><BadgeCheck size={22} strokeWidth={2.5} aria-hidden /> {t(state.result ? "sign.done.title" : "sign.done.already")}</p>
                        {signedAt && <p className="text-sm">{t("sign.done.at", { date: fmt(signedAt, lang) })}</p>}
                        <p className="break-all font-mono text-xs text-muted">SHA-256 {hash}</p>
                        {state.result && <p className="text-sm text-muted">{t("sign.done.copy")}</p>}
                        {canDownload && <a href={signPdfUrl(token)} className="btn btn-primary"><Download size={16} strokeWidth={2.5} aria-hidden /> {t("sign.done.download")}</a>}
                    </div>
                </section>
            )}

            <DocView
                blocks={view.blocks}
                title={view.title}
                cover={{ clientName: view.clientName, ownerName: view.ownerName, ...view.cover }}
                owner={{ name: view.ownerName, strokes: view.ownerSignature }}
                client={{ name: view.clientSigned?.name ?? "", date: view.clientSigned ? fmt(view.clientSigned.ts, lang) : undefined }}
            />

            {!done && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper p-3">
                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                        {view.expiresAt && <p className="hidden text-xs text-muted sm:block">{t("sign.expires", { date: fmt(view.expiresAt, lang) })}</p>}
                        <button type="button" className="btn btn-primary w-full sm:ml-auto sm:w-auto" onClick={() => { setError(""); setOpen(true); }}>
                            <PenLine size={16} strokeWidth={2.5} aria-hidden /> {t("sign.cta")}
                        </button>
                    </div>
                </div>
            )}

            <dialog
                ref={dialog}
                onClose={() => setOpen(false)}
                onClick={(e) => e.target === dialog.current && !busy && dialog.current?.close()}
                aria-labelledby={titleId}
                className="window m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
            >
                <div className="window-bar"><span className="window-dot" aria-hidden="true" /><span className="flex-1 truncate">firma.dlg</span></div>
                {open && (
                    <form noValidate onSubmit={(e) => void submit(e)} className="space-y-4 p-4 sm:p-6">
                        <h2 id={titleId} className="text-xl leading-tight">{t("sign.dialog.title")}</h2>
                        <div className="space-y-1">
                            <label htmlFor="sign-name" className="eyebrow">{t("sign.dialog.name")} *</label>
                            <input id="sign-name" className="field h-11 py-0" value={name} maxLength={120} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <p className="eyebrow">{t("sign.dialog.signature")} *</p>
                            <SignaturePad onChange={setStrokes} />
                        </div>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" />
                            <span>{t("sign.dialog.consent")}</span>
                        </label>
                        {error && <p role="alert" className="text-sm font-extrabold">{error}</p>}
                        <div className="flex flex-wrap justify-end gap-3">
                            <button type="button" className="btn" disabled={busy} onClick={() => dialog.current?.close()}>{t("sign.dialog.cancel")}</button>
                            <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={busy || !name.trim() || !strokes || !accepted}>
                                {busy ? t("sign.dialog.signing") : t("sign.dialog.submit")}
                            </button>
                        </div>
                    </form>
                )}
            </dialog>
        </div>,
    );
}
