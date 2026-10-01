import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicExperience } from '../lib/content';

interface ExperienceItemProps {
  experience: PublicExperience;
  onSelect: () => void;
  children?: ReactNode;
}

/** Tarjeta compacta para escaneo rápido; el detalle completo vive en ExperienceDetailModal. */
const ExperienceItem: React.FC<ExperienceItemProps> = ({ experience, onSelect, children }) => {
  const { t } = useTranslation();
  const { role, company, title, date, summary, description, stack } = experience;

  return (
    <div className="relative pl-4 sm:pl-6">
      <span className="absolute -left-10 flex h-6 w-6 items-center justify-center bg-ink">
        {children}
      </span>

      <button
        type="button"
        onClick={onSelect}
        aria-label={t("experience.viewDetailAria", { name: role ?? title })}
        className="group window w-full cursor-pointer px-3 py-2.5 text-left shadow-[var(--shadow-hard-sm)] transition-transform hover:translate-x-px hover:translate-y-px"
      >
        <time className="eyebrow mb-1 block leading-none">{date}</time>

        <h3 className="text-base leading-snug text-ink sm:text-lg">
          {role ?? title}
          {company && <span className="text-muted"> · {company}</span>}
        </h3>

        <p className="mt-1 line-clamp-2 text-pretty text-sm text-muted">
          {summary ?? description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {stack?.slice(0, 4).map((tech) => (
            <span key={tech} className="tag !px-1.5 !py-0.5 !text-[11px]">
              {tech}
            </span>
          ))}
          <span className="ml-auto whitespace-nowrap font-mono text-xs text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {t("experience.viewDetail")} →
          </span>
        </div>
      </button>
    </div>
  );
};

export default ExperienceItem;
