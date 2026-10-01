import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardPaste, Copy, CopyPlus, Plus, Redo2, Trash2, Undo2, Wand2 } from "lucide-react";

const MAX_WIDTH = 1600;
const QUALITY = 0.82;
const MIN_CROP = 16;
const MIN_ZONE = 8;
const LOW_BLUR = 35;
const MIN_DRAW_CSS = 12;
const DUP_OFFSET = 16;
const PREFS_KEY = "adminEditor.censorPrefs";
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

type Handle = (typeof HANDLES)[number];
type Mode = "blur" | "pixelate" | "box";
type Tab = "crop" | "censor";
interface Rect { x: number; y: number; w: number; h: number }
interface Zone extends Rect { id: number; mode: Mode; blur: number; block: number }
interface Prefs { mode: Mode; blur: number; block: number }
interface ClipZone extends Rect { mode: Mode; blur: number; block: number }
interface Doc { crop: Rect; zones: Zone[] }
interface Drag { target: "crop" | number; handle: Handle | "move"; px: number; py: number; rect: Rect; before: Doc }
type Source = ImageBitmap;

export interface ImageEditorResult { blob: Blob; censored: boolean }
interface Props {
    source: Blob;
    sensitive?: boolean;
    onDone: (result: ImageEditorResult) => void;
    onCancel: () => void;
}

const RATIOS: { key: string; value: number | null }[] = [
    { key: "free", value: null },
    { key: "16:9", value: 16 / 9 },
    { key: "4:3", value: 4 / 3 },
    { key: "1:1", value: 1 },
];

let clipboard: ClipZone[] = [];

function loadPrefs(fallback: Mode): Prefs {
    const base: Prefs = { mode: fallback, blur: 80, block: 16 };
    try {
        const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<Prefs> | null;
        if (!raw) return base;
        return {
            mode: raw.mode === "blur" || raw.mode === "pixelate" || raw.mode === "box" ? raw.mode : base.mode,
            blur: typeof raw.blur === "number" ? clamp(raw.blur, 0, 100) : base.blur,
            block: typeof raw.block === "number" ? clamp(raw.block, 4, 64) : base.block,
        };
    } catch {
        return base;
    }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const rounded = (x: number, y: number, w: number, h: number): Rect => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });

let blurSupport: boolean | undefined;
function canBlur(): boolean {
    if (blurSupport !== undefined) return blurSupport;
    try {
        if (!("filter" in CanvasRenderingContext2D.prototype)) return (blurSupport = false);
        const a = document.createElement("canvas");
        a.width = a.height = 8;
        const ax = a.getContext("2d")!;
        ax.fillStyle = "#fff";
        ax.fillRect(0, 0, 8, 8);
        ax.fillStyle = "#000";
        ax.fillRect(3, 3, 2, 2);
        const b = document.createElement("canvas");
        b.width = b.height = 8;
        const bx = b.getContext("2d")!;
        bx.filter = "blur(2px)";
        bx.drawImage(a, 0, 0);
        blurSupport = bx.getImageData(3, 3, 1, 1).data[0] > 20;
    } catch {
        blurSupport = false;
    }
    return blurSupport;
}

function resizeRect(r: Rect, h: Handle, dx: number, dy: number, W: number, H: number, min: number, ratio: number | null): Rect {
    let l = r.x, t = r.y, rt = r.x + r.w, b = r.y + r.h;
    const west = h.includes("w"), east = h.includes("e"), north = h.includes("n"), south = h.includes("s");
    if (west) l = clamp(l + dx, 0, rt - min);
    if (east) rt = clamp(rt + dx, l + min, W);
    if (north) t = clamp(t + dy, 0, b - min);
    if (south) b = clamp(b + dy, t + min, H);
    if (!ratio) return rounded(l, t, rt - l, b - t);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    let x: number, y: number, w: number, hh: number;
    if ((west || east) && (north || south)) {
        const ax = west ? r.x + r.w : r.x, ay = north ? r.y + r.h : r.y;
        const maxW = Math.min(west ? ax : W - ax, (north ? ay : H - ay) * ratio);
        w = clamp(Math.max(rt - l, (b - t) * ratio), min, maxW);
        hh = w / ratio;
        x = west ? ax - w : ax;
        y = north ? ay - hh : ay;
    } else if (west || east) {
        w = rt - l;
        hh = w / ratio;
        const maxH = 2 * Math.min(cy, H - cy);
        if (hh > maxH) { hh = maxH; w = hh * ratio; }
        x = west ? r.x + r.w - w : r.x;
        y = cy - hh / 2;
    } else {
        hh = b - t;
        w = hh * ratio;
        const maxW = 2 * Math.min(cx, W - cx);
        if (w > maxW) { w = maxW; hh = w / ratio; }
        y = north ? r.y + r.h - hh : r.y;
        x = cx - w / 2;
    }
    return rounded(clamp(x, 0, W - w), clamp(y, 0, H - hh), w, hh);
}

