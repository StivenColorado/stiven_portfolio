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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="sticky top-0 bg-gray-800/95 backdrop-blur border-b border-gray-700 px-6 py-4 flex items-start justify-between gap-4 z-10">
                    <h2 className="text-2xl font-bold text-white leading-snug">{project.title}</h2>
                    <button
                        className="text-gray-400 hover:text-white text-3xl leading-none transition-colors shrink-0"
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
                    <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                        {project.description}
                    </p>

                    {/* Galería en miniaturas */}
                    {mediaItems.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Galería ({mediaItems.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {mediaItems.map((m, i) => (
                                    <button
                                        key={m.src}
                                        className="relative h-28 rounded-lg overflow-hidden bg-gray-700 group cursor-pointer"
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
                        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-700">
                            {project.link && (
                                <a
                                    href={project.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Ver Proyecto
                                </a>
                            )}
                            {project.github && (
                                <a
                                    href={project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-5 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
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
                                    className="bg-purple-700 hover:bg-purple-600 text-white py-2 px-5 rounded-lg transition-colors text-sm font-medium"
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
