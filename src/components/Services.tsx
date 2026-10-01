import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useContent } from "../lib/content";
import { getServiceIcon } from "../lib/serviceIcons";
import { SkeletonBlocks, ContentError } from "./ContentState";

export default function Services() {
    const { t } = useTranslation();
    const { data, loading, error } = useContent();
    const services = data?.services ?? [];
    return (
        <div className="dither">
            <section className="section">
                <h1 className="text-5xl text-ink md:text-7xl">{t("services.title")}</h1>
                <p className="mt-3 max-w-2xl text-muted">{t("services.intro")}</p>
                <div data-slot="t" className="h-28 md:hidden" aria-hidden="true" />

                {loading && <SkeletonBlocks count={2} className="mt-8 grid gap-6 md:grid-cols-2" />}
                {error && <ContentError />}

                <ol className="mt-8 grid gap-6 md:grid-cols-2">
                    {services.map((service, index) => {
                        const Icon = getServiceIcon(service.icon);
                        return (
                            <li key={service.slug} className="window">
                                <div className="window-bar">
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="flex-1 truncate text-center">
                                        {`${new Date().getFullYear()}-${service.slug}.svc`}
                                    </span>
                                </div>
                                <div className="window-body flex h-full flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm" aria-hidden="true">
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <Icon size={20} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
                                        <h3 className="text-xl leading-tight text-ink">{service.title}</h3>
                                    </div>
                                    <p className="text-muted">{service.tagline}</p>
                                    <ul className="space-y-1.5 text-sm text-ink">
                                        {service.bullets.map((bullet) => (
                                            <li key={bullet} className="flex gap-2">
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-ink" aria-hidden="true" />
                                                {bullet}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        to="/projects?kind=case-study"
                                        className="mt-auto inline-flex items-center gap-1 pt-2 text-sm underline underline-offset-4 hover:bg-ink hover:text-paper"
                                    >
                                        {t("services.viewProjects")} <span aria-hidden="true">↗</span>
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <div className="mt-8">
                    <Link to="/contact" className="btn btn-primary">
                        {t("services.talk")}
                    </Link>
                </div>
            </section>
        </div>
    );
}
