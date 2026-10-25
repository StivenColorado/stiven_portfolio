import { request, requestBlob } from "./adminApi";
import type {
    AdminClient, ClientInput, ClientStatus, ContractDoc, ContractLang, ContractTemplate, DocInput, NewDocInput,
    OwnerProfile, SendInput, Strokes, TemplateInput,
} from "../types/contracts";

const base = "contracts";
type Item<T> = { item: T };

export const clientsApi = {
    list: async (status: ClientStatus | "all" = "all", q = "") => {
        const p = new URLSearchParams({ status });
        if (q.trim()) p.set("q", q.trim());
        return (await request<{ items: AdminClient[] }>(`${base}/clients?${p}`)).items;
    },
    get: async (id: number) => (await request<Item<AdminClient>>(`${base}/clients/${id}`)).item,
    create: async (input: ClientInput) => (await request<Item<AdminClient>>(`${base}/clients`, "POST", input)).item,
    update: async (id: number, input: ClientInput) => (await request<Item<AdminClient>>(`${base}/clients/${id}`, "PUT", input)).item,
    setStatus: async (id: number, status: ClientStatus) => (await request<Item<AdminClient>>(`${base}/clients/${id}/status`, "POST", { status })).item,
    remove: (id: number) => request<void>(`${base}/clients/${id}`, "DELETE"),
    docs: async (id: number) => (await request<{ items: ContractDoc[] }>(`${base}/clients/${id}/docs`)).items,
    createDoc: async (id: number, input: NewDocInput) => (await request<Item<ContractDoc>>(`${base}/clients/${id}/docs`, "POST", input)).item,
};

export const templatesApi = {
    list: async (lang?: ContractLang) => (await request<{ items: ContractTemplate[] }>(`${base}/templates${lang ? `?lang=${lang}` : ""}`)).items,
    get: async (id: number) => (await request<Item<ContractTemplate>>(`${base}/templates/${id}`)).item,
    create: async (input: TemplateInput) => (await request<Item<ContractTemplate>>(`${base}/templates`, "POST", input)).item,
    update: async (id: number, input: TemplateInput) => (await request<Item<ContractTemplate>>(`${base}/templates/${id}`, "PUT", input)).item,
    remove: (id: number) => request<void>(`${base}/templates/${id}`, "DELETE"),
    restore: async (id: number) => (await request<Item<ContractTemplate>>(`${base}/templates/${id}/restore`, "POST", {})).item,
};

export interface PreviewPayload {
    docId?: number;
    title?: string;
    body?: string;
    variables?: Record<string, string>;
    kind?: string;
    lang?: ContractLang;
    clientId?: number;
}

export const previewPdf = (payload: PreviewPayload, signal?: AbortSignal) => requestBlob(`${base}/preview-pdf`, payload, signal);

export interface SendResult { item: ContractDoc; link: string }

export const docsApi = {
    get: async (id: number) => (await request<Item<ContractDoc>>(`${base}/docs/${id}`)).item,
    update: async (id: number, input: DocInput) => (await request<Item<ContractDoc>>(`${base}/docs/${id}`, "PUT", input)).item,
    send: (id: number, input: SendInput) => request<SendResult>(`${base}/docs/${id}/send`, "POST", input),
    resend: (id: number, input: { email?: string; expiresInDays: number }) => request<SendResult>(`${base}/docs/${id}/resend`, "POST", input),
    sign: async (id: number, input: { signature: Strokes | null; useSaved: boolean }) =>
        (await request<Item<ContractDoc>>(`${base}/docs/${id}/sign`, "POST", input)).item,
    revoke: async (id: number, note?: string) => (await request<Item<ContractDoc>>(`${base}/docs/${id}/revoke`, "POST", { note })).item,
    cancel: async (id: number, reason?: string) => (await request<Item<ContractDoc>>(`${base}/docs/${id}/cancel`, "POST", { reason })).item,
    remove: (id: number) => request<void>(`${base}/docs/${id}`, "DELETE"),
    pdfUrl: (id: number) => `/api/admin/${base}/docs/${id}/pdf`,
};

export const contractsSettingsApi = {
    getProfile: async () => (await request<{ profile: OwnerProfile }>(`${base}/settings/profile`)).profile,
    setProfile: async (profile: OwnerProfile) => (await request<{ profile: OwnerProfile }>(`${base}/settings/profile`, "PUT", profile)).profile,
    getSignature: async () => (await request<{ strokes: Strokes | null }>(`${base}/settings/signature`)).strokes,
    setSignature: async (strokes: Strokes) => (await request<{ strokes: Strokes | null }>(`${base}/settings/signature`, "PUT", { strokes })).strokes,
};
