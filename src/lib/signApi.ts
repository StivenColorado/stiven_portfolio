import { ApiError } from "./api";
import type { ClientData, SignResult, SignView, Strokes } from "../types/contracts";

const url = (token: string) => `/api/sign/${encodeURIComponent(token)}`;

async function call<T>(token: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    const res = await fetch(url(token), {
        method,
        credentials: "omit",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; fields?: Record<string, string> } | null;
        throw new ApiError(res.status, Number.parseInt(res.headers.get("Retry-After") ?? "", 10) || undefined, data?.error, data?.fields);
    }
    return (await res.json()) as T;
}

export const getSign = (token: string) => call<SignView>(token, "GET");
export const postSign = (token: string, body: { name: string; strokes: Strokes; accepted: true; clientData?: ClientData }) => call<SignResult>(token, "POST", body);
export const signPdfUrl = (token: string) => `${url(token)}/pdf`;