function pixelate(ctx: CanvasRenderingContext2D, base: HTMLCanvasElement, x: number, y: number, w: number, h: number, block: number) {
    const tw = Math.max(1, Math.ceil(w / block)), th = Math.max(1, Math.ceil(h / block));
    const tmp = document.createElement("canvas");
    tmp.width = tw;
    tmp.height = th;
    const tx = tmp.getContext("2d")!;
    tx.imageSmoothingQuality = "high";
    tx.drawImage(base, x, y, w, h, 0, 0, tw, th);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, tw, th, x, y, tw * block, th * block);
    ctx.restore();
}

function blurZone(ctx: CanvasRenderingContext2D, base: HTMLCanvasElement, x: number, y: number, w: number, h: number, radius: number) {
    const one = document.createElement("canvas");
    one.width = one.height = 1;
    const ox = one.getContext("2d")!;
    ox.drawImage(base, x, y, w, h, 0, 0, 1, 1);
    const [r, g, b] = ox.getImageData(0, 0, 1, 1).data;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = `rgb(${r} ${g} ${b})`;
    ctx.fillRect(x, y, w, h);
    const pad = Math.ceil(radius * 3);
    const ex = Math.max(0, x - pad), ey = Math.max(0, y - pad);
    const ew = Math.min(base.width, x + w + pad) - ex, eh = Math.min(base.height, y + h + pad) - ey;
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(base, ex, ey, ew, eh, ex, ey, ew, eh);
    ctx.filter = "none";
    ctx.restore();
}

function compose(src: Source, crop: Rect, zones: Zone[], outW: number): HTMLCanvasElement {
    const s = outW / crop.w;
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = Math.max(1, Math.round(crop.h * s));
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    if (!zones.length) return canvas;
    const base = document.createElement("canvas");
    base.width = canvas.width;
    base.height = canvas.height;
    base.getContext("2d")!.drawImage(canvas, 0, 0);
    const blurOk = canBlur();
    for (const z of zones) {
        const x0 = Math.max(0, Math.floor((z.x - crop.x) * s)), y0 = Math.max(0, Math.floor((z.y - crop.y) * s));
        const x1 = Math.min(canvas.width, Math.ceil((z.x + z.w - crop.x) * s)), y1 = Math.min(canvas.height, Math.ceil((z.y + z.h - crop.y) * s));
        const w = x1 - x0, h = y1 - y0;
        if (w < 1 || h < 1) continue;
        if (z.mode === "box") {
            ctx.fillStyle = "#000";
            ctx.fillRect(x0, y0, w, h);
        } else if (z.mode === "pixelate") {
            pixelate(ctx, base, x0, y0, w, h, Math.max(2, z.block * s));
        } else {
            const radius = Math.max(1, (z.blur / 100) * Math.min(z.w, z.h) * s * 0.5);
            if (blurOk) blurZone(ctx, base, x0, y0, w, h, radius);
            else pixelate(ctx, base, x0, y0, w, h, Math.max(4, radius));
        }
    }
    return canvas;
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));

async function exportBlob(src: Source, doc: Doc): Promise<Blob> {
    const canvas = compose(src, doc.crop, doc.zones, Math.min(doc.crop.w, MAX_WIDTH));
    const webp = await toBlob(canvas, "image/webp", QUALITY);
    if (webp && webp.type === "image/webp") return webp;
    const fallback = await toBlob(canvas, "image/jpeg", 0.85);
    if (!fallback) throw new Error("export");
    return fallback;
}

const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const handleStyle = (h: Handle) => ({
    left: h.includes("w") ? "0%" : h.includes("e") ? "100%" : "50%",
    top: h.includes("n") ? "0%" : h.includes("s") ? "100%" : "50%",
});
const handleCursor: Record<Handle, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

const tabBtn = "btn !min-h-9 !px-3 !py-1 flex-1 justify-center";
const tabOn = "!bg-ink !text-paper";
const actBtn = "btn !min-h-9 !flex-col !gap-0.5 !px-1.5 !py-1 text-center text-xs leading-tight disabled:opacity-50 pointer-coarse:!min-h-14";
const sliderCls = "block w-full accent-[var(--ink)]";

