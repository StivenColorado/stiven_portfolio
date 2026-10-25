export type PlazoUnit = "day" | "week" | "month";
export type PlazoKind = "business" | "calendar";
export interface Plazo { qty: number; unit: PlazoUnit; kind: PlazoKind }

const WORDS = {
    es: { day: ["día", "días"], week: ["semana", "semanas"], month: ["mes", "meses"], business: "hábiles", calendar: "calendario" },
    en: { day: ["day", "days"], week: ["week", "weeks"], month: ["month", "months"], business: "business", calendar: "calendar" },
} as const;

export function formatPlazo(p: Plazo, lang: "es" | "en"): string {
    const w = WORDS[lang];
    const unit = w[p.unit][p.qty === 1 ? 0 : 1];
    return lang === "en" ? `${p.qty} ${w[p.kind]} ${unit}` : `${p.qty} ${unit} ${w[p.kind]}`;
}

/** El plazo se guarda como texto en la variable `plazo`; esto lo vuelve a leer en cualquier idioma. */
export function parsePlazo(text: string): Plazo | null {
    const t = text.trim().toLowerCase();
    for (const lang of ["es", "en"] as const) {
        const w = WORDS[lang];
        for (const kind of ["business", "calendar"] as const) {
            for (const unit of ["day", "week", "month"] as const) {
                for (const name of w[unit]) {
                    const expected = lang === "en" ? `${w[kind]} ${name}` : `${name} ${w[kind]}`;
                    const m = new RegExp(`^(\\d+) ${expected}$`).exec(t);
                    if (m) return { qty: Number(m[1]), unit, kind };
                }
            }
        }
    }
    return null;
}

const DAY = 86_400_000;
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const nextMonday = (d: Date) => addDays(d, (8 - d.getUTCDay()) % 7);

function easter(y: number): Date {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, day));
}

const holidayCache = new Map<number, Set<string>>();

/** Festivos de Colombia (Ley Emiliani): fijos, trasladados al lunes y los que dependen de la Semana Santa. */
function holidays(y: number): Set<string> {
    const cached = holidayCache.get(y);
    if (cached) return cached;
    const at = (m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
    const easterDay = easter(y);
    const set = new Set<string>();
    for (const [m, d] of [[1, 1], [5, 1], [7, 20], [8, 7], [12, 8], [12, 25]]) set.add(iso(at(m, d)));
    for (const [m, d] of [[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]]) set.add(iso(nextMonday(at(m, d))));
    set.add(iso(addDays(easterDay, -3)));
    set.add(iso(addDays(easterDay, -2)));
    for (const offset of [39, 60, 68]) set.add(iso(nextMonday(addDays(easterDay, offset))));
    holidayCache.set(y, set);
    return set;
}

const isBusinessDay = (d: Date) => d.getUTCDay() % 6 !== 0 && !holidays(d.getUTCFullYear()).has(iso(d));

function addBusinessDays(start: Date, n: number): Date {
    let d = start;
    for (let left = n; left > 0;) {
        d = addDays(d, 1);
        if (isBusinessDay(d)) left--;
    }
    return d;
}

function addMonths(start: Date, n: number): Date {
    const d = new Date(start);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return d;
}

/** Fecha límite (YYYY-MM-DD) contada desde `start`; vacía si falta algún dato. */
export function deliveryDate(start: string, p: Plazo | null): string {
    if (!p || p.qty < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return "";
    const from = utc(start);
    if (Number.isNaN(from.getTime())) return "";
    let end: Date;
    if (p.unit === "month") {
        end = addMonths(from, p.qty);
        while (p.kind === "business" && !isBusinessDay(end)) end = addDays(end, 1);
    } else {
        const days = p.unit === "week" ? p.qty * 7 : p.qty;
        end = p.kind === "business" ? addBusinessDays(from, p.unit === "week" ? p.qty * 5 : p.qty) : addDays(from, days);
    }
    return iso(end);
}

export const entregaOf = (plazoText: string, start: string) => deliveryDate(start, parsePlazo(plazoText));

export interface Garantia { qty: number; unit: PlazoUnit }

const UNIT_DAYS: Record<PlazoUnit, number> = { day: 1, week: 7, month: 30 };

export const garantiaDays = (g: Garantia) => g.qty * UNIT_DAYS[g.unit];

export function formatGarantia(g: Garantia, lang: "es" | "en"): string {
    return `${g.qty} ${WORDS[lang][g.unit][g.qty === 1 ? 0 : 1]}`;
}

/** Lee "3 meses" / "2 weeks"; un número suelto (datos anteriores) cuenta como días. */
export function parseGarantia(text: string, days = ""): Garantia | null {
    const t = text.trim().toLowerCase();
    for (const lang of ["es", "en"] as const) {
        for (const unit of ["day", "week", "month"] as const) {
            for (const name of WORDS[lang][unit]) {
                const m = new RegExp(`^(\\d+) ${name}$`).exec(t);
                if (m) return { qty: Number(m[1]), unit };
            }
        }
    }
    return /^\d+$/.test(days.trim()) ? { qty: Number(days), unit: "day" } : null;
}
