import { Bot, Code2, Compass, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { SERVICES } from "../data/services";

const ICONS: Record<string, LucideIcon> = {
    asesoria: Compass,
    desarrollo: Code2,
    ia: Bot,
    seguridad: ShieldCheck,
};

export default function Services() {
    return (
        <div className="dither">
            <section id="servicios" data-scene="services" className="section scroll-mt-10">
                <h2 className="text-4xl text-ink md:text-5xl">Servicios</h2>
                <p className="mt-3 max-w-2xl text-muted">
                    Trabajo con pymes y grandes empresas, desde la definición técnica hasta la
                    puesta en producción.
                </p>
                <div data-slot="t" className="h-28 md:hidden" aria-hidden="true" />

                <ol className="mt-8 grid gap-6 md:grid-cols-2">
                    {SERVICES.map((service, index) => {
                        const Icon = ICONS[service.id] ?? Code2;
                        return (
                            <li key={service.id} className="window">
                                <div className="window-bar">
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="flex-1 truncate text-center">
                                        {`${new Date().getFullYear()}-${service.id}.svc`}
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
                                        Ver proyectos para clientes <span aria-hidden="true">↗</span>
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <div className="mt-8">
                    <a href="#contacto" className="btn btn-primary">
                        Hablemos
                    </a>
                </div>
            </section>
        </div>
    );
}
