import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PublicExperience } from "../lib/content";

interface Props {
    experience: PublicExperience;
    onClose: () => void;
}

/** Detalle completo de una experiencia con <dialog> nativo; devuelve el foco al disparador al desmontarse. */
const ExperienceDetailModal: React.FC<Props> = ({ experience, onClose }) => {
    const { t } = useTranslation();
    const { role, company, title, date, description, stack, link, contact } = experience;
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        const opener = document.activeElement as HTMLElement | null;
        if (dialog && !dialog.open) dialog.showModal();
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
            opener?.focus();
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
            aria-labelledby="exp-modal-title"
            className="window m-auto max-h-[88dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
        >
            <div className="window-bar sticky top-0 z-10">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">{date}.exp</span>
                <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-paper text-sm leading-none hover:bg-ink hover:text-paper"
                    aria-label={t("experience.close")}
                >
                    <span aria-hidden="true">×</span>
                </button>
            </div>

            <div className="border-b-[length:var(--line)] border-ink px-4 py-4 sm:px-6">
                <h2 id="exp-modal-title" className="text-2xl leading-tight">
                    {role ?? title}
                </h2>
                {company && <p className="mt-1 text-sm text-muted">{company}</p>}
            </div>

            <div className="space-y-6 p-4 sm:p-6">
                {stack && stack.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                        {stack.map((tech) => (
                            <li key={tech} className="tag">
                                {tech}
                            </li>
                        ))}
                    </ul>
                )}

                <p className="whitespace-pre-line leading-relaxed">{description}</p>

                {((link && link !== "#") || contact) && (
                    <div className="flex flex-wrap gap-3 border-t-[length:var(--line)] border-ink pt-4">
                        {link && link !== "#" && (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary text-sm">
                                {t("experience.visit")}
                            </a>
                        )}
                        {contact && (
                            <a
                                href={`https://api.whatsapp.com/send?phone=${contact.replace(/\D+/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn text-sm"
                            >
                                {t("experience.reference", { contact })}
                            </a>
                        )}
                    </div>
                )}
            </div>
        </dialog>
    );
};

export default ExperienceDetailModal;
