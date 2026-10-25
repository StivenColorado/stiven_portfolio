import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Eraser } from "lucide-react";
import type { Strokes } from "../../types/contracts";

const HEIGHT = 180;
const MAX_STROKES = 200;
const MAX_POINTS = 5000;
const MIN_LENGTH = 40;

const length = (strokes: number[][]) =>
    strokes.reduce((sum, s) => {
        let acc = 0;
        for (let i = 2; i < s.length; i += 2) acc += Math.hypot(s[i] - s[i - 2], s[i + 1] - s[i - 1]);
        return sum + acc;
    }, 0);

interface Props {
    onChange: (strokes: Strokes | null) => void;
    ariaLabel?: string;
}

export default function SignaturePad({ onChange, ariaLabel }: Props) {
    const { t } = useTranslation();
    const canvas = useRef<HTMLCanvasElement>(null);
    const state = useRef({ w: 0, strokes: [] as number[][], points: 0, drawing: false });
    const emit = useRef(onChange);
    useEffect(() => { emit.current = onChange; }, [onChange]);

    const paint = useCallback(() => {
        const el = canvas.current;
        const ctx = el?.getContext("2d");
        if (!el || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, el.width, el.height);
        ctx.strokeStyle = getComputedStyle(el).color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const s of state.current.strokes) {
            ctx.beginPath();
            ctx.moveTo(s[0], s[1]);
            if (s.length === 2) ctx.lineTo(s[0] + 0.1, s[1]);
            for (let i = 2; i < s.length; i += 2) ctx.lineTo(s[i], s[i + 1]);
            ctx.stroke();
        }
    }, []);

    const notify = useCallback(() => {
        const { w, strokes } = state.current;
        emit.current(length(strokes) > MIN_LENGTH ? { w, h: HEIGHT, strokes: strokes.map((s) => [...s]) } : null);
    }, []);

    useEffect(() => {
        const el = canvas.current;
        if (!el) return;
        const fit = () => {
            const w = Math.max(50, Math.round(el.clientWidth));
            const s = state.current;
            if (w === s.w) return;
            if (s.w) {
                const ratio = w / s.w;
                s.strokes = s.strokes.map((st) => st.map((v, i) => (i % 2 === 0 ? Math.round(v * ratio) : v)));
            }
            s.w = w;
            const dpr = window.devicePixelRatio || 1;
            el.width = Math.round(w * dpr);
            el.height = Math.round(HEIGHT * dpr);
            paint();
            if (s.strokes.length) notify();
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        const mo = new MutationObserver(paint);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
        return () => { ro.disconnect(); mo.disconnect(); };
    }, [paint, notify]);

    const at = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
        const r = e.currentTarget.getBoundingClientRect();
        const { w } = state.current;
        return [Math.min(w, Math.max(0, Math.round(e.clientX - r.left))), Math.min(HEIGHT, Math.max(0, Math.round(e.clientY - r.top)))];
    };

    const down = (e: PointerEvent<HTMLCanvasElement>) => {
        const s = state.current;
        if (s.strokes.length >= MAX_STROKES || s.points >= MAX_POINTS) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        s.drawing = true;
        s.strokes.push(at(e));
        s.points += 1;
        paint();
    };

    const move = (e: PointerEvent<HTMLCanvasElement>) => {
        const s = state.current;
        if (!s.drawing || s.points >= MAX_POINTS) return;
        const [x, y] = at(e);
        const cur = s.strokes[s.strokes.length - 1];
        if (cur[cur.length - 2] === x && cur[cur.length - 1] === y) return;
        cur.push(x, y);
        s.points += 1;
        paint();
    };

    const up = () => {
        if (!state.current.drawing) return;
        state.current.drawing = false;
        notify();
    };

    const clear = () => {
        state.current.strokes = [];
        state.current.points = 0;
        paint();
        emit.current(null);
    };

    return (
        <div className="space-y-2">
            <canvas
                ref={canvas}
                role="img"
                aria-label={ariaLabel ?? t("sign.pad.aria")}
                style={{ height: HEIGHT, touchAction: "none" }}
                className="block w-full cursor-crosshair border-2 border-dashed border-ink bg-paper text-ink"
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
            />
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">{t("sign.pad.hint")}</p>
                <button type="button" className="btn !min-h-9 !px-3 !py-1 !text-sm" onClick={clear}>
                    <Eraser size={14} strokeWidth={2.5} aria-hidden /> {t("sign.pad.clear")}
                </button>
            </div>
        </div>
    );
}
