import React, { useEffect } from "react";
import { motion } from "framer-motion";
import type { ExperienceItemType } from "../data/experience";

interface Props {
    experience: ExperienceItemType;
    onClose: () => void;
}

/**
 * Modal de DETALLE de una experiencia: la vista compacta del timeline solo
 * muestra el cargo, empresa, un resumen de una línea y el stack. Aquí se
 * despliega la descripción completa, el periodo, los enlaces y el contacto.
 */
const ExperienceDetailModal: React.FC<Props> = ({ experience, onClose }) => {
    const { role, company, title, date, description, stack, link, contact } = experience;

    useEffect(() => {
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    return (
        <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 rounded-lg shadow-[8px_8px_0_0_#18181b] dark:shadow-[8px_8px_0_0_#fafafa] w-full max-w-2xl max-h-[88vh] overflow-y-auto"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b-2 border-zinc-900 dark:border-zinc-100 px-6 py-4 flex items-start justify-between gap-4 z-10">
                    <div>
                        <time className="block mb-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            {date}
                        </time>
                        <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-snug">
                            {role ?? title}
                        </h2>
                        {company && (
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{company}</p>
                        )}
                    </div>
                    <button
                        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 text-2xl leading-none hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
                        onClick={onClose}
                        aria-label="Cerrar detalles"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Stack */}
                    {stack && stack.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {stack.map((tech) => (
                                <span
                                    key={tech}
                                    className="border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-medium px-2 py-0.5 rounded"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Descripción completa */}
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                        {description}
                    </p>

                    {/* Enlaces y contacto */}
                    {((link && link !== "#") || contact) && (
                        <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-zinc-900 dark:border-zinc-100">
                            {link && link !== "#" && (
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 px-5 rounded-md transition-colors text-sm font-semibold hover:bg-transparent hover:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100"
                                >
                                    Visitar sitio
                                </a>
                            )}
                            {contact && (
                                <a
                                    href={`https://api.whatsapp.com/send?phone=${contact.replace(/\D+/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 py-2 px-5 rounded-md transition-colors text-sm font-semibold flex items-center gap-2 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                                >
                                    Referencia: {contact}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ExperienceDetailModal;
