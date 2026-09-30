import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { PROJECTS } from "../data/projects";
import ProjectCard from "../components/ProjectCard";
import ProjectDetailModal from "../components/ProjectDetailModal";
import Select from "../components/ui/Select";
import type { Option } from "../components/ui/Select";
import { X } from "lucide-react";
import type { ProjectKind, ProjectType } from "../types/types";

const KINDS: { value: ProjectKind; label: string }[] = [
    { value: 'case-study', label: 'Confidenciales' },
    { value: 'demo', label: 'Demos' },
    { value: 'oss', label: 'Open source' },
];

const TAG_ICONS = new Map(PROJECTS.flatMap((p) => p.tags.map((t) => [t.name, t.icon] as const)));
const TAG_NAMES = [...TAG_ICONS.keys()].sort((a, b) => a.localeCompare(b));

const OPTIONS: Option[] = [
    ...KINDS.map((k) => ({ value: `kind:${k.value}`, label: k.label, group: 'Tipo' })),
    ...TAG_NAMES.map((name) => ({ value: `tag:${name}`, label: name, group: 'Tecnologías', icon: TAG_ICONS.get(name) })),
];

const csv = (raw: string | null) => (raw ? raw.split(',').filter(Boolean) : []);

const Projects: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const [detail, setDetail] = useState<ProjectType | null>(null);
    const kinds = csv(params.get('kind'));
    const tags = csv(params.get('tag'));
    const selected = [...kinds.map((k) => `kind:${k}`), ...tags.map((t) => `tag:${t}`)];

    const visible = useMemo(
        () => PROJECTS.filter((p) => (!kinds.length || kinds.includes(p.kind)) && (!tags.length || p.tags.some((t) => tags.includes(t.name)))),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [params],
    );

    const apply = (values: string[]) => {
        const next = new URLSearchParams(params);
        for (const key of ['kind', 'tag']) {
            const list = values.filter((v) => v.startsWith(`${key}:`)).map((v) => v.slice(key.length + 1));
            if (list.length) next.set(key, list.join(','));
            else next.delete(key);
        }
        setParams(next, { replace: true });
    };

    const labelOf = (v: string) => (v.startsWith('kind:') ? KINDS.find((k) => k.value === v.slice(5))?.label : undefined) ?? v.slice(v.indexOf(':') + 1);

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-12 md:py-20">
            <span className="eyebrow">Proyectos</span>
            <h1 className="mb-8 mt-2 text-5xl text-ink md:text-7xl">Lo que he construido</h1>

            <div className="mb-8 flex flex-col gap-4">
                <Select label="Intereses" multiple clearable options={OPTIONS} value={selected} onChange={apply} searchPlaceholder="Buscar tipo o tecnología…" className="w-full md:max-w-sm" />
                <div className="flex flex-wrap items-center gap-2" aria-live="polite">
                    {selected.map((v) => (
                        <span key={v} className="tag">
                            {labelOf(v)}
                            <button type="button" aria-label={`Quitar ${labelOf(v)}`} onClick={() => apply(selected.filter((x) => x !== v))} className="cursor-pointer leading-none hover:opacity-60 focus-visible:outline-2 focus-visible:outline-lens">
                                <X aria-hidden="true" className="size-3.5" strokeWidth={3} />
                            </button>
                        </span>
                    ))}
                    {selected.length > 0 && (
                        <button type="button" onClick={() => apply([])} className="font-mono text-xs font-bold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-lens">Limpiar todo</button>
                    )}
                    <span className="eyebrow ml-auto">{visible.length} {visible.length === 1 ? 'proyecto' : 'proyectos'}</span>
                </div>
            </div>

            <div data-slot="k" className="h-32 md:hidden" aria-hidden="true" />

            {visible.length === 0 ? (
                <p className="text-muted">Ningún proyecto coincide con estos filtros.</p>
            ) : (
                <div className="grid grid-cols-1 gap-8 pr-2 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((p) => <ProjectCard key={p.slug} project={p} onOpen={setDetail} />)}
                </div>
            )}

            {detail && <ProjectDetailModal project={detail} onClose={() => setDetail(null)} />}
        </div>
    );
};

export default Projects;
