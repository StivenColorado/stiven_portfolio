import { useTranslation } from "react-i18next";

export function SkeletonBlocks({ count, className = "" }: { count: number; className?: string }) {
    const { t } = useTranslation();
    return (
        <div role="status" aria-busy="true" aria-label={t("common.loading")} className={className}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="window" aria-hidden="true">
                    <div className="window-bar">
                        <span className="window-dot" />
                        <span className="window-dot" />
                        <span className="flex-1" />
                    </div>
                    <div className="dither-dense h-24 motion-safe:animate-pulse" />
                </div>
            ))}
        </div>
    );
}

export function ContentError() {
    const { t } = useTranslation();
    return (
        <p role="alert" className="mt-6 flex flex-wrap items-center gap-3 font-mono text-sm text-muted">
            {t("common.error")}
            <button type="button" onClick={() => window.location.reload()} className="underline underline-offset-4 hover:bg-ink hover:text-paper">
                {t("common.retry")}
            </button>
        </p>
    );
}
