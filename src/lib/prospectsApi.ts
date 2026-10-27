import { request } from "./adminApi";
import type { Prospect, ProspectInput, ProspectNote, ProspectStatus } from "../types/prospects";

const base = "prospects";

export const prospectsApi = {
    list: async () => (await request<{ items: Prospect[] }>(base)).items,
    get: async (id: number) => (await request<{ item: Prospect }>(`${base}/${id}`)).item,
    detail: (id: number) => request<{ item: Prospect; notes: ProspectNote[] }>(`${base}/${id}`),
    create: async (input: ProspectInput) => (await request<{ item: Prospect }>(base, "POST", input)).item,
    update: async (id: number, input: ProspectInput) => (await request<{ item: Prospect }>(`${base}/${id}`, "PUT", input)).item,
    setStatus: async (id: number, status: ProspectStatus) => (await request<{ item: Prospect }>(`${base}/${id}/status`, "POST", { status })).item,
    remove: (id: number) => request<void>(`${base}/${id}`, "DELETE"),
    addNote: async (id: number, text: string) => (await request<{ note: ProspectNote }>(`${base}/${id}/notes`, "POST", { text })).note,
    removeNote: (id: number, noteId: number) => request<void>(`${base}/${id}/notes/${noteId}`, "DELETE"),
};
