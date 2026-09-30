export const FILTER_KEYS = ["os", "device", "country", "path"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterValues = Record<FilterKey, string>;
export type FilterOptions = Record<FilterKey, string[]>;
