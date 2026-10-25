import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Download, PenLine } from "lucide-react";
import { ApiError } from "../lib/api";
import { CLIENT_FIELD_VARS } from "../lib/contractText";
import { useDocumentMeta } from "../lib/seo";
import { getSign, postSign, signPdfUrl } from "../lib/signApi";
import Field from "../components/admin/ui/Field";
import LanguageSwitcher from "../components/LanguageSwitcher";
import DocView from "../components/contracts/DocView";
import SignaturePad from "../components/contracts/SignaturePad";
import { DOC_TYPES } from "../types/contracts";
import type { ClientData, ClientField, DocBlock, SignResult, SignView, Strokes } from "../types/contracts";

type State =
    | { kind: "loading" }
    | { kind: "error"; reason: "invalid" | "expired" | "cancelled" | "failed" }
    | { kind: "ready"; view: SignView }
    | { kind: "done"; view: SignView; result: SignResult | null };

const FIELD_ORDER: ClientField[] = ["legalName", "docType", "docNumber", "contactName", "city", "address"];
const LIMITS: Record<Exclude<ClientField, "docType" | "docNumber">, [number, number]> = { legalName: [2, 160], contactName: [2, 120], city: [2, 80], address: [5, 200] };
const AUTOCOMPLETE: Record<ClientField, string> = { legalName: "name", docType: "off", docNumber: "off", contactName: "name", city: "address-level2", address: "street-address" };
const DOC_NUMBER = /^[0-9A-Za-z][0-9A-Za-z.-]{3,29}$/;
const clean = (v: string) => v.replace(/\s+/g, " ").trim();

/** Mismas reglas que el servidor; devuelve la clave de i18n del error o null. */
function fieldError(field: ClientField, raw: string): string | null {
    const v = clean(raw);
    if (field === "docType") return null;
    if (v === "") return "required";
    if (field === "docNumber") return DOC_NUMBER.test(v) ? null : "docInvalid";
    const [min, max] = LIMITS[field];
    if (v.length < min || v.length > max) return "tooShort";
    return /[[\]{}|<>\\]/.test(v) || /^(#|- )/.test(v) ? "chars" : null;
}

/** Sustituye en vivo los huecos [[clave]] por lo que el cliente escribe, igual que hará el servidor al firmar. */
function fillBlocks(blocks: DocBlock[], data: ClientData): DocBlock[] {
    const values: Record<string, string> = {};
    for (const f of FIELD_ORDER) values[CLIENT_FIELD_VARS[f]] = clean(data[f] ?? "");
    values.ciudad_firma = values.cliente_ciudad ?? "";
    const sub = (text: string) => text.replace(/\[\[([a-z][a-z0-9_]*)\]\]/g, (all, key: string) => (key in values ? values[key] || "________" : all));
    return blocks.map((b) => (b.type === "table" ? { ...b, rows: b.rows.map((r) => r.map(sub)) } : { ...b, text: sub(b.text) }));
}

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
    const [data, setData] = useState<ClientData>({});
    const [shown, setShown] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const lang = i18n.resolvedLanguage ?? "es";

    useEffect(() => {
        let alive = true;
        getSign(token)
            .then((view) => {
                if (!alive) return;
                setName(view.contactName);
                if (view.clientForm) setData({ legalName: view.clientForm.prefill.legalName, docType: view.clientForm.prefill.docType });
                setState(view.clientSigned || view.status === "active" ? { kind: "done", view, result: null } : { kind: "ready", view });
            })
            .catch((e: unknown) => {
                if (!alive) return;
                const status = e instanceof ApiError ? e.status : 0;
                setState({ kind: "error", reason: status === 404 ? "invalid" : status === 410 ? "expired" : status === 409 ? "cancelled" : "failed" });
            });
        return () => { alive = false; };
    }, [token]);

    const form = state.kind === "ready" ? state.view.clientForm : null;
    const fields = useMemo(() => FIELD_ORDER.filter((f) => form?.fields.includes(f)), [form]);
    const errors = Object.fromEntries(fields.map((f) => [f, fieldError(f, data[f] ?? "")])) as Record<ClientField, string | null>;
    const blocks = useMemo(() => (state.kind === "ready" && form ? fillBlocks(state.view.blocks, data) : state.kind === "loading" || state.kind === "error" ? [] : state.view.blocks), [state, form, data]);

    function openSign() {
        setError("");
        const bad = fields.find((f) => errors[f]);
        if (bad) {
            setShown(true);
            document.getElementById(`sign-data-${bad}`)?.focus();
            return;
        }
        setOpen(true);
    }

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
            const clientData = Object.fromEntries(fields.map((f) => [f, clean(data[f] ?? "")])) as ClientData;
            const result = await postSign(token, { name: name.trim(), strokes, accepted: true, ...(fields.length ? { clientData } : {}) });
            setOpen(false);
            const view = await getSign(token).catch(() => state.view);
            setState({ kind: "done", view, result });
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
            <div className="mb-4 flex justify-end"><LanguageSwitcher className="!h-10 !w-10 !text-xs" /></div>
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

            {form && !done && (
                <section aria-labelledby="sign-data-title" className="window">
                    <div className="window-bar"><span className="window-dot" aria-hidden="true" /><span className="flex-1 truncate">datos.frm</span></div>
                    <div className="window-body space-y-4">
                        <div>
                            <h2 id="sign-data-title" className="text-xl leading-tight">{t("sign.data.title")}</h2>
                            <p className="mt-1 text-sm text-muted">{t("sign.data.intro")}</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {fields.map((f) => {
                                const id = `sign-data-${f}`;
                                const err = shown && errors[f] ? t(`sign.data.${errors[f]}`) : null;
                                const wide = f === "legalName" || f === "address";
                                return (
                                    <div key={f} className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
                                        {f === "docType" ? (
                                            <div className="space-y-1">
                                                <label htmlFor={id} className="eyebrow">{t(`sign.data.${f}`)} *</label>
                                                <select id={id} className="field h-11 py-0" value={data.docType ?? "CC"} onChange={(e) => setData({ ...data, docType: e.target.value })}>
                                                    {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <Field
                                                id={id} label={t(`sign.data.${f}`)} required value={data[f] ?? ""} maxLength={f === "docNumber" ? 30 : LIMITS[f][1]} autoComplete={AUTOCOMPLETE[f]}
                                                error={err ?? undefined} hint={f === "docNumber" && !err ? t("sign.data.docNumberHint") : undefined}
                                                onChange={(v) => setData({ ...data, [f]: v })} onBlur={() => setShown(true)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="border-t-2 border-dashed border-ink pt-3 text-xs text-muted">{t("sign.data.privacy")}</p>
                    </div>
                </section>
            )}

            <DocView
                blocks={blocks}
                title={view.title}
                cover={{ clientName: view.clientName, ownerName: view.ownerName, ...view.cover }}
                owner={{ name: view.ownerName, strokes: view.ownerSignature }}
                client={{ name: view.clientSigned?.name ?? "", date: view.clientSigned ? fmt(view.clientSigned.ts, lang) : undefined }}
            />

            {!done && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper p-3">
                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                        {view.expiresAt && <p className="hidden text-xs text-muted sm:block">{t("sign.expires", { date: fmt(view.expiresAt, lang) })}</p>}
                        <button type="button" className="btn btn-primary w-full sm:ml-auto sm:w-auto" onClick={openSign}>
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
                            <Field id="sign-name" label={t("sign.dialog.name")} required value={name} maxLength={120} autoComplete="name" onChange={setName} />
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
