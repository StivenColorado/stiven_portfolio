import React, { useEffect, useRef, useState } from 'react';
import type { ProjectType } from '../types/types'
interface GistModalProps {
    gistUrl: string;
    onClose: () => void;
    project?: ProjectType;
}

const GistModal: React.FC<GistModalProps> = ({ gistUrl, onClose, project }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    const [gistId, setGistId] = useState<string>('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Extraer el ID del gist de la URL
        const match = gistUrl.match(/gist\.github\.com\/([^\/]+\/)?([a-f0-9]+)/i);
        if (match && match[2]) {
            setGistId(match[2]);
        } else {
            // Si no se puede extraer el ID, intentar con la URL completa
            setGistId(gistUrl);
        }

        // Activar animación de entrada
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 10);

        return () => clearTimeout(timer);
    }, [gistUrl]);

    const handleClose = () => {
        setIsVisible(false);
        // Esperar a que termine la animación antes de cerrar
        setTimeout(() => onClose(), 300);
    };

    return (
        <div
            className="top-[8vh] h-[92vh] md:top-[10vh] md:h-[90vh] fixed inset-0 z-50 flex items-center justify-end overflow-hidden transition-all duration-300 ease-in-out"
            style={{ backgroundColor: isVisible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)' }}
        >
            <div
                ref={modalRef}
                className={`bg-gray-900 rounded-l-lg w-full max-w-2xl h-full flex flex-col transform transition-all duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-white font-semibold">Fraccion de codigo {project?.title} </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        aria-label="Cerrar modal"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-auto">
                    {gistId ? (
                        <iframe
                            src={`https://gist.github.com/StivenColorado/${gistId}.pibb`}
                            className="w-full h-full border-0"
                            title="Github Gist"
                            sandbox="allow-scripts allow-same-origin"
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400">No se pudo cargar el código</p>
                        </div>
                    )}
                    <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-800">
                        <a
                            href={`https://gist.github.com/StivenColorado/${gistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline inline-flex items-center gap-1 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.386-1.332-1.755-1.332-1.755-1.087-.744.084-.729.084-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.417-1.305.758-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .319.216.694.825.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span>Ver en GitHub Gist</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GistModal;
