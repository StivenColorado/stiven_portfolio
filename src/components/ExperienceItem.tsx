import React, { type ReactNode } from 'react';
import type { ExperienceItemType } from '../data/experience';

interface ExperienceItemProps {
  experience: ExperienceItemType;
  onSelect: () => void;
  children?: ReactNode; // Para el slot (ícono)
}

/**
 * Tarjeta COMPACTA de experiencia, pensada para escaneo rápido: fecha, cargo,
 * empresa, un resumen de una línea y el stack clave. La descripción completa
 * vive en el modal de detalle ([[ExperienceDetailModal]]), que se abre al
 * hacer clic en cualquier parte de la tarjeta.
 */
const ExperienceItem: React.FC<ExperienceItemProps> = ({ experience, onSelect, children }) => {
  const { role, company, title, date, summary, description, stack } = experience;

  return (
    <div className="relative pl-4 sm:pl-6">
      {/* Icono/Badge */}
      <span className="absolute flex items-center justify-center w-6 h-6 bg-zinc-900 rounded-full -left-10 ring-8 ring-white dark:ring-zinc-950 dark:bg-zinc-100">
        {children}
      </span>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`Ver detalle de ${role ?? title}`}
        className="group w-full text-left rounded-lg border-2 border-transparent hover:border-zinc-900 dark:hover:border-zinc-100 hover:bg-white dark:hover:bg-zinc-900/60 transition-all px-3 py-2.5 -mx-1 hover:shadow-[4px_4px_0_0_#18181b] dark:hover:shadow-[4px_4px_0_0_#fafafa] hover:-translate-y-0.5 cursor-pointer"
      >
        {/* Fecha */}
        <time className="block mb-1 text-[11px] font-mono uppercase tracking-wider leading-none text-zinc-500 dark:text-zinc-400">
          {date}
        </time>

        {/* Cargo + empresa */}
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white leading-snug">
          {role ?? title}
          {company && (
            <span className="font-normal text-zinc-500 dark:text-zinc-400"> · {company}</span>
          )}
        </h3>

        {/* Resumen de una línea */}
        <p className="mt-1 text-sm text-zinc-600 dark:text-gray-400 text-pretty line-clamp-2">
          {summary ?? description}
        </p>

        {/* Stack + CTA */}
        <div className="mt-2 flex items-center flex-wrap gap-1.5">
          {stack?.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5"
            >
              {tech}
            </span>
          ))}
          <span className="ml-auto text-xs font-mono font-medium text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap">
            Ver detalle →
          </span>
        </div>
      </button>
    </div>
  );
};

export default ExperienceItem;
