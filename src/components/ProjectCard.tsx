import React from "react";
import { Briefcase, Code, ExternalLink, Github, Lock } from "lucide-react";
import type { ProjectType } from "../types/types";
import Tag from "./Tag";
import { fileNameOf } from "./fileName";

interface Props {
    project: ProjectType;
    onOpen: (project: ProjectType) => void;
}

export const PrivateBadge: React.FC<{ nda?: boolean }> = ({ nda }) => (
    <span className="tag">
        <Lock className="h-3 w-3" aria-hidden="true" />
        {nda ? "Cliente · confidencial (NDA)" : "Código privado"}
    </span>
);

/** Sin capturas se muestra un visual genérico para que tarjeta y modal no queden vacíos. */
export const ProjectVisual: React.FC<{ project: ProjectType; large?: boolean }> = ({ project, large }) => {
    const cover = project.images[0];
    if (cover) {
        return (
            <img
                src={cover}
                alt={`Captura de ${project.title}`}
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

const ProjectCard: React.FC<Props> = ({ project, onOpen }) => {
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
                <h3 className="text-xl text-ink">{project.title}</h3>
                <p className="line-clamp-3 text-sm text-muted">{project.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => <Tag key={tag.name} tag={tag} />)}
                </div>
                <div className="mt-auto flex flex-wrap gap-3 pt-2">
                    <button type="button" className="btn text-sm" onClick={() => onOpen(project)} aria-label={`Ver detalle de ${project.title}`}>
                        Ver proyecto
                    </button>
                    {demo && (
                        <a href={demo} target="_blank" rel="noopener noreferrer" className="btn text-sm">
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            Demo
                        </a>
                    )}
                    {repo && (
                        <a href={repo} target="_blank" rel="noopener noreferrer" className="btn text-sm">
                            <Github className="h-4 w-4" aria-hidden="true" />
                            Repositorio
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
};

export default ProjectCard;
