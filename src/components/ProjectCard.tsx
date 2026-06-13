import React from "react";
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
    onImageClick?: (mediaItems: MediaItem[], index: number) => void;
    onDetailsClick?: (project: ProjectType) => void;
}

const ProjectCard: React.FC<Props> = ({ project, onImageClick, onDetailsClick }) => {
    const mediaItems: MediaItem[] = [
        ...(project.images?.map(src => ({ type: 'image' as const, src })) || []),
        ...(project.videos?.map(src => ({ type: 'video' as const, src })) || [])
    ];

    const handleImageClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        if (mediaItems.length > 0) {
            onImageClick?.(mediaItems, index);
        }
    };

    if (mediaItems.length === 0) {
        mediaItems.push({
            type: 'image',
            src: 'https://via.placeholder.com/800x500/1a202c/4a5568?text=No+Preview+Available'
        });
    }

    return (
        <motion.div
            className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden border-2 border-zinc-900 dark:border-zinc-100 shadow-[5px_5px_0_0_#18181b] dark:shadow-[5px_5px_0_0_#fafafa] hover:shadow-[7px_7px_0_0_#18181b] dark:hover:shadow-[7px_7px_0_0_#fafafa] transition-all duration-200 transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            {/* Barra superior estilo "ventana" retro */}
            <div className="flex items-center justify-between px-3 py-2 border-b-2 border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-zinc-900 dark:border-zinc-100" />
                    <span className="w-2.5 h-2.5 rounded-full border border-zinc-900 dark:border-zinc-100" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {project.tags[0]?.name ?? "project"}
                </span>
            </div>

            {/* Thumbnail */}
            <div
                className="relative h-48 bg-zinc-200 dark:bg-zinc-700 cursor-pointer overflow-hidden group border-b-2 border-zinc-900 dark:border-zinc-100"
                onClick={(e) => handleImageClick(e, 0)}
            >
                {mediaItems[0]?.type === 'image' ? (
                    <img
                        src={mediaItems[0].src}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <video
                        src={mediaItems[0].src}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                    />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium bg-black bg-opacity-70 px-3 py-1.5 rounded-full">
                        Ver Galería
                    </span>
                </div>
                {mediaItems.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                        +{mediaItems.length - 1}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                <h3
                    className="text-xl font-bold text-zinc-900 dark:text-white mb-2 line-clamp-1 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    onClick={() => onDetailsClick?.(project)}
                    title={project.title}
                >
                    {project.title}
                </h3>
                <p className="text-zinc-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{project.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag) => (
                        <Tag key={tag.name} tag={tag} />
                    ))}
                </div>

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={() => onDetailsClick?.(project)}
                        className="flex-1 border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-center py-2 px-4 rounded-md transition-colors text-sm font-semibold hover:bg-transparent hover:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100"
                    >
                        Detalles
                    </button>
                    {project.link && (
                        <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 text-center py-2 px-4 rounded-md transition-colors text-sm font-semibold hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                        >
                            Ver Proyecto
                        </a>
                    )}
                    {project.github && (
                        <a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 text-center py-2 px-4 rounded-md transition-colors text-sm font-semibold hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Github className="w-4 h-4" />
                                <span>Repositorio</span>
                            </div>
                        </a>
                    )}
                </div>
            </div>


        </motion.div>
    );
};

export default ProjectCard;