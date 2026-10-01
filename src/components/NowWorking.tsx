import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useContent } from "../lib/content";
import ActiveBadge from "./ActiveBadge";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
];

function relativeTime(iso: string, lang: string) {
    const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
    const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ["minute", 60];
    return new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(Math.round(seconds / size), unit);
}

export default function NowWorking() {
    const { t, i18n } = useTranslation();
    const { data } = useContent();
    const projects = data?.projects.filter((p) => p.workingOn) ?? [];
    if (!projects.length) return null;
    const lang = i18n.resolvedLanguage ?? "es";

    return (
        <section aria-labelledby="now-title" className="window mt-8 max-w-2xl">
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate text-center">{t("experience.now.windowTitle")}</span>
            </div>
            <div className="window-body !p-3">
                <h2 id="now-title" className="text-lg leading-none">{t("experience.now.title")}</h2>
                <ul aria-label={t("experience.now.listAria")} className="mt-3 space-y-3">
                    {projects.map((p) => (
                        <li key={p.slug} className="flex flex-col gap-1.5 border-t-[length:var(--line)] border-ink pt-3 first:border-t-0 first:pt-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <Link
                                    to={`/projects?open=${encodeURIComponent(p.slug)}`}
                                    aria-label={t("experience.now.openProject", { title: p.title })}
                                    className="font-black underline decoration-2 underline-offset-4 hover:bg-ink hover:text-paper"
                                >
                                    {p.title}
                                </Link>
                                <ActiveBadge size="md" />
                            </div>
                            {p.activity && (
                                <p className="font-mono text-xs text-muted">
                                    {t("experience.now.lastActivity", { when: relativeTime(p.activity.pushedAt, lang) })}
                                    {" · "}
                                    {t("experience.now.commitsWeek", { count: p.activity.commitsWeek })}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
