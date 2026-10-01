import type { AdminProject, Kind, ProjectInput, ProjectTranslatable } from "../../../types/content";

export type FullProject = AdminProject;

export interface EnForm { title: string; summary: string; description: string; highlights: string[]; client: string }

export interface ProjectForm {
    title: string;
    slug: string;
    summary: string;
    description: string;
    kind: Kind;
    year: string;
    client: string;
    private: boolean;
    nda: boolean;
    highlights: string[];
    demo: string;
    repo: string;
    gist: string;
    tags: string[];
    images: string[];
    videos: string[];
    githubRepo: string;
    workingOn: boolean;
    en: EnForm;
}

export const EMPTY_FORM: ProjectForm = {
    title: "", slug: "", summary: "", description: "", kind: "demo", year: String(new Date().getFullYear()), client: "",
    private: false, nda: false, highlights: [], demo: "", repo: "", gist: "", tags: [], images: [], videos: [],
    githubRepo: "", workingOn: false,
    en: { title: "", summary: "", description: "", highlights: [], client: "" },
};

export const slugify = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");

export function formFromProject(p: FullProject): ProjectForm {
    const en: ProjectTranslatable = p.i18n?.en ?? {};
    return {
        title: p.title, slug: p.slug, summary: p.summary, description: p.description, kind: p.kind,
        year: p.year === null ? "" : String(p.year), client: p.client ?? "", private: p.private, nda: p.nda,
        highlights: p.highlights, demo: p.links?.demo ?? "", repo: p.links?.repo ?? "", gist: p.links?.gist ?? "",
        tags: p.tags, images: p.images, videos: p.videos, githubRepo: p.githubRepo ?? "", workingOn: p.workingOn ?? false,
        en: { title: en.title ?? "", summary: en.summary ?? "", description: en.description ?? "", highlights: en.highlights ?? [], client: en.client ?? "" },
    };
}

export function inputFromForm(f: ProjectForm, featured = false): ProjectInput {
    const links: ProjectInput["links"] = {};
    if (f.demo.trim()) links.demo = f.demo.trim();
    if (f.repo.trim()) links.repo = f.repo.trim();
    if (f.gist.trim()) links.gist = f.gist.trim();
    const en: ProjectTranslatable = {};
    if (f.en.title.trim()) en.title = f.en.title.trim();
    if (f.en.summary.trim()) en.summary = f.en.summary.trim();
    if (f.en.description.trim()) en.description = f.en.description.trim();
    if (f.en.highlights.length) en.highlights = f.en.highlights;
    if (f.en.client.trim()) en.client = f.en.client.trim();
    const year = Number.parseInt(f.year, 10);
    const extras: Pick<ProjectInput, "i18n" | "githubRepo" | "workingOn"> = {};
    if (Object.keys(en).length) extras.i18n = { en };
    if (f.githubRepo.trim()) extras.githubRepo = f.githubRepo.trim();
    if (f.workingOn) extras.workingOn = true;
    return {
        slug: f.slug.trim(), title: f.title.trim(), summary: f.summary.trim(), description: f.description.trim(), kind: f.kind,
        year: Number.isFinite(year) ? year : null, client: f.client.trim() || null, links, private: f.private, nda: f.nda,
        featured, highlights: f.highlights, images: f.images, videos: f.videos, tags: f.tags, ...extras,
    };
}

export const serialize = (f: ProjectForm) => JSON.stringify(f);
