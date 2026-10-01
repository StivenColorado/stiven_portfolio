import type { ReactNode } from "react";

export default function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section className="window !shadow-none" aria-labelledby={`${id}-h`}>
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <h2 id={`${id}-h`} className="flex-1 truncate font-mono text-[11px] font-bold normal-case leading-none tracking-normal">{title}</h2>
            </div>
            <div className="window-body space-y-4">{children}</div>
        </section>
    );
}