export default function ImageEditor({ source, sensitive, onDone, onCancel }: Props) {
    const { t } = useTranslation();
    const uid = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [img, setImg] = useState<Source | null>(null);
    const [failed, setFailed] = useState(false);
    const [doc, setDoc] = useState<Doc | null>(null);
    const [hist, setHist] = useState<{ past: Doc[]; future: Doc[] }>({ past: [], future: [] });
    const [tab, setTab] = useState<Tab>(sensitive ? "censor" : "crop");
    const [sel, setSel] = useState<number[]>([]);
    const [draft, setDraft] = useState<Rect | null>(null);
    const [clipCount, setClipCount] = useState(clipboard.length);
    const [ratio, setRatio] = useState<string>("free");
    const [box, setBox] = useState({ w: 0, h: 0 });
    const [sheet, setSheet] = useState(true);
    const [info, setInfo] = useState<{ w: number; h: number; bytes: number } | null>(null);
    const [busy, setBusy] = useState(false);
    const docRef = useRef<Doc | null>(null);
    const dragRef = useRef<Drag | null>(null);
    const editBefore = useRef<Doc | null>(null);
    const nextId = useRef(1);
    const prefsRef = useRef<Prefs>(loadPrefs(sensitive ? "box" : "blur"));
    const drawRef = useRef<{ ox: number; oy: number } | null>(null);
    const draftRef = useRef<Rect | null>(null);

    const setLive = useCallback((d: Doc) => { docRef.current = d; setDoc(d); }, []);
    const commitFrom = useCallback((before: Doc, after: Doc | null = docRef.current) => {
        if (JSON.stringify(before) === JSON.stringify(after)) return;
        setHist((h) => ({ past: [...h.past.slice(-49), before], future: [] }));
    }, []);
    const apply = useCallback((next: Doc) => {
        const before = docRef.current;
        if (before) commitFrom(before, next);
        setLive(next);
    }, [commitFrom, setLive]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
        let alive = true;
        let bitmap: ImageBitmap | null = null;
        createImageBitmap(source).then((b) => {
            if (!alive) return b.close();
            bitmap = b;
            setImg(b);
            setLive({ crop: { x: 0, y: 0, w: b.width, h: b.height }, zones: [] });
        }).catch(() => alive && setFailed(true));
        return () => { alive = false; bitmap?.close(); };
    }, [source, setLive]);

    useLayoutEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [img, sheet]);

    const W = img?.width ?? 1, H = img?.height ?? 1;
    const pad = 24;
    const fit = img ? Math.max(0.01, Math.min(4, Math.min((box.w - pad) / W, (box.h - pad) / H))) : 1;
    const cssW = Math.max(1, Math.floor(W * fit)), cssH = Math.max(1, Math.floor(H * fit));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !img || !doc || box.w === 0) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const outW = Math.max(1, Math.round(cssW * dpr));
        const out = compose(img, { x: 0, y: 0, w: W, h: H }, doc.zones, outW);
        canvas.width = out.width;
        canvas.height = out.height;
        canvas.getContext("2d")!.drawImage(out, 0, 0);
    }, [img, doc, cssW, box.w, W, H]);

    useEffect(() => {
        if (!img || !doc) return;
        let alive = true;
        const id = window.setTimeout(() => {
            exportBlob(img, doc).then((b) => {
                if (alive) setInfo({ w: Math.min(doc.crop.w, MAX_WIDTH), h: Math.round(doc.crop.h * Math.min(1, MAX_WIDTH / doc.crop.w)), bytes: b.size });
            }).catch(() => undefined);
        }, 300);
        return () => { alive = false; clearTimeout(id); };
    }, [img, doc]);

    const zones = doc?.zones ?? [];
    const selected = zones.find((z) => z.id === sel[sel.length - 1]) ?? null;
    const selZones = zones.filter((z) => sel.includes(z.id));
    const lowBlur = zones.some((z) => z.mode === "blur" && z.blur < LOW_BLUR);
    const ratioValue = RATIOS.find((r) => r.key === ratio)?.value ?? null;

    const remember = (p: Partial<Zone>) => {
        const { mode, blur, block } = p;
        prefsRef.current = { ...prefsRef.current, ...(mode && { mode }), ...(blur !== undefined && { blur }), ...(block !== undefined && { block }) };
        try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefsRef.current)); } catch { /* sin almacenamiento */ }
    };
    const patchZones = (ids: number[], p: Partial<Zone>, live = false) => {
        if (!doc) return;
        const next = { ...doc, zones: doc.zones.map((z) => (ids.includes(z.id) ? { ...z, ...p } : z)) };
        remember(p);
        if (live) {
            editBefore.current ??= docRef.current;
            setLive(next);
        } else apply(next);
    };
    const toggleSel = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const endEdit = () => {
        if (editBefore.current) commitFrom(editBefore.current);
        editBefore.current = null;
    };

    const newZone = (r: Rect): Zone => ({ id: nextId.current++, ...r, ...prefsRef.current });
    const addZone = () => {
        if (!doc) return;
        const c = doc.crop;
        const w = Math.max(MIN_ZONE, Math.round(c.w * 0.35)), h = Math.max(MIN_ZONE, Math.round(c.h * 0.18));
        const zone = newZone({ x: Math.round(c.x + (c.w - w) / 2), y: Math.round(c.y + (c.h - h) / 2), w, h });
        apply({ ...doc, zones: [...doc.zones, zone] });
        setSel([zone.id]);
        setTab("censor");
    };
    const removeZones = (ids: number[]) => {
        if (!doc || !ids.length) return;
        apply({ ...doc, zones: doc.zones.filter((z) => !ids.includes(z.id)) });
        setSel([]);
    };
    const addCopies = (items: Zone[]) => {
        if (!doc || !items.length) return;
        apply({ ...doc, zones: [...doc.zones, ...items] });
        setSel(items.map((z) => z.id));
        setTab("censor");
    };
    const duplicate = () => {
        if (!selZones.length) return;
        addCopies(selZones.map((z) => ({ ...z, id: nextId.current++, x: clamp(z.x + DUP_OFFSET, 0, W - z.w), y: clamp(z.y + DUP_OFFSET, 0, H - z.h) })));
    };
    const copyZones = () => {
        const src = selZones.length ? selZones : zones;
        if (!src.length) return;
        clipboard = src.map((z) => ({ x: z.x / W, y: z.y / H, w: z.w / W, h: z.h / H, mode: z.mode, blur: z.blur, block: z.block }));
        setClipCount(clipboard.length);
    };
    const pasteZones = () => {
        if (!doc || !clipboard.length) return;
        const occupied = (x: number, y: number) => doc.zones.some((z) => z.x === x && z.y === y);
        let shift = 0;
        const place = (c: ClipZone) => {
            const w = clamp(Math.round(c.w * W), MIN_ZONE, W), h = clamp(Math.round(c.h * H), MIN_ZONE, H);
            return { w, h, x: clamp(Math.round(c.x * W), 0, W - w), y: clamp(Math.round(c.y * H), 0, H - h) };
        };
        while (shift < 40 && clipboard.some((c) => { const r = place(c); return occupied(clamp(r.x + shift, 0, W - r.w), clamp(r.y + shift, 0, H - r.h)); })) shift += DUP_OFFSET;
        addCopies(clipboard.map((c) => {
            const r = place(c);
            return { id: nextId.current++, ...r, x: clamp(r.x + shift, 0, W - r.w), y: clamp(r.y + shift, 0, H - r.h), mode: c.mode, blur: c.blur, block: c.block };
        }));
    };
    const applyToAll = () => {
        if (!selected) return;
        patchZones(zones.map((z) => z.id), { mode: selected.mode, blur: selected.blur, block: selected.block });
    };
    const chooseRatio = (key: string) => {
        setRatio(key);
        const r = RATIOS.find((x) => x.key === key)?.value;
        if (!doc || !r) return;
        const c = doc.crop;
        const w = Math.min(c.w, c.h * r), h = w / r;
        apply({ ...doc, crop: rounded(c.x + (c.w - w) / 2, c.y + (c.h - h) / 2, w, h) });
    };
    const resetCrop = () => {
        if (!doc) return;
        setRatio("free");
        apply({ ...doc, crop: { x: 0, y: 0, w: W, h: H } });
    };

    const undo = () => {
        const cur = docRef.current;
        if (!cur || !hist.past.length) return;
        const prev = hist.past[hist.past.length - 1];
        setHist({ past: hist.past.slice(0, -1), future: [cur, ...hist.future] });
        setLive(prev);
        setSel((s) => s.filter((id) => prev.zones.some((z) => z.id === id)));
    };
    const redo = () => {
        const cur = docRef.current;
        if (!cur || !hist.future.length) return;
        const [next, ...rest] = hist.future;
        setHist({ past: [...hist.past, cur], future: rest });
        setLive(next);
        setSel((s) => s.filter((id) => next.zones.some((z) => z.id === id)));
    };

    const nudge = (dx: number, dy: number) => {
        if (!doc) return;
        if (tab === "censor" && selZones.length) {
            apply({ ...doc, zones: doc.zones.map((z) => (sel.includes(z.id) ? { ...z, x: clamp(z.x + dx, 0, W - z.w), y: clamp(z.y + dy, 0, H - z.h) } : z)) });
        } else if (tab === "crop") {
            const c = doc.crop;
            apply({ ...doc, crop: { ...c, x: clamp(c.x + dx, 0, W - c.w), y: clamp(c.y + dy, 0, H - c.h) } });
        }
    };

    const onKeyDown = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            return e.shiftKey ? redo() : undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
            e.preventDefault();
            return redo();
        }
        if (typing) return;
        const mod = e.ctrlKey || e.metaKey;
        if (mod && tab === "censor") {
            const k = e.key.toLowerCase();
            if (k === "a") { e.preventDefault(); return setSel(zones.map((z) => z.id)); }
            if (k === "d") { e.preventDefault(); return duplicate(); }
            if (k === "c") { e.preventDefault(); return copyZones(); }
            if (k === "v") { e.preventDefault(); return pasteZones(); }
        }
        if ((e.key === "Delete" || e.key === "Backspace") && tab === "censor" && selZones.length) {
            e.preventDefault();
            return removeZones(sel);
        }
        const step = e.shiftKey ? 10 : 1;
        const dir: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (dir[e.key] && (tab === "crop" || selZones.length)) {
            e.preventDefault();
            nudge(...dir[e.key]);
        }
    };

    const keyRef = useRef(onKeyDown);
    keyRef.current = onKeyDown;
    useEffect(() => {
        const fn = (e: KeyboardEvent) => keyRef.current(e);
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, []);

    const dragProps = (target: "crop" | number, handle: Handle | "move") => ({
        onPointerDown: (e: RPointerEvent<HTMLElement>) => {
            if (!doc || e.button > 0) return;
            e.preventDefault();
            e.stopPropagation();
            if (target !== "crop" && handle === "move" && (e.shiftKey || e.ctrlKey || e.metaKey)) return toggleSel(target);
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = target === "crop" ? doc.crop : doc.zones.find((z) => z.id === target)!;
            dragRef.current = { target, handle, px: e.clientX, py: e.clientY, rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, before: doc };
            if (target !== "crop") setSel((s) => (s.includes(target) ? s : [target]));
        },
        onPointerMove: (e: RPointerEvent<HTMLElement>) => {
            const d = dragRef.current;
            const cur = docRef.current;
            if (!d || !cur || d.target !== (target)) return;
            const dx = (e.clientX - d.px) / fit, dy = (e.clientY - d.py) / fit;
            const isCrop = d.target === "crop";
            const min = isCrop ? MIN_CROP : MIN_ZONE;
            const next = d.handle === "move"
                ? rounded(clamp(d.rect.x + dx, 0, W - d.rect.w), clamp(d.rect.y + dy, 0, H - d.rect.h), d.rect.w, d.rect.h)
                : resizeRect(d.rect, d.handle, dx, dy, W, H, min, isCrop ? ratioValue : null);
            setLive(isCrop ? { ...cur, crop: next } : { ...cur, zones: cur.zones.map((z) => (z.id === d.target ? { ...z, ...next } : z)) });
        },
        onPointerUp: () => {
            const d = dragRef.current;
            dragRef.current = null;
            if (d) commitFrom(d.before);
        },
        onPointerCancel: () => {
            const d = dragRef.current;
            dragRef.current = null;
            if (d) commitFrom(d.before);
        },
    });

    const toImage = (e: RPointerEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        return { x: clamp(((e.clientX - r.left) / r.width) * W, 0, W), y: clamp(((e.clientY - r.top) / r.height) * H, 0, H) };
    };
    const setDraftBoth = (r: Rect | null) => { draftRef.current = r; setDraft(r); };
    const drawProps = {
        onPointerDown: (e: RPointerEvent<HTMLElement>) => {
            if (!doc || e.button > 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = toImage(e);
            drawRef.current = { ox: p.x, oy: p.y };
            if (!(e.shiftKey || e.ctrlKey || e.metaKey)) setSel([]);
        },
        onPointerMove: (e: RPointerEvent<HTMLElement>) => {
            const d = drawRef.current;
            if (!d) return;
            const p = toImage(e);
            setDraftBoth(rounded(Math.min(d.ox, p.x), Math.min(d.oy, p.y), Math.abs(p.x - d.ox), Math.abs(p.y - d.oy)));
        },
        onPointerUp: () => {
            const r = draftRef.current;
            drawRef.current = null;
            setDraftBoth(null);
            const min = Math.max(MIN_ZONE, MIN_DRAW_CSS / fit);
            if (!doc || !r || r.w < min || r.h < min) return;
            const zone = newZone(r);
            apply({ ...doc, zones: [...doc.zones, zone] });
            setSel([zone.id]);
        },
        onPointerCancel: () => {
            drawRef.current = null;
            setDraftBoth(null);
        },
    };

    const finish = async () => {
        if (!img || !doc || busy) return;
        setBusy(true);
        try {
            onDone({ blob: await exportBlob(img, doc), censored: doc.zones.length > 0 });
        } catch {
            setFailed(true);
            setBusy(false);
        }
    };

    const pct = (r: Rect) => ({ left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`, width: `${(r.w / W) * 100}%`, height: `${(r.h / H) * 100}%` });
    const handleCls = "absolute z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-paper pointer-coarse:size-5";
    const modeLabel = (m: Mode) => t(m === "blur" ? "adminEditor.modeBlur" : m === "pixelate" ? "adminEditor.modePixelate" : "adminEditor.modeBox");
    const handleLabel = (h: Handle) => t("adminEditor.cropHandle", { pos: h });

    return (
        <dialog
            ref={dialogRef}
            onCancel={(e) => { e.preventDefault(); onCancel(); }}
            aria-labelledby={`${uid}-title`}
            className="window fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none flex-col p-0 backdrop:bg-paper [&:not([open])]:hidden [&[open]]:flex"
        >
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span id={`${uid}-title`} className="flex-1 truncate">{t("adminEditor.file")} · {t("adminEditor.title")}</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                <div ref={stageRef} className="dither relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                    {failed && <p role="alert" className="window m-4 p-4 font-extrabold">{t("adminEditor.loadError")}</p>}
                    {!img && !failed && <p className="font-mono text-sm">{t("adminEditor.loading")}</p>}
                    {img && doc && (
                        <div className="relative select-none" style={{ width: cssW, height: cssH }}>
                            <canvas ref={canvasRef} role="img" aria-label={t("adminEditor.canvas")} className="block border-2 border-ink" style={{ width: cssW, height: cssH }} />
                            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                                <div className="absolute shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]" style={pct(doc.crop)} />
                            </div>
                            <div
                                className={`absolute border-2 border-white ${tab === "crop" ? "cursor-move touch-none" : "pointer-events-none border-dashed"}`}
                                style={{ ...pct(doc.crop), outline: "2px solid #000", outlineOffset: -1 }}
                                {...(tab === "crop" ? dragProps("crop", "move") : {})}
                            >
                                {tab === "crop" && HANDLES.map((h) => (
                                    <span key={h} role="presentation" aria-label={handleLabel(h)} className={`${handleCls} touch-none`} style={{ ...handleStyle(h), cursor: handleCursor[h] }} {...dragProps("crop", h)} />
                                ))}
                            </div>
                            {tab === "censor" && <div className="absolute inset-0 cursor-crosshair touch-none" {...drawProps} />}
                            {draft && <div className="pointer-events-none absolute border-2 border-dashed border-lens bg-lens/10" style={pct(draft)} />}
                            {zones.map((z, i) => {
                                const on = sel.includes(z.id) && tab === "censor";
                                return (
                                    <div
                                        key={z.id}
                                        tabIndex={tab === "censor" ? 0 : -1}
                                        role="button"
                                        aria-label={t("adminEditor.zoneBox", { n: i + 1 })}
                                        aria-pressed={on}
                                        onFocus={() => tab === "censor" && setSel((s) => (s.includes(z.id) ? s : [z.id]))}
                                        className={`absolute touch-none border-2 ${tab === "censor" ? "cursor-move" : "pointer-events-none"} ${on ? "border-lens" : "border-dashed border-lens/80"} focus-visible:outline-2 focus-visible:outline-lens`}
                                        style={pct(z)}
                                        {...dragProps(z.id, "move")}
                                    >
                                        <span className="absolute left-0 top-0 bg-lens px-1 font-mono text-[10px] font-bold leading-4 text-white">{i + 1}</span>
                                        {on && z.id === selected?.id && HANDLES.map((h) => (
                                            <span key={h} role="presentation" className={`${handleCls} touch-none`} style={{ ...handleStyle(h), cursor: handleCursor[h] }} {...dragProps(z.id, h)} />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <aside className="flex max-h-[46dvh] shrink-0 flex-col border-t-2 border-ink bg-paper md:max-h-none md:w-80 md:border-l-2 md:border-t-0" aria-label={t("adminEditor.controls")}>
                    <button type="button" className="eyebrow flex items-center justify-between border-b-2 border-ink px-3 py-2 md:hidden" aria-expanded={sheet} onClick={() => setSheet((v) => !v)}>
                        <span>{t("adminEditor.controls")}</span>
                        <span aria-hidden>{sheet ? "▾" : "▴"}</span>
                    </button>
                    <div className={`min-h-0 flex-1 space-y-4 overflow-y-auto p-3 md:block ${sheet ? "" : "hidden"}`}>
                        <div className="flex gap-2" role="group" aria-label={t("adminEditor.controls")}>
                            <button type="button" className={`${tabBtn} ${tab === "crop" ? tabOn : ""}`} aria-pressed={tab === "crop"} onClick={() => setTab("crop")}>{t("adminEditor.tabCrop")}</button>
                            <button type="button" className={`${tabBtn} ${tab === "censor" ? tabOn : ""}`} aria-pressed={tab === "censor"} onClick={() => setTab("censor")}>{t("adminEditor.tabCensor")}</button>
                        </div>

                        {tab === "crop" && doc && (
                            <section className="space-y-3">
                                <p className="eyebrow">{t("adminEditor.ratio")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {RATIOS.map((r) => (
                                        <button key={r.key} type="button" className={`btn !min-h-9 !px-3 !py-1 ${ratio === r.key ? tabOn : ""}`} aria-pressed={ratio === r.key} onClick={() => chooseRatio(r.key)}>
                                            {r.key === "free" ? t("adminEditor.ratioFree") : r.key}
                                        </button>
                                    ))}
                                </div>
                                <p className="font-mono text-xs">{t("adminEditor.cropSize", { w: doc.crop.w, h: doc.crop.h })}</p>
                                <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={resetCrop}>{t("adminEditor.reset")}</button>
                            </section>
                        )}

                        {tab === "censor" && (
                            <section className="space-y-3">
                                <button type="button" className="btn btn-primary !min-h-9 !px-3 !py-1" onClick={addZone} disabled={!doc}>
                                    <Plus size={16} strokeWidth={2.5} aria-hidden /> {t("adminEditor.addZone")}
                                </button>
                                <div className="grid grid-cols-3 gap-2">
                                    <button type="button" className={actBtn} onClick={duplicate} disabled={!selZones.length} title="Ctrl+D">
                                        <CopyPlus size={16} strokeWidth={2.5} aria-hidden /> {t("adminEditor.duplicate")}
                                    </button>
                                    <button type="button" className={actBtn} onClick={copyZones} disabled={!zones.length} title="Ctrl+C">
                                        <Copy size={16} strokeWidth={2.5} aria-hidden /> {t("adminEditor.copyZones")}
                                    </button>
                                    <button type="button" className={actBtn} onClick={pasteZones} disabled={!clipCount || !doc} title="Ctrl+V">
                                        <ClipboardPaste size={16} strokeWidth={2.5} aria-hidden /> {t("adminEditor.pasteZones", { n: clipCount })}
                                    </button>
                                </div>
                                <p className="eyebrow">{t("adminEditor.zones")}</p>
                                {zones.length === 0
                                    ? <p className="text-sm text-muted">{t("adminEditor.noZones")}</p>
                                    : (
                                        <ul className="space-y-1.5">
                                            {zones.map((z, i) => (
                                                <li key={z.id} className="flex gap-1.5">
                                                    <button type="button" aria-pressed={sel.includes(z.id)} onClick={(e) => (e.shiftKey || e.ctrlKey || e.metaKey ? toggleSel(z.id) : setSel([z.id]))} className={`btn !min-h-9 flex-1 justify-between !px-3 !py-1 text-left ${sel.includes(z.id) ? tabOn : ""}`}>
                                                        <span>{t("adminEditor.zoneN", { n: i + 1 })}</span>
                                                        <span className="font-mono text-[11px]">{modeLabel(z.mode)}</span>
                                                    </button>
                                                    <button type="button" className="btn !min-h-9 !px-2 !py-1" onClick={() => removeZones([z.id])} aria-label={t("adminEditor.deleteZoneN", { n: i + 1 })}>
                                                        <Trash2 size={14} strokeWidth={2.5} aria-hidden />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                {selected && (
                                    <div className="space-y-3 border-2 border-ink p-3">
                                        {selZones.length > 1 && <p className="font-mono text-xs font-bold">{t("adminEditor.selectedN", { n: selZones.length })}</p>}
                                        <fieldset className="space-y-1.5">
                                            <legend className="eyebrow">{t("adminEditor.mode")}</legend>
                                            <div className="flex flex-wrap gap-2">
                                                {(["blur", "pixelate", "box"] as Mode[]).map((m) => (
                                                    <button key={m} type="button" className={`btn !min-h-9 !px-3 !py-1 ${selected.mode === m ? tabOn : ""}`} aria-pressed={selected.mode === m} onClick={() => patchZones(sel, { mode: m })}>{modeLabel(m)}</button>
                                                ))}
                                            </div>
                                        </fieldset>
                                        {selected.mode === "blur" && (
                                            <div className="space-y-1">
                                                <label htmlFor={`${uid}-blur`} className="eyebrow flex justify-between"><span>{t("adminEditor.intensity")}</span><span>{selected.blur}%</span></label>
                                                <input id={`${uid}-blur`} type="range" min={0} max={100} value={selected.blur} className={sliderCls}
                                                    onChange={(e) => patchZones(sel, { blur: Number(e.target.value) }, true)} onPointerUp={endEdit} onKeyUp={endEdit} onBlur={endEdit} />
                                            </div>
                                        )}
                                        {selected.mode === "pixelate" && (
                                            <div className="space-y-1">
                                                <label htmlFor={`${uid}-block`} className="eyebrow flex justify-between"><span>{t("adminEditor.blockSize")}</span><span>{selected.block}px</span></label>
                                                <input id={`${uid}-block`} type="range" min={4} max={64} value={selected.block} className={sliderCls}
                                                    onChange={(e) => patchZones(sel, { block: Number(e.target.value) }, true)} onPointerUp={endEdit} onKeyUp={endEdit} onBlur={endEdit} />
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {zones.length > 1 && (
                                                <button type="button" className="btn !min-h-9 !px-3 !py-1 pointer-coarse:!min-h-12" onClick={applyToAll}>
                                                    <Wand2 size={14} strokeWidth={2.5} aria-hidden /> {t("adminEditor.applyAll")}
                                                </button>
                                            )}
                                            <button type="button" className="btn !min-h-9 !px-3 !py-1 pointer-coarse:!min-h-12" onClick={() => removeZones(sel)}>
                                                <Trash2 size={14} strokeWidth={2.5} aria-hidden /> {t("adminEditor.deleteZone")}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {lowBlur && <p role="alert" className="border-2 border-dashed border-ink p-2 text-sm font-extrabold">{t("adminEditor.lowBlur")}</p>}
                                {!canBlur() && zones.some((z) => z.mode === "blur") && <p className="text-xs text-muted">{t("adminEditor.noBlurSupport")}</p>}
                            </section>
                        )}
                        <p className="hidden text-xs text-muted md:block">{t("adminEditor.keys")}</p>
                    </div>

                    <div className="space-y-2 border-t-2 border-ink p-3">
                        <p className="font-mono text-xs" aria-live="polite">{info ? t("adminEditor.result", { w: info.w, h: info.h, size: fmtSize(info.bytes) }) : "…"}</p>
                        <p className="text-xs text-muted">{t("adminEditor.metaNote")}</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn !min-h-9 !px-2.5 !py-1" onClick={undo} disabled={!hist.past.length} aria-label={t("adminEditor.undo")} title="Ctrl+Z"><Undo2 size={16} strokeWidth={2.5} aria-hidden /></button>
                            <button type="button" className="btn !min-h-9 !px-2.5 !py-1" onClick={redo} disabled={!hist.future.length} aria-label={t("adminEditor.redo")} title="Ctrl+Shift+Z"><Redo2 size={16} strokeWidth={2.5} aria-hidden /></button>
                            <span className="flex-1" />
                            <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={onCancel} disabled={busy}>{t("adminEditor.cancel")}</button>
                            <button type="button" className="btn btn-primary !min-h-9 !px-3 !py-1 disabled:opacity-50" onClick={() => void finish()} disabled={!img || !doc || busy}>
                                {busy ? t("adminEditor.applying") : t("adminEditor.apply")}
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </dialog>
    );
}
