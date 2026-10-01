import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Minus, Plus, ScanSearch } from "lucide-react";

export interface MediaItem {
    type: "image" | "video";
    src: string;
    alt: string;
}

interface Props {
    items: MediaItem[];
    start: number;
    poster?: string;
    onClose: (index: number) => void;
}

interface View { s: number; x: number; y: number }

const MIN = 1;
const MAX = 6;
const DOUBLE_TAP = 2.5;
const SWIPE = 60;
const FLAT: View = { s: 1, x: 0, y: 0 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Galería a pantalla completa: <dialog> nativo (foco atrapado, Escape) con zoom y pan propios por pointer events. */
const Lightbox: React.FC<Props> = ({ items, start, poster, onClose }) => {
    const { t } = useTranslation();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [index, setIndex] = useState(start);
    const [view, setView] = useState<View>(FLAT);
    const [gesture, setGesture] = useState(false);
    const indexRef = useRef(index);
    const viewRef = useRef(view);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinch = useRef<{ dist: number; s: number } | null>(null);
    const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
    const swipe = useRef<{ x: number; moved: boolean } | null>(null);
    const lastTap = useRef({ t: 0, x: 0, y: 0 });
    const multi = useRef(false);

    const item = items[index];
    const isImage = item?.type === "image";

    const limits = useCallback((s: number) => {
        const stage = stageRef.current;
        if (!stage) return { mx: 0, my: 0 };
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        const img = imgRef.current;
        const nw = img?.naturalWidth || W;
        const nh = img?.naturalHeight || H;
        const fit = Math.min(W / nw, H / nh);
        return { mx: Math.max(0, (nw * fit * s - W) / 2), my: Math.max(0, (nh * fit * s - H) / 2) };
    }, []);

    const commit = useCallback((v: View) => {
        const s = clamp(v.s, MIN, MAX);
        const { mx, my } = limits(s);
        const next = s === MIN ? FLAT : { s, x: clamp(v.x, -mx, mx), y: clamp(v.y, -my, my) };
        viewRef.current = next;
        setView(next);
    }, [limits]);

    const zoomAt = useCallback((ns: number, cx: number, cy: number) => {
        const v = viewRef.current;
        const s = clamp(ns, MIN, MAX);
        const k = s / v.s;
        commit({ s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    }, [commit]);

    const centerOf = useCallback((clientX: number, clientY: number) => {
        const r = stageRef.current!.getBoundingClientRect();
        return { cx: clientX - r.left - r.width / 2, cy: clientY - r.top - r.height / 2 };
    }, []);

    const go = useCallback((to: number) => {
        const n = items.length;
        const next = ((to % n) + n) % n;
        indexRef.current = next;
        setIndex(next);
        viewRef.current = FLAT;
        setView(FLAT);
    }, [items.length]);

    const step = (factor: number) => { setGesture(false); zoomAt(viewRef.current.s * factor, 0, 0); };

    useEffect(() => {
        const dialog = dialogRef.current;
        const opener = document.activeElement as HTMLElement | null;
        if (dialog && !dialog.open) dialog.showModal();
        return () => opener?.focus();
    }, []);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const onWheel = (e: WheelEvent) => {
            if (!imgRef.current) return;
            e.preventDefault();
            setGesture(true);
            const { cx, cy } = centerOf(e.clientX, e.clientY);
            zoomAt(viewRef.current.s * Math.exp(-e.deltaY * 0.0018), cx, cy);
        };
        stage.addEventListener("wheel", onWheel, { passive: false });
        return () => stage.removeEventListener("wheel", onWheel);
    }, [centerOf, zoomAt, index, isImage]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); go(indexRef.current - 1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); go(indexRef.current + 1); }
        else if (isImage && (e.key === "+" || e.key === "=")) step(1.5);
        else if (isImage && (e.key === "-" || e.key === "_")) step(1 / 1.5);
        else if (isImage && e.key === "0") step(0);
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (!isImage) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        setGesture(true);
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: viewRef.current.s };
            multi.current = true;
            pan.current = null;
            swipe.current = null;
        } else {
            multi.current = false;
            const v = viewRef.current;
            pan.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y };
            swipe.current = { x: e.clientX, moved: false };
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const { cx, cy } = centerOf((a.x + b.x) / 2, (a.y + b.y) / 2);
            zoomAt(pinch.current.s * (dist / pinch.current.dist), cx, cy);
            return;
        }
        if (swipe.current && Math.abs(e.clientX - swipe.current.x) > 10) swipe.current.moved = true;
        if (pan.current && viewRef.current.s > 1) {
            commit({
                s: viewRef.current.s,
                x: pan.current.vx + e.clientX - pan.current.x,
                y: pan.current.vy + e.clientY - pan.current.y,
            });
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.delete(e.pointerId);
        pinch.current = null;
        if (pointers.current.size > 0) {
            const [rest] = [...pointers.current.values()];
            const v = viewRef.current;
            pan.current = { x: rest.x, y: rest.y, vx: v.x, vy: v.y };
            return;
        }
        pan.current = null;
        const sw = swipe.current;
        swipe.current = null;
        if (multi.current || e.type === "pointercancel") return;
        const dx = sw ? e.clientX - sw.x : 0;
        if (viewRef.current.s === 1 && Math.abs(dx) > SWIPE && items.length > 1) {
            go(indexRef.current + (dx < 0 ? 1 : -1));
            return;
        }
        if (sw?.moved) return;
        const now = e.timeStamp;
        const last = lastTap.current;
        if (now - last.t < 320 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
            setGesture(false);
            const { cx, cy } = centerOf(e.clientX, e.clientY);
            if (viewRef.current.s > 1) commit(FLAT);
            else zoomAt(DOUBLE_TAP, cx, cy);
            lastTap.current = { t: 0, x: 0, y: 0 };
        } else {
            lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
    };

    const zoomed = view.s > 1;
    const btn = "flex h-9 min-w-9 items-center justify-center border-2 border-ink bg-paper px-2 font-mono text-xs font-bold hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink";
    const nav = "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border-2 border-ink bg-paper shadow-[var(--shadow-hard-sm)] hover:bg-ink hover:text-paper";

    return createPortal(
        <dialog
            ref={dialogRef}
            onClose={() => onClose(indexRef.current)}
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("projects.lightbox.label")}
            className="window fixed inset-0 m-0 hidden h-dvh max-h-none w-dvw max-w-none flex-col overflow-hidden p-0 shadow-none open:flex"
        >
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">
                    {t("projects.lightbox.title")} · <span aria-live="polite">{t("projects.lightbox.counter", { n: index + 1, total: items.length })}</span>
                </span>
                <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-paper text-sm leading-none hover:bg-ink hover:text-paper"
                    aria-label={t("projects.lightbox.close")}
                >
                    <span aria-hidden="true">×</span>
                </button>
            </div>

            <div
                ref={stageRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`dither relative min-h-0 flex-1 select-none overflow-hidden ${isImage ? (zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in") : ""}`}
                style={{ touchAction: isImage ? "none" : "auto" }}
            >
                {item?.type === "video" ? (
                    <video
                        key={item.src}
                        src={item.src}
                        poster={poster}
                        controls
                        autoPlay
                        playsInline
                        className="absolute inset-0 h-full w-full object-contain"
                    />
                ) : item ? (
                    <img
                        key={item.src}
                        ref={imgRef}
                        src={item.src}
                        alt={item.alt}
                        draggable={false}
                        className={`absolute inset-0 h-full w-full object-contain will-change-transform ${gesture ? "" : "motion-safe:transition-transform motion-safe:duration-200"}`}
                        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
                    />
                ) : null}

                {items.length > 1 && (
                    <>
                        <button type="button" className={`${nav} left-2`} aria-label={t("projects.lightbox.prev")} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(index - 1)}>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button type="button" className={`${nav} right-2`} aria-label={t("projects.lightbox.next")} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(index + 1)}>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </>
                )}

                {isImage && (
                    <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 border-2 border-ink bg-paper p-1 shadow-[var(--shadow-hard-sm)]" onPointerDown={(e) => e.stopPropagation()}>
                        <button type="button" className={btn} onClick={() => step(1 / 1.5)} disabled={view.s <= MIN} aria-label={t("projects.lightbox.zoomOut")}>
                            <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="min-w-12 text-center font-mono text-xs" aria-live="polite">{Math.round(view.s * 100)}%</span>
                        <button type="button" className={btn} onClick={() => step(1.5)} disabled={view.s >= MAX} aria-label={t("projects.lightbox.zoomIn")}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" className={btn} onClick={() => step(0)} disabled={view.s === MIN} aria-label={t("projects.lightbox.reset")}>
                            <ScanSearch className="h-4 w-4" aria-hidden="true" />
                            <span className="ml-1">1:1</span>
                        </button>
                    </div>
                )}
            </div>

            {items.length > 1 && (
                <ul aria-label={t("projects.lightbox.thumbs")} className="flex shrink-0 gap-2 overflow-x-auto border-t-[length:var(--line)] border-ink bg-paper p-2">
                    {items.map((m, i) => (
                        <li key={m.src} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => go(i)}
                                aria-label={t("projects.lightbox.goTo", { n: i + 1 })}
                                aria-current={i === index}
                                className={`block h-12 w-[4.5rem] overflow-hidden border-2 border-ink bg-grey ${i === index ? "shadow-[var(--shadow-hard-sm)]" : "opacity-60 hover:opacity-100"}`}
                            >
                                {m.type === "video" && !poster ? (
                                    <video src={m.src} muted playsInline preload="metadata" aria-hidden="true" className="h-full w-full object-contain" />
                                ) : (
                                    <img src={m.type === "video" ? poster : m.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </dialog>,
        document.body,
    );
};

export default Lightbox;
