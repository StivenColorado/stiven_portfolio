import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TAGS } from "../../../data/tags";
import { useToast } from "../../../components/admin/ui/toastContext";
import type { FullProject } from "./projectForm";

type Lang = "es" | "en";

const fileName = (slug: string, i: number, url: string) => `${slug}-${i + 1}.${url.split(".").pop() ?? "webp"}`;

function CopyButton({ text, label }: { text: string; label: string }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [done, setDone] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
        } catch {
            toast(t("adminProjects.share.copyError"), "error");
        }
    };
    return (
        <button type="button" className="btn !min-h-8 !gap-1.5 !px-2.5 !py-0.5 !text-xs disabled:opacity-40" disabled={!text} aria-label={label} onClick={() => void copy()}>
            {done ? <Check size={13} strokeWidth={2.5} aria-hidden /> : <Copy size={13} strokeWidth={2.5} aria-hidden />}
            {done ? t("adminProjects.share.copied") : t("adminProjects.share.copy")}
        </button>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    const { t } = useTranslation();
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">{label}</span>
                <CopyButton text={value} label={t("adminProjects.share.copyField", { field: label })} />
            </div>
            <p className="whitespace-pre-wrap break-words border-[length:var(--line)] border-ink p-3 text-sm text-ink">{value || <span className="text-muted">{t("adminProjects.share.empty")}</span>}</p>
        </div>
    );
}

export default function ProjectShareDialog({ project, onClose }: { project: FullProject | null; onClose: () => void }) {
    const { t } = useTranslation();
    const ref = useRef<HTMLDialogElement>(null);
    const [lang, setLang] = useState<Lang>("es");
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (project && !dialog.open) { setLang("es"); dialog.showModal(); }
        if (!project && dialog.open) dialog.close();
    }, [project]);

    const en = project?.i18n?.en;
    const hasEn = !!(en?.title || en?.summary || en?.description || en?.highlights?.length);
    const pick = <K extends "title" | "summary" | "description" | "client">(key: K) => (lang === "en" && en?.[key]) || project?.[key] || "";
    const highlights = (lang === "en" && en?.highlights?.length ? en.highlights : project?.highlights) ?? [];

    const title = pick("title");
    const summary = pick("summary");
    const description = pick("description");
    const bullets = highlights.map((h) => `• ${h}`).join("\n");
    const tags = (project?.tags ?? []).map((k) => TAGS[k]?.name ?? k).join(", ");
    const links = project ? Object.values(project.links).filter(Boolean).join("\n") : "";
    const all = [title, summary, description, bullets, tags && `${t("adminProjects.share.tags")}: ${tags}`, links].filter(Boolean).join("\n\n");

    const downloadAll = async () => {
        if (!project) return;
        setDownloading(true);
        for (const [i, url] of project.images.entries()) {
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName(project.slug, i, url);
            document.body.append(a);
            a.click();
            a.remove();
            await new Promise((r) => setTimeout(r, 350));
        }
        setDownloading(false);
    };

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => e.target === ref.current && ref.current?.close()}
            aria-label={t("adminProjects.share.title")}
            className="window m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
        >
            <div className="window-bar sticky top-0 z-10">
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate">{project?.slug}.share</span>
                <button type="button" className="px-2" aria-label={t("admin.dialogDefaults.cancel")} onClick={() => ref.current?.close()}>×</button>
            </div>
            {project && (
                <div className="space-y-5 p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-xl leading-tight">{t("adminProjects.share.title")}</h2>
                            <p className="mt-1 text-sm text-muted">{t("adminProjects.share.hint")}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {hasEn && (
                                <div className="flex" role="group" aria-label={t("adminProjects.share.language")}>
                                    {(["es", "en"] as const).map((l) => (
                                        <button key={l} type="button" aria-pressed={lang === l} className={`btn !min-h-8 !px-3 !py-0.5 !text-xs ${lang === l ? "btn-primary" : ""}`} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
                                    ))}
                                </div>
                            )}
                            <CopyButton text={all} label={t("adminProjects.share.copyAll")} />
                        </div>
                    </div>

                    {project.images.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <span className="eyebrow">{t("adminProjects.share.images", { count: project.images.length })}</span>
                                <button type="button" className="btn !min-h-8 !gap-1.5 !px-2.5 !py-0.5 !text-xs disabled:opacity-40" disabled={downloading} onClick={() => void downloadAll()}>
                                    <Download size={13} strokeWidth={2.5} aria-hidden />
                                    {downloading ? t("adminProjects.share.downloading") : t("adminProjects.share.downloadAll")}
                                </button>
                            </div>
                            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {project.images.map((url, i) => (
                                    <li key={url} className="group relative border-[length:var(--line)] border-ink">
                                        <img src={url} alt={t("adminProjects.share.imageAlt", { title, n: i + 1 })} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                                        <a href={url} download={fileName(project.slug, i, url)} aria-label={t("adminProjects.share.downloadOne", { n: i + 1 })} className="btn absolute bottom-1 right-1 !min-h-7 !px-1.5 !py-0.5"><Download size={13} strokeWidth={2.5} aria-hidden /></a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Row label={t("adminProjects.share.fieldTitle")} value={title} />
                    <Row label={t("adminProjects.share.fieldSummary")} value={summary} />
                    <Row label={t("adminProjects.share.fieldDescription")} value={description} />
                    {bullets && <Row label={t("adminProjects.share.fieldHighlights")} value={bullets} />}
                    {tags && <Row label={t("adminProjects.share.tags")} value={tags} />}
                    {links && <Row label={t("adminProjects.share.fieldLinks")} value={links} />}
                </div>
            )}
        </dialog>
    );
}
