import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { type ProjectType } from "../types/types";
import Tag from "./Tag";
import Github from "./icons/Github";

interface MediaItem {
    type: 'image' | 'video';
    src: string;
}

interface Props {
    project: ProjectType;
    onClose: () => void;
    /** Abre la galería a pantalla completa (la del listado) en ese índice. */
    onMediaClick?: (mediaItems: MediaItem[], index: number) => void;
}

/**
 * Modal de DETALLE de un proyecto: descripción completa (en las cards va
 * recortada con line-clamp), todas las capturas/GIFs en miniatura y los
 * enlaces. Las miniaturas abren la galería a pantalla completa por encima.
 */
const ProjectDetailModal: React.FC<Props> = ({ project, onClose, onMediaClick }) => {
    const mediaItems: MediaItem[] = [
        ...(project.images?.map(src => ({ type: 'image' as const, src })) || []),
        ...(project.videos?.map(src => ({ type: 'video' as const, src })) || []),
    ];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 rounded-lg shadow-[8px_8px_0_0_#18181b] dark:shadow-[8px_8px_0_0_#fafafa] w-full max-w-3xl max-h-[88vh] overflow-y-auto"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b-2 border-zinc-900 dark:border-zinc-100 px-6 py-4 flex items-start justify-between gap-4 z-10">
                    <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-snug">{project.title}</h2>
                    <button
                        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 text-2xl leading-none hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
                        onClick={onClose}
                        aria-label="Cerrar detalles"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                            <Tag key={tag.name} tag={tag} />
                        ))}
                    </div>

                    {/* Descripción completa */}
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                        {project.description}
                    </p>

                    {/* Galería en miniaturas */}
                    {mediaItems.length > 0 && (
                        <div>
                            <h3 className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                Galería ({mediaItems.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {mediaItems.map((m, i) => (
                                    <button
                                        key={m.src}
                                        className="relative h-28 rounded-md overflow-hidden border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-200 dark:bg-zinc-800 group cursor-pointer"
                                        onClick={() => onMediaClick?.(mediaItems, i)}
                                        aria-label={`Abrir imagen ${i + 1}`}
                                    >
                                        {m.type === 'image' ? (
                                            <img
                                                src={m.src}
                                                alt={`${project.title} ${i + 1}`}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <video src={m.src} className="w-full h-full object-cover" muted loop playsInline />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs bg-black/70 px-2 py-1 rounded-full">Ampliar</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Enlaces */}
                    {(project.link || project.github || project.gist) && (
                        <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-zinc-900 dark:border-zinc-100">
                            {project.link && (
                                <a
                                    href={project.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 px-5 rounded-md transition-colors text-sm font-semibold hover:bg-transparent hover:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100"
                                >
                                    Ver Proyecto
                                </a>
                            )}
                            {project.github && (
                                <a
                                    href={project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 py-2 px-5 rounded-md transition-colors text-sm font-semibold flex items-center gap-2 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                                >
                                    <Github className="w-4 h-4" />
                                    <span>Repositorio</span>
                                </a>
                            )}
                            {project.gist && (
                                <a
                                    href={project.gist}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 py-2 px-5 rounded-md transition-colors text-sm font-semibold hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                                >
                                    Ver código (Gist)
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ProjectDetailModal;
