import type { ReactNode } from "react";

export default function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
    return (
        <div className="dither space-y-3 border-2 border-dashed border-ink p-6 text-center">
            <p className="font-display text-xl tracking-tight text-ink">{title}</p>
            {children && <p className="mx-auto max-w-prose text-sm text-muted">{children}</p>}
            {action}
        </div>
    );
}
