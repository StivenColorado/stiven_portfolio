import React from "react";
import { motion } from "framer-motion";
import { type ProjectType } from "../types/types";
import Tag from "./Tag";



interface MediaItem {
    type: 'image' | 'video';
    src: string;
}

interface Props {
    project: ProjectType;
    onImageClick?: (mediaItems: MediaItem[], index: number) => void;
}

const ProjectCard: React.FC<Props> = ({ project, onImageClick }) => {
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
            className="bg-gray-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            {/* Thumbnail */}
            <div 
                className="relative h-48 bg-gray-700 cursor-pointer overflow-hidden group"
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
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{project.title}</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{project.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag) => (
                        <Tag key={tag.name} tag={tag} />
                    ))}
                </div>

                <div className="flex gap-3 mt-4">
                    {project.link && (
                        <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                            Ver Proyecto
                        </a>
                    )}
                    {project.github && (
                        <a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-center py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                            Código
                        </a>
                    )}
                </div>
            </div>


        </motion.div>
    );
};

export default ProjectCard;