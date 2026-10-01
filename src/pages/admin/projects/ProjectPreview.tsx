import { Briefcase, Code, ExternalLink, Github, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TAGS } from "../../../data/tags";
import type { ProjectForm } from "./projectForm";

const EXT = { "case-study": "priv", demo: "demo", oss: "oss" } as const;

export default function ProjectPreview({ form, lang }: { form: ProjectForm; lang: "es" | "en" }) {
    const { t } = useTranslation();
    const en = lang === "en";
    const title = (en && form.en.title) || form.title || t("adminProjects.preview.untitled");
    const summary = (en && form.en.summary) || form.summary;
    const Fallback = form.kind === "case-study" ? Briefcase : Code;
    const fileName = `${form.year || new Date().getFullYear()}-${form.slug || "slug"}.${form.nda ? "nda" : EXT[form.kind]}`;

    return (
        <article className="window h-full !shadow-none" aria-label={t("adminProjects.sections.preview")}>
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">{fileName}</span>
            </div>
            <div className="aspect-[16/10] overflow-hidden border-b-[length:var(--line)] border-ink">
                {form.images[0] ? (
                    <img src={form.images[0]} alt={t("adminProjects.preview.cover", { title })} className="h-full w-full object-cover" />
                ) : (
                    <div className="dither flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-ink">
                        <Fallback className="h-14 w-14" strokeWidth={2.5} aria-hidden="true" />
                        {form.private && (
                            <span className="tag"><Lock className="h-3 w-3" aria-hidden="true" />{t(form.nda ? "adminProjects.preview.nda" : "adminProjects.preview.private")}</span>
                        )}
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-3 p-4">
                {form.workingOn && form.githubRepo && <span className="tag w-fit !bg-ink !text-paper">{t("adminProjects.preview.workingOn")}</span>}
                <h3 className="break-words text-xl text-ink">{title}</h3>
                <p className="line-clamp-3 text-sm text-muted">{summary || t("adminProjects.preview.noSummary")}</p>
                {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {form.tags.map((key) => {
                            const tag = TAGS[key];
                            const Icon = tag?.icon;
                            return (
                                <span key={key} className="tag">
                                    {Icon && <Icon className="h-3.5 w-3.5 brightness-0 dark:invert" aria-hidden="true" />}
                                    {tag?.name ?? key}
                                </span>
                            );
                        })}
                    </div>
                )}
                <div className="flex flex-wrap gap-3 pt-2">
                    <span className="btn text-sm">{t("adminProjects.preview.view")}</span>
                    {form.demo && <span className="btn text-sm"><ExternalLink className="h-4 w-4" aria-hidden="true" />{t("adminProjects.links.demo")}</span>}
                    {form.repo && <span className="btn text-sm"><Github className="h-4 w-4" aria-hidden="true" />{t("adminProjects.links.repo")}</span>}
                </div>
            </div>
        </article>
    );
}
