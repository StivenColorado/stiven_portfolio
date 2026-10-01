import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../../lib/seo";
import VisitorsTab from "./audit/VisitorsTab";
import ActionsTab from "./audit/ActionsTab";

const TABS = [
    { id: "visitantes", labelKey: "admin.audit.tabs.visitors" },
    { id: "acciones", labelKey: "admin.audit.tabs.actions" },
] as const;

export default function Auditoria() {
    const { t } = useTranslation();
    useDocumentMeta({ title: t("admin.meta.audit"), noindex: true });
    const [params, setParams] = useSearchParams();
    const tab = params.get("tab") === "acciones" ? "acciones" : "visitantes";
    const refs = useRef<Record<string, HTMLButtonElement | null>>({});

    const select = (id: string) => setParams(id === "visitantes" ? {} : { tab: id }, { replace: true });

    const onKey = (e: KeyboardEvent, index: number) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        const target = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : step ? (index + step + TABS.length) % TABS.length : -1;
        if (target < 0) return;
        e.preventDefault();
        select(TABS[target].id);
        refs.current[TABS[target].id]?.focus();
    };

    return (
        <div className="space-y-6">
            <header>
                <p className="eyebrow">{t("admin.shell.eyebrow")}</p>
                <h1 className="font-display text-3xl tracking-tight text-ink">{t("admin.audit.title")}</h1>
            </header>
            <div role="tablist" aria-label={t("admin.audit.tablist")} className="flex border-b-2 border-ink">
                {TABS.map((tb, i) => (
                    <button
                        key={tb.id}
                        ref={(el) => { refs.current[tb.id] = el; }}
                        type="button"
                        role="tab"
                        id={`tab-${tb.id}`}
                        aria-selected={tab === tb.id}
                        aria-controls={`panel-${tb.id}`}
                        tabIndex={tab === tb.id ? 0 : -1}
                        onClick={() => select(tb.id)}
                        onKeyDown={(e) => onKey(e, i)}
                        className={`-mb-0.5 border-2 border-b-0 border-ink px-4 py-2 font-extrabold ${tab === tb.id ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-grey"}`}
                    >
                        {t(tb.labelKey)}
                    </button>
                ))}
            </div>
            {tab === "visitantes" ? <VisitorsTab /> : <ActionsTab />}
        </div>
    );
}
