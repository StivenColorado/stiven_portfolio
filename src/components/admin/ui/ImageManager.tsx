import { useTranslation } from "react-i18next";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, RotateCcw, Upload, X } from "lucide-react";
import { uploadMedia, isUnauthorized } from "../../../lib/adminApi";
import { ApiError } from "../../../lib/api";
import ImageEditor from "./ImageEditor";
import ConfirmDialog from "./ConfirmDialog";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const MAX_WIDTH = 1600;
const IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg", "image/gif"];
const VIDEO_TYPES = ["video/webm", "video/mp4"];

interface Props {
    label: string;
    kind: "image" | "video";
    value: string[];
    onChange: (urls: string[]) => void;
    max?: number;
    hint?: string;
    error?: string;
    sensitive?: boolean;
}

type Status = "pending" | "queued" | "uploading" | "done" | "error";
interface Item {
    id: number; name: string; file: Blob; edited?: Blob; censored: boolean; editable: boolean;
    status: Status; progress: number; error?: string; replace?: string; url?: string;
}
interface Reject { key: number; name: string; msg: string }
interface Editing { source: Blob; item?: number; copyOf?: string }
interface Confirm { ids: number[]; uncensored: number; total: number }

const PARALLEL = 2;

function Thumb({ blob, alt, video }: { blob: Blob; alt: string; video: boolean }) {
    const [url, setUrl] = useState("");
    useEffect(() => {
        const u = URL.createObjectURL(blob);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [blob]);
    if (!url) return null;
    return video
        ? <video src={url} muted preload="metadata" className="h-full w-full object-cover" aria-label={alt} />
        : <img src={url} alt={alt} className="h-full w-full object-cover" />;
}

async function toWebp(file: Blob, name: string): Promise<{ blob: Blob; name: string }> {
    if (file.type === "image/gif" || (file.type === "image/webp" && file.size <= MAX_IMAGE_BYTES)) return { blob: file, name };
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_WIDTH / bitmap.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.82));
        if (blob && blob.type === "image/webp") return { blob, name: name.replace(/\.[^.]+$/, "") + ".webp" };
    } catch { /* se sube el original */ }
    return { blob: file, name };
}

const iconBtn = "flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink";
const CARD_GRID = "grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3";
const isUrl = (v: string) => /^https:\/\/\S+$/.test(v) || /^\/\S+$/.test(v);

