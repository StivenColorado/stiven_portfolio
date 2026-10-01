import React from "react";
import { useTranslation } from "react-i18next";
import { Briefcase, Code, ExternalLink, Github, Lock } from "lucide-react";
import type { PublicProject } from "../types/content";
import Tag from "./Tag";
import { fileNameOf, tagOf } from "./fileName";

interface Props {
    project: PublicProject;
    onOpen: (project: PublicProject) => void;
}

export const PrivateBadge: React.FC<{ nda?: boolean }> = ({ nda }) => {
    const { t } = useTranslation();
    return (
        <span className="tag">
            <Lock className="h-3 w-3" aria-hidden="true" />
            {nda ? t("projects.badge.nda") : t("projects.badge.private")}
        </span>
    );
};

export const ActiveBadge: React.FC = () => {
    const { t } = useTranslation();
    return (
        <span className="tag">
            <span className="size-2 bg-ink motion-safe:animate-pulse" aria-hidden="true" />
            {t("projects.badge.active")}
        </span>
    );
};

/** Sin capturas se muestra un visual genérico para que tarjeta y modal no queden vacíos. */
export const ProjectVisual: React.FC<{ project: PublicProject; large?: boolean }> = ({ project, large }) => {
    const { t } = useTranslation();
    const cover = project.images[0];
    if (cover) {
        return (
            <img
                src={cover}
                alt={t("projects.card.cover", { title: project.title })}
                width={1280}
                height={800}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
            />
        );
    }
    const Icon = project.kind === 'case-study' ? Briefcase : Code;
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 dither p-4 text-ink">
            <Icon className={large ? "h-20 w-20" : "h-14 w-14"} strokeWidth={2.5} aria-hidden="true" />
            {project.private && <PrivateBadge nda={project.nda} />}
        </div>
    );
};

/** Misma estructura que ProjectCard para que la carga no mueva el layout. */
export const ProjectCardSkeleton: React.FC = () => (
    <div className="window h-full" aria-hidden="true">
        <div className="window-bar">
            <span className="window-dot" />
            <span className="window-dot" />
            <span className="flex-1" />
        </div>
        <div className="aspect-[16/10] border-b-[length:var(--line)] border-ink dither motion-safe:animate-pulse" />
        <div className="flex flex-col gap-3 p-4">
            <div className="h-6 w-2/3 bg-ink/20 motion-safe:animate-pulse" />
            <div className="h-3.5 w-full bg-ink/15 motion-safe:animate-pulse" />
            <div className="h-3.5 w-5/6 bg-ink/15 motion-safe:animate-pulse" />
            <div className="h-3.5 w-1/2 bg-ink/15 motion-safe:animate-pulse" />
            <div className="mt-4 h-9 w-32 border-2 border-ink/30 bg-ink/10 motion-safe:animate-pulse" />
        </div>
    </div>
);

export const ProjectsSkeleton: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = "" }) => {
    const { t } = useTranslation();
    return (
        <div role="status" aria-label={t("projects.loadingLabel")} className={className}>
            {Array.from({ length: count }, (_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
    );
};

export const ProjectsError: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div role="alert" className="window mx-auto my-6 flex max-w-md flex-col items-center gap-4 p-6 text-center">
            <p className="text-sm text-muted">{t("projects.error")}</p>
            <button type="button" className="btn text-sm" onClick={() => window.location.reload()}>
                {t("projects.retry")}
            </button>
        </div>
    );
};

const ProjectCard: React.FC<Props> = ({ project, onOpen }) => {
    const { t } = useTranslation();
    const { demo, repo } = project.links ?? {};

    return (
        <article className="window group/card h-full">
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">{fileNameOf(project)}</span>
            </div>
            <div className="aspect-[16/10] overflow-hidden border-b-[length:var(--line)] border-ink">
                <ProjectVisual project={project} />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
                {project.workingOn && <div><ActiveBadge /></div>}
                <h3 className="text-xl text-ink">{project.title}</h3>
                <p className="line-clamp-3 text-sm text-muted">{project.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((key) => <Tag key={key} tag={tagOf(key)} />)}
                </div>
                <div className="mt-auto flex flex-wrap gap-3 pt-2">
                    <button type="button" className="btn text-sm" onClick={() => onOpen(project)} aria-label={t("projects.card.viewAria", { title: project.title })}>
                        {t("projects.card.view")}
                    </button>
                    {demo && (
                        <a href={demo} target="_blank" rel="noopener noreferrer" className="btn text-sm">
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            {t("projects.card.demo")}
                        </a>
                    )}
                    {repo && (
                        <a href={repo} target="_blank" rel="noopener noreferrer" className="btn text-sm">
                            <Github className="h-4 w-4" aria-hidden="true" />
                            {t("projects.card.repo")}
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
};

export default ProjectCard;
