import type { Visit } from "../../lib/api";

export const FILTER_KEYS = ["os", "device", "country", "path"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterValues = Record<FilterKey, string>;

export function matches(v: Visit, f: FilterValues): boolean {
    return FILTER_KEYS.every((k) => !f[k] || (v[k] ?? "") === f[k]);
}
