import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Github, Code } from "lucide-react";
import type { ProjectType } from "../types/types";
import Tag from "./Tag";
import GistModal from "./GistModal";
import { PrivateBadge, ProjectVisual } from "./ProjectCard";
import { fileNameOf } from "./fileName";

interface Props {
    project: ProjectType;
    onClose: () => void;
}

const posterOf = (src: string) => src.replace(/\.webm$/, ".webp");

/** <dialog> nativo: Escape y retorno de foco los resuelve el navegador, como en GistModal. */
const ProjectDetailModal: React.FC<Props> = ({ project, onClose }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [active, setActive] = useState(0);
    const [gistOpen, setGistOpen] = useState(false);
    const { demo, repo, gist } = project.links ?? {};
    const media = [
        ...project.images.map((src) => ({ type: 'image' as const, src })),
        ...project.videos.map((src) => ({ type: 'video' as const, src })),
    ];
    const current = media[active];

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
                    aria-label="Cerrar modal"
                >
                    <span aria-hidden="true">×</span>
                </button>
            </div>

            <div className="border-b-[length:var(--line)] border-ink p-4">
                <span className="eyebrow">{project.client ?? (project.nda ? 'Proyecto para cliente · NDA' : project.kind === 'case-study' ? 'Proyecto personal · privado' : 'Proyecto')}</span>
                <h3 className="text-3xl">{project.title}</h3>
            </div>

            <div className="flex flex-col gap-5 p-4">
                <div className="aspect-[16/10] overflow-hidden border-[length:var(--line)] border-ink dither">
                    {current?.type === 'video' ? (
                        <video
                            key={current.src}
                            src={current.src}
                            poster={posterOf(current.src)}
                            preload="none"
                            controls
                            playsInline
                            className="h-full w-full object-cover"
                        />
                    ) : current ? (
                        <img
                            key={current.src}
                            src={current.src}
                            alt={`${project.title}, captura ${active + 1}`}
                            width={1280}
                            height={800}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                        />
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
                                    aria-label={`Ver ${item.type === 'video' ? 'video' : 'captura'} ${i + 1}`}
                                    aria-current={i === active}
                                    className={`block h-14 w-20 overflow-hidden border-2 ${i === active ? 'border-ink shadow-[var(--shadow-hard-sm)]' : 'border-ink opacity-60 hover:opacity-100'}`}
                                >
                                    <img
                                        src={item.type === 'video' ? posterOf(item.src) : item.src}
                                        alt=""
                                        width={80}
                                        height={56}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-full w-full object-cover"
                                    />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {project.private && media.length > 0 && <div><PrivateBadge nda={project.nda} /></div>}
                <p className="text-sm leading-relaxed">{project.description}</p>

                {project.highlights && project.highlights.length > 0 && (
                    <ul className="flex flex-col gap-2 border-[length:var(--line)] border-ink bg-grey p-4 text-sm">
                        {project.highlights.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                )}

                <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => <Tag key={tag.name} tag={tag} />)}
                </div>

                {(demo || repo || gist) && (
                    <div className="flex flex-wrap gap-2">
                        {demo && (
                            <a href={demo} target="_blank" rel="noopener noreferrer" className="btn btn-primary text-sm">
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                Ver demo
                            </a>
                        )}
                        {repo && (
                            <a href={repo} target="_blank" rel="noopener noreferrer" className="btn text-sm">
                                <Github className="h-4 w-4" aria-hidden="true" />
                                Repositorio
                            </a>
                        )}
                        {gist && (
                            <button type="button" onClick={() => setGistOpen(true)} className="btn text-sm">
                                <Code className="h-4 w-4" aria-hidden="true" />
                                Código
                            </button>
                        )}
                    </div>
                )}
            </div>

            {gistOpen && gist && <GistModal gistUrl={gist} project={project} onClose={() => setGistOpen(false)} />}
        </dialog>
    );
};

export default ProjectDetailModal;