export default function ImageManager({ label, kind, value, onChange, max, hint, error, sensitive = false }: Props) {
    const { t } = useTranslation();
    const uid = useId();
    const [manual, setManual] = useState("");
    const [manualError, setManualError] = useState("");
    const current = useRef(value);
    current.current = value;
    const seq = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [rejects, setRejects] = useState<Reject[]>([]);
    const [notice, setNotice] = useState("");
    const [batch, setBatch] = useState({ total: 0, done: 0 });
    const [editing, setEditing] = useState<Editing | null>(null);
    const [confirm, setConfirm] = useState<Confirm | null>(null);
    const [over, setOver] = useState(false);

    const isImage = kind === "image";
    const types = isImage ? IMAGE_TYPES : VIDEO_TYPES;
    const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    const noun = t(isImage ? "admin.media.images" : "admin.media.videos");
    const full = max !== undefined && value.length + items.length >= max;
    const pending = items.filter((x) => x.status === "pending");
    const active = items.filter((x) => x.status === "queued" || x.status === "uploading");

    const patch = (id: number, p: Partial<Item>) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const removeItem = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));
    const commit = (urls: string[]) => { current.current = urls; onChange(urls); };

    function errorText(err: unknown) {
        if (!(err instanceof ApiError)) return t("admin.media.uploadFailed");
        return err.status === 413 ? t("admin.media.server413")
            : err.status === 415 ? t("admin.media.server415")
            : err.status === 429 ? t("admin.media.server429")
            : t("admin.media.uploadFailed");
    }

    async function run(it: Item) {
        try {
            let blob = it.edited ?? it.file;
            let name = it.name;
            if (isImage && !it.edited) ({ blob, name } = await toWebp(it.file, it.name));
            if (it.edited) name = it.name.replace(/\.[^.]+$/, "") + (it.edited.type === "image/webp" ? ".webp" : ".jpg");
            if (blob.size > limit) return patch(it.id, { status: "error", error: t("admin.media.overMax", { mb: limit / 1024 / 1024 }) });
            const up = await uploadMedia(blob, name, (f) => patch(it.id, { progress: f }));
            patch(it.id, { status: "done", progress: 1, url: up.url });
            setBatch((b) => ({ ...b, done: b.done + 1 }));
        } catch (err) {
            patch(it.id, { status: "error", error: isUnauthorized(err) ? undefined : errorText(err) });
        }
    }
    const runRef = useRef(run);
    runRef.current = run;

    useEffect(() => {
        const running = items.filter((x) => x.status === "uploading").length;
        const next = items.filter((x) => x.status === "queued" && x.id !== editing?.item).slice(0, PARALLEL - running);
        if (!next.length) return;
        setItems((prev) => prev.map((x) => (next.some((n) => n.id === x.id) ? { ...x, status: "uploading", progress: 0 } : x)));
        next.forEach((n) => void runRef.current(n));
    }, [items, editing]);

    useEffect(() => {
        const ready: Item[] = [];
        let blocked = false;
        for (const x of items) {
            if (x.status === "done") { if (!blocked) ready.push(x); }
            else if (x.status === "queued" || x.status === "uploading") blocked = true;
        }
        if (!ready.length) return;
        const urls = [...current.current];
        for (const r of ready) {
            const at = r.replace ? urls.indexOf(r.replace) : -1;
            if (at >= 0) urls[at] = r.url as string;
            else if (max === undefined || urls.length < max) urls.push(r.url as string);
        }
        current.current = urls;
        onChange(urls);
        setItems((prev) => prev.filter((x) => !ready.some((r) => r.id === x.id)));
    }, [items, max, onChange]);

    const idle = active.length === 0;
    useEffect(() => {
        if (idle) setBatch((b) => (b.total === 0 ? b : { total: 0, done: 0 }));
    }, [idle]);

    function queue(ids: number[]) {
        if (!ids.length) return;
        setItems((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, status: "queued", progress: 0, error: undefined } : x)));
        setBatch((b) => ({ ...b, total: b.total + ids.length }));
    }

    const reject = (name: string, msg: string) => setRejects((prev) => [...prev, { key: ++seq.current, name, msg }]);

    function addFiles(list: FileList | File[]) {
        const files = [...list];
        if (!files.length) return;
        const room = max === undefined ? files.length : Math.max(0, max - value.length - items.length);
        const fresh: Item[] = [];
        let ignored = 0;
        for (const f of files) {
            const typeOk = types.includes(f.type);
            const sizeOk = f.size <= (isImage ? 40 * 1024 * 1024 : MAX_VIDEO_BYTES);
            if (!typeOk) reject(f.name, t("admin.media.badType", { types: types.map((m) => m.split("/")[1]).join(", ") }));
            else if (!sizeOk) reject(f.name, t("admin.media.tooBig"));
            else if (fresh.length >= room) ignored++;
            else {
                const editable = isImage && f.type !== "image/gif";
                const hold = sensitive && editable;
                fresh.push({ id: ++seq.current, name: f.name, file: f, censored: false, editable, status: hold ? "pending" : "queued", progress: 0 });
            }
        }
        setNotice(ignored ? t("adminUpload.ignored", { count: ignored }) : "");
        if (!fresh.length) return;
        setItems((prev) => [...prev, ...fresh]);
        const auto = fresh.filter((x) => x.status === "queued").length;
        if (auto) setBatch((b) => ({ ...b, total: b.total + auto }));
        if (files.length === 1 && fresh[0].status === "pending") setEditing({ source: fresh[0].file, item: fresh[0].id });
    }

    const pick = (files: FileList | null) => {
        if (files) addFiles(files);
        if (inputRef.current) inputRef.current.value = "";
    };

    const requestOne = (it: Item) => (sensitive && it.editable && !it.censored ? setConfirm({ ids: [it.id], uncensored: 1, total: 1 }) : queue([it.id]));

    function requestAll() {
        const unc = pending.filter((x) => x.editable && !x.censored).length;
        const ids = pending.map((x) => x.id);
        if (sensitive && unc > 0) setConfirm({ ids, uncensored: unc, total: pending.length });
        else queue(ids);
    }

    async function editCopy(url: string) {
        try {
            if (new URL(url, window.location.href).origin !== window.location.origin) throw new Error("origin");
            const res = await fetch(url, { credentials: "same-origin" });
            if (!res.ok) throw new Error("fetch");
            setEditing({ source: await res.blob(), copyOf: url });
        } catch (err) {
            reject(url, err instanceof Error && err.message === "origin" ? t("adminEditor.copyForeign") : t("adminEditor.copyFailed"));
        }
    }

    function editorDone(blob: Blob, censored: boolean) {
        const e = editing;
        setEditing(null);
        if (!e) return;
        if (e.copyOf) {
            const id = ++seq.current;
            setItems((prev) => [...prev, { id, name: "edit.webp", file: blob, edited: blob, censored, editable: false, status: "queued", progress: 0, replace: e.copyOf }]);
            setBatch((b) => ({ ...b, total: b.total + 1 }));
            return;
        }
        patch(e.item as number, { edited: blob, censored });
    }

    const move = (i: number, d: -1 | 1) => {
        const next = [...value];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        commit(next);
    };

    const addUrl = () => {
        const v = manual.trim();
        if (!isUrl(v)) return setManualError(t("admin.media.urlInvalid"));
        if (full) return setManualError(t("admin.media.limit"));
        commit([...value, v]);
        setManual("");
        setManualError("");
    };

    const hasFiles = (e: React.DragEvent) => [...e.dataTransfer.types].includes("Files");
    const dropProps = full ? {} : {
        onDragEnter: (e: React.DragEvent) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } },
        onDragOver: (e: React.DragEvent) => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } },
        onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); },
        onDrop: (e: React.DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); },
    };

    const sumProgress = items.reduce((a, x) => a + (x.status === "uploading" ? x.progress : 0), 0);
    const overall = batch.total ? Math.min(1, (batch.done + sumProgress) / batch.total) : 0;
    const smallBtn = "btn !min-h-8 min-w-0 !px-2 !py-0.5 !text-xs !shadow-none";

    return (
        <fieldset className="min-w-0 max-w-full space-y-3" aria-describedby={error ? `${uid}-err` : undefined}>
            <legend className="eyebrow flex w-full justify-between gap-3">
                <span>{label}</span>
                {max !== undefined && <span className="font-mono text-muted">{value.length}/{max}</span>}
            </legend>

            {value.length > 0 && (
                <ul className={CARD_GRID}>
                    {value.map((url, i) => (
                        <li key={`${url}-${i}`} className="window min-w-0 overflow-hidden !shadow-none">
                            <div className="dither relative aspect-video overflow-hidden border-b-2 border-ink">
                                <span className="absolute left-0 top-0 z-10 bg-ink px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-paper">{i + 1}</span>
                                {isImage
                                    ? <img src={url} alt={`${label} ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                                    : <video src={url} muted preload="metadata" className="h-full w-full object-cover" aria-label={`${label} ${i + 1}`} />}
                            </div>
                            <div className="p-1">
                                <span className="flex items-center justify-center gap-0.5">
                                    {isImage && <button type="button" className={iconBtn} onClick={() => void editCopy(url)} aria-label={t("adminEditor.editCopyN", { label, n: i + 1 })} title={t("adminEditor.editCopy")}><Pencil size={14} strokeWidth={2.5} aria-hidden /></button>}
                                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("admin.media.up", { label, n: i + 1 })}><ArrowUp size={14} strokeWidth={2.5} aria-hidden /></button>
                                    <button type="button" className={iconBtn} disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={t("admin.media.down", { label, n: i + 1 })}><ArrowDown size={14} strokeWidth={2.5} aria-hidden /></button>
                                    <button type="button" className={iconBtn} onClick={() => commit(value.filter((_, j) => j !== i))} aria-label={t("admin.media.remove", { label, n: i + 1 })}><X size={14} strokeWidth={2.5} aria-hidden /></button>
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {(pending.length > 0 || (active.length > 0 && batch.total > 1)) && (
                <div className="space-y-2 border-2 border-ink p-2">
                    {pending.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="eyebrow">{t("adminEditor.staged")}</p>
                            <span className="flex flex-wrap gap-2">
                                <button type="button" className="btn btn-primary !min-h-9 !px-3 !py-1" onClick={requestAll}>
                                    <Upload size={14} strokeWidth={2.5} aria-hidden /> {t("adminUpload.uploadAll", { n: pending.length })}
                                </button>
                                <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={() => setItems((prev) => prev.filter((x) => x.status !== "pending"))}>{t("adminUpload.discardAll")}</button>
                            </span>
                        </div>
                    )}
                    {active.length > 0 && batch.total > 1 && (
                        <div aria-live="polite">
                            <div className="flex justify-between font-mono text-xs"><span>{t("adminUpload.uploadingN", { done: batch.done, total: batch.total })}</span><span>{Math.round(overall * 100)}%</span></div>
                            <progress value={overall} max={1} aria-label={t("adminUpload.uploadingN", { done: batch.done, total: batch.total })} className="mt-1 block h-2 w-full accent-[var(--ink)]" />
                        </div>
                    )}
                </div>
            )}

            {items.length > 0 && (
                <ul className={CARD_GRID}>
                    {items.map((x) => {
                        const busy = x.status === "uploading" || x.status === "done";
                        const showUncensored = sensitive && x.editable && !x.censored;
                        return (
                            <li key={x.id} className="window min-w-0 overflow-hidden !shadow-none">
                                <div className="dither relative aspect-video overflow-hidden border-b-2 border-ink">
                                    <Thumb blob={x.edited ?? x.file} alt={x.name} video={!isImage} />
                                    {busy && <span className="absolute bottom-1 right-1 bg-paper px-1 font-mono text-[11px] text-ink">{Math.round(x.progress * 100)}%</span>}
                                </div>
                                <div className="flex flex-1 flex-col gap-1.5 p-1.5 text-xs">
                                    <span className="block truncate font-mono" title={x.name}>{x.name}</span>
                                    <span className="flex flex-wrap gap-1">
                                        {x.edited && <span className="tag">{x.censored ? t("adminEditor.censored") : t("adminEditor.edited")}</span>}
                                        {showUncensored && <span className="tag">{t("adminUpload.uncensored")}</span>}
                                        {x.status === "queued" && <span className="tag">{t("adminUpload.queued")}</span>}
                                    </span>
                                    {busy && <progress value={x.progress} max={1} aria-label={t("admin.media.uploading", { name: x.name })} className="block h-2 w-full accent-[var(--ink)]" />}
                                    {x.status === "error" && x.error && <p role="alert" className="font-extrabold">{x.error}</p>}
                                    <span className="mt-auto flex flex-wrap items-center gap-1">
                                        {x.editable && !busy && (
                                            <button type="button" className={smallBtn} onClick={() => setEditing({ source: x.file, item: x.id })} aria-label={t(sensitive ? "adminUpload.censorFile" : "adminEditor.editFile", { name: x.name })}>
                                                <Pencil size={13} strokeWidth={2.5} aria-hidden /> {t(sensitive ? "adminUpload.censor" : "adminEditor.edit")}
                                            </button>
                                        )}
                                        {x.status === "pending" && (
                                            <button type="button" className={`${smallBtn} btn-primary`} onClick={() => requestOne(x)} aria-label={t("adminEditor.uploadFile", { name: x.name })}>
                                                <Upload size={13} strokeWidth={2.5} aria-hidden /> {t("adminEditor.upload")}
                                            </button>
                                        )}
                                        {x.status === "error" && (
                                            <button type="button" className={`${smallBtn} btn-primary`} onClick={() => queue([x.id])} aria-label={t("adminUpload.retryFile", { name: x.name })}>
                                                <RotateCcw size={13} strokeWidth={2.5} aria-hidden /> {t("adminUpload.retry")}
                                            </button>
                                        )}
                                        {!busy && (
                                            <button type="button" className={iconBtn} onClick={() => removeItem(x.id)} aria-label={t("adminEditor.discard", { name: x.name })}><X size={14} strokeWidth={2.5} aria-hidden /></button>
                                        )}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {rejects.length > 0 && (
                <ul className="space-y-2" aria-live="polite">
                    {rejects.map((r) => (
                        <li key={r.key} className="border-2 border-ink p-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate">{r.name}</span>
                                <button type="button" className="eyebrow !text-ink underline" onClick={() => setRejects((prev) => prev.filter((x) => x.key !== r.key))}>{t("admin.media.discard")}</button>
                            </div>
                            <p role="alert" className="mt-1 font-extrabold">{r.msg}</p>
                        </li>
                    ))}
                </ul>
            )}

            {notice && (
                <p role="status" className="flex items-start justify-between gap-2 border-2 border-dashed border-ink p-2 text-sm">
                    <span>{notice}</span>
                    <button type="button" className={iconBtn} onClick={() => setNotice("")} aria-label={t("adminUpload.dismiss")}><X size={14} strokeWidth={2.5} aria-hidden /></button>
                </p>
            )}

            <div
                {...dropProps}
                className={`relative flex flex-wrap items-center gap-3 border-2 border-dashed border-ink p-3 ${over ? "bg-ink text-paper" : ""}`}
            >
                <input ref={inputRef} id={`${uid}-file`} type="file" multiple accept={types.join(",")} className="sr-only" onChange={(e) => pick(e.target.files)} disabled={full} />
                <label htmlFor={`${uid}-file`} className={`btn ${over ? "!bg-paper !text-ink" : ""} ${full ? "pointer-events-none opacity-40" : ""} has-[:focus-visible]:outline-2`}>
                    <ImagePlus size={16} strokeWidth={2.5} aria-hidden /> {t("admin.media.upload", { noun })}
                </label>
                <span className={`min-w-[12rem] flex-1 text-xs ${over ? "" : "text-muted"}`}>
                    {over ? t("adminUpload.dropActive") : <><span className="block">{t(isImage ? "admin.media.imageHint" : "admin.media.videoHint")}</span><span className="block">{t("adminUpload.dropHint")}</span></>}
                </span>
            </div>

            <div className="space-y-1">
                <div className="flex gap-2">
                    <input
                        value={manual}
                        onChange={(e) => { setManual(e.target.value); setManualError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                        placeholder={t("admin.media.pasteUrl")}
                        aria-label={t("admin.media.manualUrl", { kind: t(isImage ? "admin.media.kindImage" : "admin.media.kindVideo") })}
                        aria-invalid={manualError ? true : undefined}
                        className="field min-w-0 flex-1 !py-1.5"
                    />
                    <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={addUrl} disabled={!manual.trim() || full}>{t("admin.media.useUrl")}</button>
                </div>
                {manualError && <p role="alert" className="text-sm font-extrabold">{manualError}</p>}
            </div>

            {editing && (
                <ImageEditor
                    source={editing.source}
                    sensitive={sensitive}
                    onDone={(r) => editorDone(r.blob, r.censored)}
                    onCancel={() => setEditing(null)}
                />
            )}
            <ConfirmDialog
                open={confirm !== null}
                title={confirm && confirm.total > 1 ? t("adminUpload.confirmTitle", { n: confirm.uncensored, m: confirm.total }) : t("adminEditor.noCensorTitle")}
                confirmLabel={confirm && confirm.total > 1 ? t("adminUpload.confirmAll") : t("adminEditor.uploadAnyway")}
                destructive
                onCancel={() => setConfirm(null)}
                onConfirm={() => {
                    const c = confirm;
                    setConfirm(null);
                    if (c) queue(c.ids);
                }}
            >
                <p>{confirm && confirm.total > 1 ? t("adminUpload.confirmBody") : t("adminEditor.noCensorBody")}</p>
                {confirm && confirm.uncensored < confirm.total && (
                    <button
                        type="button"
                        className="btn mt-3"
                        onClick={() => {
                            const c = confirm;
                            setConfirm(null);
                            queue(pending.filter((x) => c.ids.includes(x.id) && (!x.editable || x.censored)).map((x) => x.id));
                        }}
                    >
                        {t("adminUpload.onlyCensored")}
                    </button>
                )}
            </ConfirmDialog>

            {hint && <p className="text-xs text-muted">{hint}</p>}
            {error && <p id={`${uid}-err`} role="alert" className="text-sm font-extrabold">{error}</p>}
        </fieldset>
    );
}
