import { useTranslation } from "react-i18next";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Upload, X } from "lucide-react";
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

interface Job { key: number; name: string; progress: number; error?: string }
interface Staged { id: number; file: File; edited?: Blob; censored: boolean; auto: boolean }
interface Editing { source: Blob; staged?: number; copyOf?: string }

function StagedThumb({ blob, alt }: { blob: Blob; alt: string }) {
    const [url, setUrl] = useState("");
    useEffect(() => {
        const u = URL.createObjectURL(blob);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [blob]);
    return url ? <img src={url} alt={alt} className="h-full w-full object-cover" /> : null;
}

async function toWebp(file: File): Promise<{ blob: Blob; name: string }> {
    if (file.type === "image/gif" || (file.type === "image/webp" && file.size <= MAX_IMAGE_BYTES)) return { blob: file, name: file.name };
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_WIDTH / bitmap.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.82));
        if (blob && blob.type === "image/webp") return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".webp" };
    } catch { /* se sube el original */ }
    return { blob: file, name: file.name };
}

const iconBtn = "flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink";
const isUrl = (v: string) => /^https:\/\/\S+$/.test(v) || /^\/\S+$/.test(v);

export default function ImageManager({ label, kind, value, onChange, max, hint, error, sensitive = false }: Props) {
    const { t } = useTranslation();
    const uid = useId();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [manual, setManual] = useState("");
    const [manualError, setManualError] = useState("");
    const current = useRef(value);
    current.current = value;
    const seq = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [staged, setStaged] = useState<Staged[]>([]);
    const [editing, setEditing] = useState<Editing | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    const isImage = kind === "image";
    const types = isImage ? IMAGE_TYPES : VIDEO_TYPES;
    const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    const noun = t(isImage ? "admin.media.images" : "admin.media.videos");
    const full = max !== undefined && value.length + jobs.length + staged.length >= max;

    const patch = (key: number, p: Partial<Job>) => setJobs((prev) => prev.map((j) => (j.key === key ? { ...j, ...p } : j)));
    const drop = (key: number) => setJobs((prev) => prev.filter((j) => j.key !== key));
    const commit = (urls: string[]) => { current.current = urls; onChange(urls); };

    async function send(blob: Blob, name: string, replace?: string) {
        const key = ++seq.current;
        setJobs((prev) => [...prev, { key, name, progress: 0 }]);
        try {
            if (blob.size > limit) return patch(key, { error: t("admin.media.overMax", { mb: limit / 1024 / 1024 }) });
            const up = await uploadMedia(blob, name, (f) => patch(key, { progress: f }));
            const at = replace === undefined ? -1 : current.current.indexOf(replace);
            if (at >= 0) commit(current.current.map((u, i) => (i === at ? up.url : u)));
            else if (max === undefined || current.current.length < max) commit([...current.current, up.url]);
            drop(key);
        } catch (err) {
            if (isUnauthorized(err)) return;
            patch(key, {
                error: err instanceof ApiError
                    ? err.status === 413 ? t("admin.media.server413")
                        : err.status === 415 ? t("admin.media.server415")
                        : err.status === 429 ? t("admin.media.server429")
                        : t("admin.media.uploadFailed")
                    : t("admin.media.uploadFailed"),
            });
        }
    }

    async function handle(file: File) {
        if (!types.includes(file.type) || file.size > 40 * 1024 * 1024) {
            const key = ++seq.current;
            const msg = !types.includes(file.type) ? t("admin.media.badType", { types: types.map((m) => m.split("/")[1]).join(", ") }) : t("admin.media.tooBig");
            return setJobs((prev) => [...prev, { key, name: file.name, progress: 0, error: msg }]);
        }
        if (isImage && file.type !== "image/gif") {
            return setStaged((prev) => [...prev, { id: ++seq.current, file, censored: false, auto: sensitive }]);
        }
        const { blob, name } = isImage ? await toWebp(file) : { blob: file, name: file.name };
        await send(blob, name);
    }

    const pendingAuto = staged.find((s) => s.auto);
    useEffect(() => {
        if (editing || !pendingAuto) return;
        setStaged((prev) => prev.map((s) => (s.id === pendingAuto.id ? { ...s, auto: false } : s)));
        setEditing({ source: pendingAuto.file, staged: pendingAuto.id });
    }, [editing, pendingAuto]);

    async function uploadStaged(s: Staged) {
        setStaged((prev) => prev.filter((x) => x.id !== s.id));
        if (s.edited) return send(s.edited, s.file.name.replace(/\.[^.]+$/, "") + (s.edited.type === "image/webp" ? ".webp" : ".jpg"));
        const { blob, name } = await toWebp(s.file);
        await send(blob, name);
    }

    const requestUpload = (s: Staged) => (sensitive && !s.censored ? setConfirmId(s.id) : void uploadStaged(s));

    async function editCopy(url: string) {
        try {
            if (new URL(url, window.location.href).origin !== window.location.origin) throw new Error("origin");
            const res = await fetch(url, { credentials: "same-origin" });
            if (!res.ok) throw new Error("fetch");
            setEditing({ source: await res.blob(), copyOf: url });
        } catch (err) {
            const key = ++seq.current;
            const msg = err instanceof Error && err.message === "origin" ? t("adminEditor.copyForeign") : t("adminEditor.copyFailed");
            setJobs((prev) => [...prev, { key, name: url, progress: 0, error: msg }]);
        }
    }

    function editorDone(blob: Blob, censored: boolean) {
        const e = editing;
        setEditing(null);
        if (!e) return;
        if (e.copyOf) return void send(blob, "edit.webp", e.copyOf);
        setStaged((prev) => prev.map((s) => (s.id === e.staged ? { ...s, edited: blob, censored } : s)));
    }

    const pick = (files: FileList | null) => {
        if (!files) return;
        const room = max === undefined ? files.length : Math.max(0, max - value.length - jobs.length - staged.length);
        [...files].slice(0, room).forEach((f) => void handle(f));
        if (inputRef.current) inputRef.current.value = "";
    };

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

    return (
        <fieldset className="space-y-3" aria-describedby={error ? `${uid}-err` : undefined}>
            <legend className="eyebrow flex w-full justify-between gap-3">
                <span>{label}</span>
                {max !== undefined && <span className="font-mono text-muted">{value.length}/{max}</span>}
            </legend>

            {value.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {value.map((url, i) => (
                        <li key={`${url}-${i}`} className="window !shadow-none">
                            <div className="dither aspect-video overflow-hidden border-b-2 border-ink">
                                {isImage
                                    ? <img src={url} alt={`${label} ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                                    : <video src={url} muted preload="metadata" className="h-full w-full object-cover" aria-label={`${label} ${i + 1}`} />}
                            </div>
                            <div className="flex items-center justify-between gap-1 p-1.5">
                                <span className="font-mono text-[11px] text-muted">{i + 1}</span>
                                <span className="flex gap-1">
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

            {staged.length > 0 && (
                <div className="space-y-2">
                    <p className="eyebrow">{t("adminEditor.staged")}</p>
                    <ul className="space-y-2">
                        {staged.map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center gap-3 border-2 border-ink p-2 text-sm">
                                <span className="dither block h-14 w-24 shrink-0 overflow-hidden border-2 border-ink"><StagedThumb blob={s.edited ?? s.file} alt={s.file.name} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">{s.file.name}</span>
                                    {s.edited && <span className="tag mt-1">{s.censored ? t("adminEditor.censored") : t("adminEditor.edited")}</span>}
                                </span>
                                <span className="flex flex-wrap gap-2">
                                    <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={() => setEditing({ source: s.file, staged: s.id })} aria-label={t("adminEditor.editFile", { name: s.file.name })}>
                                        <Pencil size={14} strokeWidth={2.5} aria-hidden /> {t("adminEditor.edit")}
                                    </button>
                                    <button type="button" className="btn btn-primary !min-h-9 !px-3 !py-1" onClick={() => requestUpload(s)} aria-label={t("adminEditor.uploadFile", { name: s.file.name })}>
                                        <Upload size={14} strokeWidth={2.5} aria-hidden /> {t("adminEditor.upload")}
                                    </button>
                                    <button type="button" className={iconBtn} onClick={() => setStaged((prev) => prev.filter((x) => x.id !== s.id))} aria-label={t("adminEditor.discard", { name: s.file.name })}><X size={14} strokeWidth={2.5} aria-hidden /></button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {jobs.length > 0 && (
                <ul className="space-y-2" aria-live="polite">
                    {jobs.map((j) => (
                        <li key={j.key} className="border-2 border-ink p-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate">{j.name}</span>
                                {j.error
                                    ? <button type="button" className="eyebrow !text-ink underline" onClick={() => drop(j.key)}>{t("admin.media.discard")}</button>
                                    : <span className="font-mono text-xs">{Math.round(j.progress * 100)}%</span>}
                            </div>
                            {j.error
                                ? <p role="alert" className="mt-1 font-extrabold">{j.error}</p>
                                : <progress value={j.progress} max={1} aria-label={t("admin.media.uploading", { name: j.name })} className="mt-1 block h-2 w-full accent-[var(--ink)]" />}
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <input ref={inputRef} id={`${uid}-file`} type="file" multiple accept={types.join(",")} className="sr-only" onChange={(e) => pick(e.target.files)} disabled={full} />
                <label htmlFor={`${uid}-file`} className={`btn ${full ? "pointer-events-none opacity-40" : ""} has-[:focus-visible]:outline-2`}>
                    <ImagePlus size={16} strokeWidth={2.5} aria-hidden /> {t("admin.media.upload", { noun })}
                </label>
                <span className="text-xs text-muted">
                    {t(isImage ? "admin.media.imageHint" : "admin.media.videoHint")}
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
                open={confirmId !== null}
                title={t("adminEditor.noCensorTitle")}
                confirmLabel={t("adminEditor.uploadAnyway")}
                destructive
                onCancel={() => setConfirmId(null)}
                onConfirm={() => {
                    const s = staged.find((x) => x.id === confirmId);
                    setConfirmId(null);
                    if (s) void uploadStaged(s);
                }}
            >
                {t("adminEditor.noCensorBody")}
            </ConfirmDialog>

            {hint && <p className="text-xs text-muted">{hint}</p>}
            {error && <p id={`${uid}-err`} role="alert" className="text-sm font-extrabold">{error}</p>}
        </fieldset>
    );
}
