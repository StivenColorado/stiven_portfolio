import React, { useEffect, useRef } from 'react';
import { Github } from 'lucide-react';
import type { ProjectType } from '../types/types'

interface GistModalProps {
    gistUrl: string;
    onClose: () => void;
    project?: ProjectType;
}

const GIST_OWNER = 'StivenColorado';

/** Panel lateral con <dialog> nativo: el foco vuelve al disparador al desmontarse. */
const GistModal: React.FC<GistModalProps> = ({ gistUrl, onClose, project }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const match = gistUrl.match(/gist\.github\.com\/([^/]+\/)?([a-f0-9]+)/i);
    const gistId = match?.[2] ?? gistUrl;

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
            aria-label={project?.title ?? 'Código en GitHub Gist'}
            className="window m-0 ml-auto h-dvh max-h-none w-full max-w-2xl p-0 backdrop:bg-paper/60 backdrop:dither-dense [&:not([open])]:hidden"
        >
            <div className="flex h-full flex-col">
                <div className="window-bar">
                    <span className="window-dot" aria-hidden="true" />
                    <span className="window-dot" aria-hidden="true" />
                    <span className="flex-1 truncate text-center">{project?.slug ?? 'gist'}.gist</span>
                    <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-paper text-sm leading-none hover:bg-ink hover:text-paper"
                    aria-label="Cerrar modal"
                >
                    <span aria-hidden="true">×</span>
                </button>
                </div>
                <div className="flex-1 overflow-auto">
                    <iframe
                        src={`https://gist.github.com/${GIST_OWNER}/${gistId}.pibb`}
                        className="h-full w-full border-0"
                        title="Github Gist"
                        sandbox="allow-scripts allow-same-origin"
                        loading="lazy"
                    />
                </div>
                <div className="border-t-[length:var(--line)] border-ink p-4 text-center text-sm">
                    <a
                        href={`https://gist.github.com/${GIST_OWNER}/${gistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:bg-ink hover:text-paper"
                    >
                        <Github className="h-4 w-4" aria-hidden="true" />
                        Ver en GitHub Gist
                    </a>
                </div>
            </div>
        </dialog>
    );
};

export default GistModal;
