export type OS = "windows" | "macos" | "android" | "ios" | "linux" | "other";
export type Device = "mobile" | "tablet" | "desktop" | "bot";

export interface Visit {
    id: number;
    ts: number;
    ip: string;
    country: string | null;
    city: string | null;
    ua: string | null;
    os: OS;
    device: Device;
    path: string;
    referrer: string | null;
}

export interface Count {
    key: string;
    n: number;
}

export interface Stats {
    days: number;
    total: number;
    byDay: { day: string; n: number }[];
    countries: Count[];
    paths: Count[];
    referrers: Count[];
    os: Count[];
    devices: Count[];
}

export type DeleteTarget =
    | { ids: number[] }
    | { ip: string }
    | { filter: Partial<Record<"os" | "device" | "country" | "path", string>> & { from?: number; to?: number } };

export class ApiError extends Error {
    status: number;
    retryAfter?: number;
    code?: string;
    constructor(status: number, retryAfter?: number, code?: string) {
        super(`api_${status}`);
        this.status = status;
        this.retryAfter = retryAfter;
        this.code = code;
    }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const res = await fetch(`/api/admin/${path}`, {
        method,
        credentials: "same-origin",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
        const retry = Number.parseInt(res.headers.get("Retry-After") ?? "", 10);
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, Number.isFinite(retry) ? retry : undefined, body?.error);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const adminApi = {
    login: (email: string, password: string) => request<{ ok: true; email: string }>("login", "POST", { email, password }),
    forgot: (email: string) => request<void>("forgot", "POST", { email }),
    reset: (token: string, password: string) => request<{ ok: true }>("reset", "POST", { token, password }),
    changePassword: (current: string, next: string) => request<{ ok: true }>("password", "POST", { current, next }),
    logout: () => request<{ ok: true }>("logout", "POST"),
    me: () => request<{ email: string }>("me"),
    stats: (days: number) => request<Stats>(`stats?days=${days}`),
    deleteVisits: (target: DeleteTarget) => request<{ deleted: number }>("visits/delete", "POST", target),
    countVisits: (target: DeleteTarget) => request<{ matched: number }>("visits/delete", "POST", { ...target, dryRun: true }),
    visits: (limit = 50, before?: number) =>
        request<{ visits: Visit[] }>(`visits?limit=${limit}${before === undefined ? "" : `&before=${before}`}`),
};
