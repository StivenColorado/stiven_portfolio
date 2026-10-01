export interface StackGroup {
    id: string
    short: string
    cmd: string
    title: string
    desc: string
    items: string[]
}

export const CHAPTER_COUNT = 5
export const TRACK_SCREENS = 6
export const FADE = 0.03
export const MODEL_URL = "/models/macbook.glb"

export const SPANS: [number, number][] = [
    [0, 0.13],
    [0.13, 0.33],
    [0.33, 0.5],
    [0.5, 0.88],
    [0.88, 1],
]

export const STACK_ENTER = 0.2
export const STACK_OPEN = [0.12, 0.3] as const
export const STACK_GROUPS_FROM = 0.34

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smooth = (v: number) => {
    const t = clamp01(v)
    return t * t * (3 - 2 * t)
}
export const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))

export interface ChapterFrame {
    vis: number
    enter: number
    exit: number
    local: number
}

export function chapterFrame(p: number, i: number): ChapterFrame {
    const [a, b] = SPANS[i]
    const enter = i === 0 ? 1 : smooth(ramp(p, a, a + FADE))
    const exit = i === CHAPTER_COUNT - 1 ? 0 : smooth(ramp(p, b - FADE, b))
    const start = i === 0 ? a : a + FADE
    const end = i === CHAPTER_COUNT - 1 ? b : b - FADE
    return { vis: Math.min(enter, 1 - exit), enter, exit, local: ramp(p, start, end) }
}

export function activeChapter(p: number): number {
    for (let i = 0; i < CHAPTER_COUNT; i++) if (p < SPANS[i][1]) return i
    return CHAPTER_COUNT - 1
}

export function stackLocal(p: number): number {
    const [a, b] = SPANS[3]
    return ramp(p, a, b)
}

export function stackGroup(p: number, count: number): number {
    const s = stackLocal(p)
    const idx = Math.floor(ramp(s, STACK_GROUPS_FROM, 0.97) * count)
    return Math.min(count - 1, Math.max(0, idx))
}

export function groupStop(i: number, count: number): number {
    const [a, b] = SPANS[3]
    const s = STACK_GROUPS_FROM + ((0.97 - STACK_GROUPS_FROM) * (i + 0.5)) / count
    return a + (b - a) * s
}

export function chapterStops(count: number): { p: number; chapter: number }[] {
    const stops: { p: number; chapter: number }[] = [
        { p: 0, chapter: 0 },
        { p: SPANS[1][0] + FADE + 0.004, chapter: 1 },
        { p: SPANS[2][0] + FADE + 0.004, chapter: 2 },
    ]
    for (let i = 0; i < count; i++) stops.push({ p: groupStop(i, count), chapter: 3 })
    stops.push({ p: SPANS[4][0] + FADE + 0.012, chapter: 4 })
    return stops
}

export function splitChunks(text: string): string[] {
    const out: string[] = []
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        if (sentence.length < 110) {
            out.push(sentence)
            continue
        }
        const parts = sentence.split(/(?<=,)\s+/)
        let cur = ""
        for (const part of parts) {
            if (cur && (cur + part).length > 95) {
                out.push(cur.trim())
                cur = ""
            }
            cur += `${part} `
        }
        if (cur.trim()) out.push(cur.trim())
    }
    return out
}
