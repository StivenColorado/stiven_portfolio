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
      <span className="absolute flex items-center justify-center w-6 h-6 bg-purple-400 rounded-full -left-10 ring-8 ring-purple-500 dark:ring-gray-900 dark:bg-blue-900">
        {children}
      </span>
      
      {/* Título con contacto opcional */}
      <h3 className="flex flex-wrap items-center gap-2 mb-1 text-lg font-semibold text-white/50 mt-2 dark:text-white">
        {title}
        {contact && (
          <a
            href={`https://api.whatsapp.com/send?phone=${contact.replace(/\D+/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-orange-200 text-blue-950 text-sm font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-white cursor-pointer hover:bg-orange-300 transition-colors"
            title={`Contactar al ${title.split(" ")[0]}`}
          >
            {contact}
          </a>
        )}
      </h3>
      
      {/* Fecha */}
      <time className="block mb-2 text-sm font-normal leading-none text-sky-200 dark:text-gray-500">
        {date}
      </time>
      
      {/* Descripción */}
      <p className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400 text-pretty">
        {description}
      </p>
      
      {/* Link opcional (descomentado) */}
      {link && link !== "#" && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-gray-100 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700 transition-colors"
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