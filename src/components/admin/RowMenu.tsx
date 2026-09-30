import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

export default function RowMenu({ ip, onOne, onIp }: { ip: string; onOne: () => void; onIp: () => void }) {
    const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!pos) return;
        const close = () => setPos(null);
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) close();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { close(); btnRef.current?.focus(); }
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        menuRef.current?.querySelector("button")?.focus();
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [pos]);

    const toggle = () => {
        if (pos) return setPos(null);
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    const pick = (fn: () => void) => { setPos(null); fn(); };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={!!pos}
                aria-label="Borrar visita"
                onClick={toggle}
                className="flex size-8 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lens"
            >
                <Trash2 aria-hidden="true" className="size-4" />
            </button>
            {pos && (
                <div ref={menuRef} role="menu" style={{ top: pos.top, right: pos.right }} className="window fixed z-50 min-w-48 text-sm">
                    <button type="button" role="menuitem" onClick={() => pick(onOne)} className="px-3 py-2 text-left font-bold hover:bg-grey-2 focus-visible:bg-grey-2 focus-visible:outline-none">Solo esta visita</button>
                    <button type="button" role="menuitem" onClick={() => pick(onIp)} className="border-t-2 border-ink px-3 py-2 text-left font-bold hover:bg-grey-2 focus-visible:bg-grey-2 focus-visible:outline-none">
                        Todas las de <span className="font-mono text-xs">{ip}</span>
                    </button>
                </div>
            )}
        </>
    );
}
