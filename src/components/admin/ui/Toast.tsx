import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ToastContext } from "./toastContext";
import type { ToastKind } from "./toastContext";

interface Item { id: number; message: string; kind: ToastKind }

export default function ToastProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const [items, setItems] = useState<Item[]>([]);
    const seq = useRef(0);

    const toast = useCallback((message: string, kind: ToastKind = "ok") => {
        const id = ++seq.current;
        setItems((prev) => [...prev.slice(-2), { id, message, kind }]);
        setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), kind === "error" ? 7000 : 4000);
    }, []);

    const api = useMemo(() => ({ toast }), [toast]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2">
                {items.map((item) => (
                    <p key={item.id} className={`window window-body !px-4 !py-2 text-sm font-bold ${item.kind === "error" ? "dither" : ""}`}>
                        {item.kind === "error" && <span className="eyebrow mr-2 !text-ink">{t("admin.common.error")}</span>}
                        {item.message}
                    </p>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
