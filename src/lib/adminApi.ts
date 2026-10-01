import { ApiError } from "./api";
import { invalidateContent } from "./content";
import type {
    AdminExperience, AdminProject, AdminService, AuditEntry, ExperienceInput, MediaUpload, ProjectInput,
    ServiceInput, Status, StatusFilter,
} from "../types/content";

export { ApiError };

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function onUnauthorized(fn: Listener): () => void {
    unauthorizedListeners.add(fn);
    return () => { unauthorizedListeners.delete(fn); };
}

interface ErrorBody { error?: string; fields?: Record<string, string> }

function toError(status: number, retryHeader: string | null, body: ErrorBody | null): ApiError {
    const retry = Number.parseInt(retryHeader ?? "", 10);
    if (status === 401) unauthorizedListeners.forEach((fn) => fn());
    return new ApiError(status, Number.isFinite(retry) ? retry : undefined, body?.error, body?.fields);
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const result = await send<T>(path, method, body);
    if (method !== "GET" && CONTENT_PATH.test(path)) invalidateContent();
    return result;
}

const CONTENT_PATH = /^(projects|services|experience)(\/|$)/;

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api/admin/${path}`, {
        method,
        credentials: "same-origin",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw toError(res.status, res.headers.get("Retry-After"), (await res.json().catch(() => null)) as ErrorBody | null);
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const isValidation = (err: unknown): err is ApiError & { fields: Record<string, string> } =>
    err instanceof ApiError && err.status === 400 && !!err.fields;
export const isConflict = (err: unknown): err is ApiError => err instanceof ApiError && err.status === 409;
export const isUnauthorized = (err: unknown): err is ApiError => err instanceof ApiError && err.status === 401;

export interface ListParams { status?: StatusFilter; q?: string }

function entity<Admin extends { id: number }, Input>(name: "projects" | "services" | "experience") {
    return {
        list: async (params: ListParams = {}) => {
            const q = new URLSearchParams();
            if (params.status && params.status !== "all") q.set("status", params.status);
            if (params.q?.trim()) q.set("q", params.q.trim());
            const qs = q.toString();
            return (await request<{ items: Admin[] }>(`${name}${qs ? `?${qs}` : ""}`)).items;
        },
        get: async (id: number) => (await request<{ item: Admin }>(`${name}/${id}`)).item,
        create: async (input: Input) => (await request<{ item: Admin }>(name, "POST", input)).item,
        update: async (id: number, input: Input) => (await request<{ item: Admin }>(`${name}/${id}`, "PUT", input)).item,
        setStatus: async (id: number, status: Status) => (await request<{ item: Admin }>(`${name}/${id}/status`, "POST", { status })).item,
        reorder: (ids: number[]) => request<void>(`${name}/reorder`, "POST", { ids }),
        remove: (id: number) => request<void>(`${name}/${id}`, "DELETE"),
    };
}

export const projectsApi = {
    ...entity<AdminProject, ProjectInput>("projects"),
    setFeatured: async (id: number, featured: boolean) =>
        (await request<{ item: AdminProject }>(`projects/${id}/featured`, "POST", { featured })).item,
};
export const servicesApi = entity<AdminService, ServiceInput>("services");
export const experienceApi = entity<AdminExperience, ExperienceInput>("experience");

export interface AuditParams { limit?: number; before?: number; action?: string; entity?: string }

export const auditApi = {
    list: async (params: AuditParams = {}) => {
        const q = new URLSearchParams();
        q.set("limit", String(params.limit ?? 50));
        if (params.before) q.set("before", String(params.before));
        if (params.action) q.set("action", params.action);
        if (params.entity) q.set("entity", params.entity);
        return (await request<{ items: AuditEntry[] }>(`audit?${q}`)).items;
    },
};

export function uploadMedia(file: Blob, name: string, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<MediaUpload> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/media");
        xhr.withCredentials = true;
        xhr.responseType = "json";
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response as MediaUpload);
            reject(toError(xhr.status, xhr.getResponseHeader("Retry-After"), xhr.response as ErrorBody | null));
        };
        xhr.onerror = () => reject(new ApiError(0));
        xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));
        signal?.addEventListener("abort", () => xhr.abort(), { once: true });
        const form = new FormData();
        form.append("file", file, name);
        xhr.send(form);
    });
}

/* GitHub (proyectos) */
export interface GithubRepo {
    fullName: string;
    private: boolean;
    pushedAt: string | null;
    description: string | null;
    htmlUrl: string;
}

export const githubApi = {
    repos: () => request<{ configured: boolean; repos: GithubRepo[] }>("github/repos"),
};
