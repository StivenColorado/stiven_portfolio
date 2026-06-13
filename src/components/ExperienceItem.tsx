import React, { type ReactNode } from 'react';

interface ExperienceItemProps {
  title: string;
  description: string;
  link?: string;
  date: string;
  contact?: string;
  children?: ReactNode; // Para el slot (ícono)
}

const ExperienceItem: React.FC<ExperienceItemProps> = ({
  title,
  description,
  link,
  date,
  contact,
  children
}) => {
  return (
    <div className="relative pl-4 sm:pl-6">
      {/* Icono/Badge */}
      <span className="absolute flex items-center justify-center w-6 h-6 bg-zinc-900 rounded-full -left-10 ring-8 ring-white dark:ring-zinc-950 dark:bg-zinc-100">
        {children}
      </span>
      
      {/* Título con contacto opcional */}
      <h3 className="flex flex-wrap items-center gap-2 mb-1 text-lg font-semibold text-zinc-900 mt-2 dark:text-white">
        {title}
        {contact && (
          <a
            href={`https://api.whatsapp.com/send?phone=${contact.replace(/\D+/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-medium px-2 py-0.5 rounded cursor-pointer hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
            title={`Contactar al ${title.split(" ")[0]}`}
          >
            {contact}
          </a>
        )}
      </h3>
      
      {/* Fecha */}
      <time className="block mb-2 text-xs font-mono uppercase tracking-wider leading-none text-zinc-500 dark:text-zinc-400">
        {date}
      </time>

      {/* Descripción */}
      <p className="mb-4 text-base font-normal text-zinc-600 dark:text-gray-400 text-pretty">
        {description}
      </p>
      
      {/* Link opcional (descomentado) */}
      {link && link !== "#" && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 focus:outline-none transition-colors"
        >
          <svg
            className="w-3.5 h-3.5 me-2.5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M14.707 7.793a1 1 0 0 0-1.414 0L11 10.086V1.5a1 1 0 0 0-2 0v8.586L6.707 7.793a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.416 0l4-4a1 1 0 0 0-.002-1.414Z" />
            <path d="M18 12h-2.55l-2.975 2.975a3.5 3.5 0 0 1-4.95 0L4.55 12H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm-3 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          Ver más detalles
        </a>
      )}
    </div>
  );
};

export default ExperienceItem;