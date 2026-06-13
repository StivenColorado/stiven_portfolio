import React from "react";

const PHONE = "573218956487";
const MESSAGE = "¡Hola Stiven! Vi tu portafolio y me gustaría hablar contigo.";

const WhatsAppButton: React.FC = () => {
    const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(MESSAGE)}`;

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbeme por WhatsApp"
            title="Escríbeme por WhatsApp"
            className="group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full
                       bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900
                       border-2 border-zinc-900 dark:border-zinc-100
                       p-3.5 md:p-4 transition-all duration-300
                       hover:scale-110
                       focus:outline-none focus:ring-4 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/30"
        >
            {/* Halo pulsante */}
            <span className="absolute inset-0 rounded-full bg-zinc-900 dark:bg-zinc-100 opacity-30 animate-ping -z-10" />
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 md:w-7 md:h-7"
                aria-hidden="true"
            >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
            </svg>
            <span className="hidden md:inline-block max-w-0 overflow-hidden whitespace-nowrap
                             text-sm font-medium transition-all duration-300
                             group-hover:max-w-[10rem] group-hover:ml-1">
                WhatsApp
            </span>
        </a>
    );
};

export default WhatsAppButton;
