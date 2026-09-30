export type V3 = [number, number, number];
export type ObjectKey = "g" | "k" | "m" | "t" | "l";

export interface Pose {
    p: V3;
    r?: V3;
    s?: number;
}

export interface ResolvedPose {
    p: V3;
    r: V3;
    s: number;
}

export type SceneName = keyof typeof POSES;
export type ScenePose = Record<ObjectKey, Pose>;

const OFF: Pose = { p: [0, 0, 0], s: 0 };
const DESK: V3 = [Math.PI / 2 - 0.3, 0, 0];
const FLAT_MOUSE: V3 = [-0.3, 0, 0];
const FLAT_GLASSES: V3 = [-0.75, 0, -0.12];

export const POSES = {
    hero: {
        g: { p: [2.45, 1.78, 0], r: FLAT_GLASSES, s: 0.7 },
        k: { p: [1.55, 0.35, 0], r: DESK, s: 0.9 },
        m: { p: [3.95, 0.25, 0], r: FLAT_MOUSE, s: 0.5 },
        t: OFF,
        l: OFF,
    },
    services: {
        g: { p: [1.75, 1.98, 0], r: FLAT_GLASSES, s: 0.7 },
        k: OFF,
        m: OFF,
        t: OFF,
        l: { p: [3.4, 2.0, 0.3], r: [0.55, -0.5, 0], s: 0.27 },
    },
    projects: {
        g: OFF,
        k: { p: [1.6, 1.95, 0], r: DESK, s: 0.4 },
        m: { p: [3.3, 1.92, 0], r: FLAT_MOUSE, s: 0.5 },
        t: OFF,
        l: OFF,
    },
    experience: {
        g: { p: [3.95, 0.2, -0.5], r: FLAT_GLASSES, s: 0.8 },
        k: { p: [-3.95, -1.9, 0], r: DESK, s: 0.26 },
        m: OFF,
        t: { p: [-3.5, 1.2, 0], s: 0.6 },
        l: OFF,
    },
    contact: {
        g: { p: [-3.55, 0.35, 0], r: FLAT_GLASSES, s: 0.8 },
        k: { p: [3.5, -1.7, 0], r: DESK, s: 0.4 },
        m: { p: [3.1, 0.95, 0], r: FLAT_MOUSE, s: 0.6 },
        t: { p: [-3.5, -1.6, 0], s: 0.6 },
        l: OFF,
    },
    "route:projects": {
        g: OFF,
        k: { p: [2.3, 1.72, 0], r: DESK, s: 0.5 },
        m: { p: [3.95, 1.65, 0], r: FLAT_MOUSE, s: 0.4 },
        t: OFF,
        l: OFF,
    },
    "route:about": {
        g: { p: [3.65, 1.75, 0], r: FLAT_GLASSES, s: 0.8 },
        k: OFF,
        m: OFF,
        t: OFF,
        l: { p: [3.85, -1.55, 0.6], r: [0.45, -0.5, 0], s: 0.22 },
    },
} satisfies Record<string, ScenePose>;

const TABLET_POSES: Partial<Record<SceneName, ScenePose>> = {
    hero: {
        g: { p: [1.15, 1.5, 0], r: FLAT_GLASSES, s: 0.55 },
        k: { p: [0.98, 0.35, 0], r: DESK, s: 0.44 },
        m: OFF,
        t: OFF,
        l: OFF,
    },
    services: { g: OFF, k: OFF, m: OFF, t: OFF, l: { p: [1.85, 2.0, 0.3], r: [0.55, -0.5, 0], s: 0.22 } },
    projects: { g: OFF, k: { p: [1.5, 2.25, 0], r: DESK, s: 0.3 }, m: OFF, t: OFF, l: OFF },
    experience: { g: OFF, k: OFF, m: OFF, t: { p: [1.55, 2.15, 0], s: 0.4 }, l: OFF },
    contact: { g: OFF, k: OFF, m: { p: [1.3, 0.83, 0], r: FLAT_MOUSE, s: 0.4 }, t: OFF, l: OFF },
};

export const OBJECT_KEYS: ObjectKey[] = ["g", "k", "m", "t", "l"];

export function isSceneName(name: string | null | undefined): name is SceneName {
    return !!name && name in POSES;
}

/** Las poses se dibujan a 900 px de alto (1100 en tablet): x, y y escala se reescalan para conservar el tamaño en píxeles. */
function pose(name: SceneName, key: ObjectKey, tablet: boolean): ResolvedPose {
    const own = tablet ? TABLET_POSES[name] : undefined;
    const src: Pose = (own ?? (POSES[name] as ScenePose))[key];
    const k = Math.min(1.4, Math.max(0.7, (tablet ? 1100 : 900) / window.innerHeight));
    const [x, y, z] = src.p;
    const s = src.s ?? 1;
    const legacy = tablet && !own;
    return {
        p: legacy ? [x * 0.8, y, z] : [x * k, y * k, z],
        r: src.r ?? [0, 0, 0],
        s: legacy ? s * 0.85 : s * k,
    };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mixPose(a: ResolvedPose, b: ResolvedPose, t: number): ResolvedPose {
    return {
        p: [lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t), lerp(a.p[2], b.p[2], t)],
        r: [lerp(a.r[0], b.r[0], t), lerp(a.r[1], b.r[1], t), lerp(a.r[2], b.r[2], t)],
        s: lerp(a.s, b.s, t),
    };
}

interface Anchor {
    name: SceneName;
    center: number;
}

export function readAnchors(): Anchor[] {
    const list: Anchor[] = [];
    document.querySelectorAll<HTMLElement>("[data-scene]").forEach((el) => {
        const name = el.dataset.scene;
        const r = el.getBoundingClientRect();
        list.push({
            name: isSceneName(name) ? name : "hero",
            center: r.top + window.scrollY + r.height / 2,
        });
    });
    return list.sort((a, b) => a.center - b.center);
}

export function sceneForPath(pathname: string): SceneName | null {
    if (pathname.startsWith("/projects")) return "route:projects";
    if (pathname.startsWith("/about")) return "route:about";
    return pathname === "/" ? null : "hero";
}

/** Progreso por scroll: entre el centro de la sección actual y el de la siguiente, medido en el centro del viewport. */
export function sample(
    anchors: Anchor[],
    y: number,
    tablet: boolean,
): Record<ObjectKey, ResolvedPose> {
    const out = {} as Record<ObjectKey, ResolvedPose>;
    let from: SceneName = "hero";
    let to: SceneName = "hero";
    let t = 0;
    if (anchors.length) {
        const focus = y + window.innerHeight / 2;
        let i = anchors.length - 1;
        while (i > 0 && anchors[i].center > focus) i--;
        from = anchors[i].name;
        if (focus < anchors[0].center) {
            to = from;
        } else if (i < anchors.length - 1) {
            to = anchors[i + 1].name;
            t = (focus - anchors[i].center) / (anchors[i + 1].center - anchors[i].center);
            t = Math.min(1, Math.max(0, t));
            t = t * t * (3 - 2 * t);
        } else {
            to = from;
        }
    }
    for (const k of OBJECT_KEYS) {
        out[k] = mixPose(pose(from, k, tablet), pose(to, k, tablet), t);
    }
    return out;
}

export function fixed(name: SceneName, tablet: boolean): Record<ObjectKey, ResolvedPose> {
    const out = {} as Record<ObjectKey, ResolvedPose>;
    for (const k of OBJECT_KEYS) out[k] = pose(name, k, tablet);
    return out;
}
