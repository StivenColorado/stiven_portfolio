import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Github, Code } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PublicProject } from "../types/content";
import Tag from "./Tag";
import GistModal from "./GistModal";
import { PrivateBadge, ProjectVisual } from "./ProjectCard";
import ActiveBadge from "./ActiveBadge";
import Lightbox, { type MediaItem } from "./Lightbox";
import { fileNameOf, tagOf } from "./fileName";

interface Props {
    project: PublicProject;
    onClose: () => void;
}

const MINUTE = 60_000;

function relativeTime(iso: string, lang: string) {
    const diff = new Date(iso).getTime() - Date.now();
    if (Number.isNaN(diff)) return null;
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    const minutes = Math.round(diff / MINUTE);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return rtf.format(days, "day");
    return rtf.format(Math.round(days / 30), "month");
}

/** <dialog> nativo: Escape y retorno de foco los resuelve el navegador, como en GistModal. */
const ProjectDetailModal: React.FC<Props> = ({ project, onClose }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.resolvedLanguage ?? "es";
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [active, setActive] = useState(0);
    const [gistOpen, setGistOpen] = useState(false);
    const { demo, repo, gist } = project.links ?? {};
    const [zoom, setZoom] = useState(false);
    const media: MediaItem[] = [
        ...project.images.map((src, i) => ({ type: 'image' as const, src, alt: t("projects.modal.shot", { title: project.title, n: i + 1 }) })),
        ...project.videos.map((src, i) => ({ type: 'video' as const, src, alt: t("projects.modal.viewVideo", { n: i + 1 }) })),
    ];
    const current = media[active];
    const poster = project.images[0];
    const activity = project.activity;
    const lastActivity = activity ? relativeTime(activity.pushedAt, lang) : null;

    useEffect(() => {
        const dialog = dialogRef.current;
        const opener = document.activeElement as HTMLElement | null;
        if (dialog && !dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            opener?.focus();
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
            aria-label={project.title}
            className="window m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
        >
            <div className="window-bar sticky top-0 z-10">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">{fileNameOf(project)}</span>
                <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-paper text-sm leading-none hover:bg-ink hover:text-paper"
                    aria-label={t("projects.modal.close")}
                >
                    <span aria-hidden="true">×</span>
                </button>
            </div>

            <div className="border-b-[length:var(--line)] border-ink p-4">
                <span className="eyebrow">{project.client ?? (project.nda ? t("projects.modal.clientNda") : project.kind === 'case-study' ? t("projects.modal.personalPrivate") : t("projects.modal.project"))}</span>
                <h3 className="text-3xl">{project.title}</h3>
            </div>

            <div className="flex flex-col gap-5 p-4">
                <div className="aspect-[16/10] overflow-hidden border-[length:var(--line)] border-ink bg-grey dither">
                    {current?.type === 'video' ? (
                        <video
                            key={current.src}
                            src={current.src}
                            poster={poster}
                            preload={poster ? "none" : "metadata"}
                            controls
                            playsInline
                            className="h-full w-full object-contain"
                        />
                    ) : current ? (
                        <button
                            type="button"
                            onClick={() => setZoom(true)}
                            aria-label={t("projects.modal.zoomShot", { n: active + 1 })}
                            className="block h-full w-full cursor-zoom-in"
                        >
                            <img
                                key={current.src}
                                src={current.src}
                                alt={current.alt}
                                width={1280}
                                height={800}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-contain"
                            />
                        </button>
                    ) : (
                        <ProjectVisual project={project} large />
                    )}
                </div>

                {media.length > 1 && (
                    <ul className="flex gap-2 overflow-x-auto pb-1">
                        {media.map((item, i) => (
                            <li key={item.src} className="shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setActive(i)}
                                    aria-label={t(item.type === 'video' ? "projects.modal.viewVideo" : "projects.modal.viewShot", { n: i + 1 })}
                                    aria-current={i === active}
                                    className={`block h-14 w-20 overflow-hidden border-2 bg-grey ${i === active ? 'border-ink shadow-[var(--shadow-hard-sm)]' : 'border-ink opacity-60 hover:opacity-100'}`}
                                >
                                    {item.type === 'video' && !poster ? (
                                        <video src={item.src} muted playsInline preload="metadata" aria-hidden="true" className="h-full w-full object-contain" />
                                    ) : (
                                        <img
                                            src={item.type === 'video' ? poster : item.src}
                                            alt=""
                                            width={80}
                                            height={56}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-contain"
                                        />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {((project.private && media.length > 0) || project.workingOn) && (
                    <div className="flex flex-wrap gap-2">
                        {project.private && media.length > 0 && <PrivateBadge nda={project.nda} />}
                        {project.workingOn && <ActiveBadge />}
                    </div>
                )}
                <p className="text-sm leading-relaxed">{project.description}</p>

                {project.highlights && project.highlights.length > 0 && (
                    <ul className="flex flex-col gap-2 border-[length:var(--line)] border-ink bg-grey p-4 text-sm">
                        {project.highlights.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                )}

                {activity && (
                    <div className="flex flex-col gap-3 border-[length:var(--line)] border-ink p-4 text-sm">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                            {lastActivity && <span>{t("projects.modal.lastActivity", { when: lastActivity })}</span>}
                            <span>{t("projects.modal.commitsWeek", { count: activity.commitsWeek })}</span>
                        </div>
                        {activity.commits.length > 0 && (
                            <div>
                                <h4 className="eyebrow mb-2">{t("projects.modal.recentCommits")}</h4>
                                <ul className="flex flex-col gap-1.5">
                                    {activity.commits.map((c) => (
                                        <li key={c.url} className="flex items-baseline gap-2">
                                            <span className="min-w-0 flex-1 truncate">{c.message}</span>
                                            <span className="shrink-0 font-mono text-xs text-muted">{relativeTime(c.date, lang)}</span>
                                            <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label={t("projects.modal.viewCommitAria", { message: c.message })} className="shrink-0 font-mono text-xs underline underline-offset-4 hover:bg-ink hover:text-paper">
                                                {t("projects.modal.viewCommit")}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((key) => <Tag key={key} tag={tagOf(key)} />)}
                </div>

                {(demo || repo || gist) && (
                    <div className="flex flex-wrap gap-2">
                        {demo && (
                            <a href={demo} target="_blank" rel="noopener noreferrer" className="btn btn-primary text-sm">
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                {t("projects.modal.demo")}
                            </a>
                        )}
                        {repo && (
                            <a href={repo} target="_blank" rel="noopener noreferrer" className="btn text-sm">
                                <Github className="h-4 w-4" aria-hidden="true" />
                                {t("projects.modal.repo")}
                            </a>
                        )}
                        {gist && (
                            <button type="button" onClick={() => setGistOpen(true)} className="btn text-sm">
                                <Code className="h-4 w-4" aria-hidden="true" />
                                {t("projects.modal.code")}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {zoom && <Lightbox items={media} start={active} poster={poster} onClose={(i) => { setActive(i); setZoom(false); }} />}
            {gistOpen && gist && <GistModal gistUrl={gist} project={project} onClose={() => setGistOpen(false)} />}
        </dialog>
    );
};

export default ProjectDetailModal;
