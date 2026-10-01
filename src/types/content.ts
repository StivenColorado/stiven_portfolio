export type Status = "published" | "hidden" | "archived";
export type Kind = "demo" | "oss" | "case-study";

export interface PublicProject {
    slug: string;
    title: string;
    summary: string;
    description: string;
    kind: Kind;
    year: number | null;
    client: string | null;
    links: { demo?: string; repo?: string; gist?: string };
    private: boolean;
    nda: boolean;
    featured: boolean;
    highlights: string[];
    images: string[];
    videos: string[];
    tags: string[];
    workingOn: boolean;
    activity: ProjectActivity | null;
}

export interface PublicService {
    slug: string;
    title: string;
    tagline: string;
    bullets: string[];
    icon: string;
    proof: string[];
}

export interface PublicExperience {
    id: number;
    date: string;
    title: string;
    role: string | null;
    company: string | null;
    summary: string | null;
    stack: string[];
    description: string;
    link: string | null;
    contact: string | null;
}

export interface AdminMeta {
    status: Status;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
}

export interface ProjectI18n { en?: ProjectTranslatable }

export type AdminProject = PublicProject & AdminMeta & { id: number; githubRepo: string | null; i18n?: ProjectI18n };
export type AdminService = PublicService & AdminMeta & { id: number } & { i18n?: ServiceI18n };
export type AdminExperience = PublicExperience & AdminMeta & { i18n?: ExperienceI18n };

export type ProjectInput = Omit<PublicProject, "workingOn" | "activity"> & {
    workingOn?: boolean;
    githubRepo?: string | null;
    i18n?: ProjectI18n;
};
export type ServiceInput = PublicService & { i18n?: ServiceI18n };
export type ExperienceInput = Omit<PublicExperience, "id"> & { i18n?: ExperienceI18n };

export interface PublicContent {
    projects: PublicProject[];
    services: PublicService[];
    experience: PublicExperience[];
}

export interface AuditEntry {
    id: number;
    ts: number;
    email: string | null;
    ip: string | null;
    action: string;
    entity: string | null;
    entityId: string | number | null;
    summary: string | null;
}

export interface MediaUpload {
    url: string;
    type: "image" | "video";
    size: number;
}

export type StatusFilter = "all" | Status;

export interface ServiceI18n { en?: { title?: string; tagline?: string; bullets?: string[] } }
export interface ExperienceI18n { en?: { date?: string; title?: string; role?: string; summary?: string; description?: string } }

export interface ProjectTranslatable {
    title?: string;
    summary?: string;
    description?: string;
    highlights?: string[];
    client?: string;
}

export interface ProjectActivity {
    pushedAt: string;
    commitsWeek: number;
    commits: { message: string; date: string; url: string }[];
}
