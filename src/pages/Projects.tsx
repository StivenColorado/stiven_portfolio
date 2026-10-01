import React, { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useContent } from "../lib/content";
import { useDocumentMeta } from "../lib/seo";
import ProjectCard, { ProjectsError, ProjectsSkeleton } from "../components/ProjectCard";
import { tagOf } from "../components/fileName";
import ProjectDetailModal from "../components/ProjectDetailModal";
import Select from "../components/ui/Select";
import type { Option } from "../components/ui/Select";
import { X } from "lucide-react";
import type { PublicProject } from "../types/content";

const KIND_VALUES = ['case-study', 'demo', 'oss'] as const;

const csv = (raw: string | null) => (raw ? raw.split(',').filter(Boolean) : []);

const GRID = "grid grid-cols-1 gap-8 pr-2 md:grid-cols-2 xl:grid-cols-3";

const Projects: React.FC = () => {
    const { t } = useTranslation();
    const { data, loading, error } = useContent();
    useDocumentMeta({ title: t("projects.seo.title"), description: t("projects.seo.description") });
    const [params, setParams] = useSearchParams();
    const projects = useMemo(() => data?.projects ?? [], [data]);
    const openSlug = params.get('open');
    const detail = useMemo(() => (openSlug ? projects.find((p) => p.slug === openSlug) ?? null : null), [projects, openSlug]);
    const setOpen = (slug: string | null) => {
        const next = new URLSearchParams(params);
        if (slug) next.set('open', slug);
        else next.delete('open');
        setParams(next, { replace: true });
    };
    const kinds = csv(params.get('kind'));
    const tags = csv(params.get('tag'));
    const selected = [...kinds.map((k) => `kind:${k}`), ...tags.map((x) => `tag:${x}`)];

    const kindLabel = (k: string) => t(`projects.kind.${k}`, { defaultValue: k });

    const options = useMemo<Option[]>(() => {
        const icons = new Map(projects.flatMap((p) => p.tags.map((key) => [tagOf(key).name, tagOf(key).icon] as const)));
        const names = [...icons.keys()].sort((a, b) => a.localeCompare(b));
        return [
            ...KIND_VALUES.map((k) => ({ value: `kind:${k}`, label: t(`projects.kind.${k}`), group: t("projects.filter.groupKind") })),
            ...names.map((name) => ({ value: `tag:${name}`, label: name, group: t("projects.filter.groupTags"), icon: icons.get(name) })),
        ];
    }, [projects, t]);

    const visible = useMemo(
        () => projects.filter((p) => (!kinds.length || kinds.includes(p.kind)) && (!tags.length || p.tags.some((key) => tags.includes(tagOf(key).name)))),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [projects, params],
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

    const labelOf = (v: string) => (v.startsWith('kind:') ? kindLabel(v.slice(5)) : v.slice(v.indexOf(':') + 1));

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-12 md:py-20">
            <span className="eyebrow">{t("projects.eyebrow")}</span>
            <h1 className="mb-8 mt-2 text-5xl text-ink md:text-7xl">{t("projects.heading")}</h1>

            <div className="mb-8 flex flex-col gap-4">
                <Select label={t("projects.filter.label")} multiple clearable options={options} value={selected} onChange={apply} searchPlaceholder={t("projects.filter.search")} className="w-full md:max-w-sm" />
                <div className="flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
                    {selected.map((v) => (
                        <span key={v} className="tag">
                            {labelOf(v)}
                            <button type="button" aria-label={t("projects.filter.remove", { label: labelOf(v) })} onClick={() => apply(selected.filter((x) => x !== v))} className="cursor-pointer leading-none hover:opacity-60 focus-visible:outline-2 focus-visible:outline-lens">
                                <X aria-hidden="true" className="size-3.5" strokeWidth={3} />
                            </button>
                        </span>
                    ))}
                    {selected.length > 0 && (
                        <button type="button" onClick={() => apply([])} className="font-mono text-xs font-bold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-lens">{t("projects.filter.clear")}</button>
                    )}
                    {data && <span className="eyebrow ml-auto">{t("projects.count", { count: visible.length })}</span>}
                </div>
            </div>

            <div data-slot="k" className="h-32 md:hidden" aria-hidden="true" />

            {error ? (
                <ProjectsError />
            ) : loading ? (
                <ProjectsSkeleton className={GRID} />
            ) : visible.length === 0 ? (
                <p className="text-muted">{t("projects.filter.empty")}</p>
            ) : (
                <div className={GRID}>
                    {visible.map((p) => <ProjectCard key={p.slug} project={p} onOpen={(p: PublicProject) => setOpen(p.slug)} />)}
                </div>
            )}

            {detail && <ProjectDetailModal key={detail.slug} project={detail} onClose={() => setOpen(null)} />}
        </div>
    );
};

export default Projects;
