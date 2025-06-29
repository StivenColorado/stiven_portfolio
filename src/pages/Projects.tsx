import { observer } from "mobx-react";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../context/StoreContext";
import Layout from "../components/Layout";
import ProjectCard from "../components/ProjectCard";
import { type ProjectType } from "../types/types";

interface MediaItem {
    type: 'image' | 'video';
    src: string;
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
    })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
};

const Projects: React.FC = () => {
    const { portfolioStore } = useStore();
    const [isVisible, setIsVisible] = useState(false);
    const [galleryState, setGalleryState] = useState<{
        isOpen: boolean;
        mediaItems: MediaItem[];
        currentIndex: number;
    }>({
        isOpen: false,
        mediaItems: [],
        currentIndex: 0
    });
    
    const [[page, direction], setPage] = useState([0, 0]);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const openGallery = (mediaItems: MediaItem[], index: number) => {
        setGalleryState({
            isOpen: true,
            mediaItems,
            currentIndex: index
        });
        setPage([index, 0]);
        document.body.style.overflow = 'hidden';
    };

    const closeGallery = useCallback(() => {
        setGalleryState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'unset';
    }, []);

    const paginate = useCallback((newDirection: number) => {
        const newIndex = galleryState.currentIndex + newDirection;
        if (newIndex >= 0 && newIndex < galleryState.mediaItems.length) {
            setPage([newIndex, newDirection]);
            setGalleryState(prev => ({ ...prev, currentIndex: newIndex }));
        }
    }, [galleryState.currentIndex, galleryState.mediaItems.length]);

    useEffect(() => {
        // Handle keyboard navigation
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!galleryState.isOpen) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    paginate(-1);
                    break;
                case 'ArrowRight':
                    paginate(1);
                    break;
                case 'Escape':
                    closeGallery();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [galleryState.isOpen, paginate, closeGallery]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <Layout>
            <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-7xl mx-auto text-center mb-16"
                >
                    <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
                        Mis Proyectos
                    </h1>
                    <p className="text-xl text-gray-300">
                        Explora mi colección de proyectos desarrollados con las últimas tecnologías
                    </p>
                    <div className="mt-8 h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full" />
                </motion.div>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate={isVisible ? "show" : "hidden"}
                    className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4"
                >
                    {portfolioStore.projects.map((project: ProjectType) => (
                        <motion.div key={project.title} variants={item}>
                            <ProjectCard 
                                key={project.title} 
                                project={project} 
                                onImageClick={openGallery}
                            />
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-16 text-center text-gray-400"
                >
                    <p>Mostrando {portfolioStore.totalProjects} proyectos</p>
                </motion.div>

                {/* Gallery Modal */}
                <AnimatePresence custom={direction} initial={false}>
                    {galleryState.isOpen && galleryState.mediaItems.length > 0 && (
                        <motion.div
                            className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeGallery}
                        >
                            <button 
                                className="absolute top-4 right-6 text-white text-4xl z-10 hover:text-blue-400 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeGallery();
                                }}
                                aria-label="Cerrar galería"
                            >
                                &times;
                            </button>

                            <div className="relative w-full max-w-6xl h-[80vh] flex items-center">
                                <button 
                                    className="absolute left-4 z-10 p-2 text-white text-2xl hover:text-blue-400 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        paginate(-1);
                                    }}
                                    disabled={galleryState.currentIndex === 0}
                                    aria-label="Anterior"
                                >
                                    ❮
                                </button>

                                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                    <AnimatePresence custom={direction} initial={false}>
                                        <motion.div
                                            key={page}
                                            custom={direction}
                                            variants={variants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={{
                                                x: { type: "spring", stiffness: 300, damping: 30 },
                                                opacity: { duration: 0.2 }
                                            }}
                                            drag="x"
                                            dragConstraints={{ left: 0, right: 0 }}
                                            dragElastic={1}
                                            onDragEnd={(_, { offset, velocity }) => {
                                                const swipe = swipePower(offset.x, velocity.x);
                                                if (swipe < -swipeConfidenceThreshold) {
                                                    paginate(1);
                                                } else if (swipe > swipeConfidenceThreshold) {
                                                    paginate(-1);
                                                }
                                            }}
                                            className="w-full h-full flex items-center justify-center absolute"
                                        >
                                            {galleryState.mediaItems[galleryState.currentIndex]?.type === 'image' ? (
                                                <img 
                                                    src={galleryState.mediaItems[galleryState.currentIndex]?.src} 
                                                    alt={`Gallery item ${galleryState.currentIndex + 1}`}
                                                    className="max-h-full max-w-full object-contain"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <video 
                                                    src={galleryState.mediaItems[galleryState.currentIndex]?.src} 
                                                    className="max-h-full max-w-full object-contain"
                                                    controls
                                                    autoPlay
                                                    loop
                                                    playsInline
                                                    draggable={false}
                                                />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <button 
                                    className="absolute right-4 z-10 p-2 text-white text-2xl hover:text-blue-400 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        paginate(1);
                                    }}
                                    disabled={galleryState.currentIndex === galleryState.mediaItems.length - 1}
                                    aria-label="Siguiente"
                                >
                                    ❯
                                </button>
                            </div>

                            <div className="mt-4 text-white">
                                {galleryState.currentIndex + 1} / {galleryState.mediaItems.length}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
};

export default observer(Projects);

