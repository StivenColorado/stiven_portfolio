import {
    BufferGeometry,
    DynamicDrawUsage,
    Group,
    InstancedMesh,
    Matrix4,
    Mesh,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { instancedPart, part } from "./outline.ts";
import type { Materials } from "./objects.ts";

export interface KeyboardRig {
    readonly count: number;
    readonly active: number;
    readonly pick: InstancedMesh[];
    press(index: number, now: number): void;
    pressCode(code: string, now: number): boolean;
    pressRandom(now: number): void;
    indexOf(mesh: InstancedMesh, instanceId: number): number;
}

type Item = string | number | [string, number];

const U = 0.212;
const GAP = 0.024;
const KEY_H = 0.12;
const KEY_Y = 0.12;
const PLATE_TOP = 0.09;
const DIP = 0.055;
const WAVE_DIP = 0.04;
const WAVE_SECONDS = 0.32;
const DIP_SECONDS = 0.09;
const SPEED = 6;
const MAX_RIPPLES = 14;

const letters = (s: string): Item[] => s.split("").map((c) => `Key${c}`);
const fkeys = (from: number): Item[] => [0, 1, 2, 3].map((i) => `F${from + i}`);
const digits: Item[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => `Digit${d}`);

const ROWS: [number, Item[]][] = [
    [0, ["Escape", 1, ...fkeys(1), 0.5, ...fkeys(5), 0.5, ...fkeys(9), 0.25, "PrintScreen", "ScrollLock", "Pause"]],
    [1.5, ["Backquote", ...digits, "Minus", "Equal", ["Backspace", 2], 0.25, "Insert", "Home", "PageUp"]],
    [2.5, [["Tab", 1.5], ...letters("QWERTYUIOP"), "BracketLeft", "BracketRight", ["Backslash", 1.5], 0.25, "Delete", "End", "PageDown"]],
    [3.5, [["CapsLock", 1.75], ...letters("ASDFGHJKL"), "Semicolon", "Quote", ["Enter", 2.25]]],
    [4.5, [["ShiftLeft", 2.25], ...letters("ZXCVBNM"), "Comma", "Period", "Slash", ["ShiftRight", 2.75], 1.25, "ArrowUp"]],
    [
        5.5,
        [
            ["ControlLeft", 1.25],
            ["MetaLeft", 1.25],
            ["AltLeft", 1.25],
            ["Space", 6.25],
            ["AltRight", 1.25],
            ["MetaRight", 1.25],
            ["ContextMenu", 1.25],
            ["ControlRight", 1.25],
            0.25,
            "ArrowLeft",
            "ArrowDown",
            "ArrowRight",
        ],
    ],
];

const ALIAS: Record<string, string> = { NumpadEnter: "Enter", AltGraph: "AltRight", OSLeft: "MetaLeft", OSRight: "MetaRight" };

interface KeyDef {
    code: string;
    w: number;
    x: number;
    z: number;
}

function layout(): KeyDef[] {
    const out: KeyDef[] = [];
    const cx = 18.25 / 2;
    const cz = 2.75;
    for (const [row, items] of ROWS) {
        let x = 0;
        for (const it of items) {
            if (typeof it === "number") {
                x += it;
                continue;
            }
            const [code, w] = typeof it === "string" ? [it, 1] : it;
            out.push({ code, w, x: (x + w / 2 - cx) * U, z: (row - cz) * U });
            x += w;
        }
    }
    return out;
}

function keycap(w: number): BufferGeometry {
    const width = w * U - GAP;
    const depth = U - GAP;
    const geo = new RoundedBoxGeometry(width, KEY_H, depth, 1, 0.032);
    const pos = geo.attributes.position;
    const insetX = 0.016;
    const insetZ = 0.022;
    for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) + KEY_H / 2) / KEY_H;
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setX(i, x - Math.sign(x) * Math.min(Math.abs(x) * 0.8, insetX * t));
        pos.setZ(i, z - Math.sign(z) * Math.min(Math.abs(z) * 0.8, insetZ * t));
    }
    return geo;
}

export function keyboard(m: Materials): Group {
    const defs = layout();
    const n = defs.length;
    const root = new Group();

    const span = 18.25 * U;
    const deep = 6.5 * U;
    const caseGeo = new RoundedBoxGeometry(span + 0.36, 0.16, deep + 0.36, 3, 0.07);
    root.add(part(caseGeo, m.fill, m.hull.k));
    const plate = new Mesh(new RoundedBoxGeometry(span + 0.15, 0.03, deep + 0.15, 1, 0.012), m.line);
    plate.position.y = PLATE_TOP - 0.012;
    root.add(plate);

    const widths = [...new Set(defs.map((d) => d.w))].sort((a, b) => a - b);
    interface Cls {
        fill: InstancedMesh;
        hull: InstancedMesh;
        used: number;
    }
    const classes = new Map<number, Cls>();
    for (const w of widths) {
        const count = defs.filter((d) => d.w === w).length;
        const geo = keycap(w);
        const p = instancedPart(geo, m.fill, m.keycapHull, count);
        for (const mesh of [p.fill, p.hull]) mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        root.add(p.group);
        classes.set(w, { fill: p.fill, hull: p.hull, used: 0 });
    }

    const slot: { cls: Cls; at: number }[] = [];
    const byMesh = new Map<InstancedMesh, number[]>();
    defs.forEach((d, i) => {
        const cls = classes.get(d.w)!;
        const at = cls.used++;
        slot.push({ cls, at });
        const list = byMesh.get(cls.fill) ?? [];
        list[at] = i;
        byMesh.set(cls.fill, list);
    });

    const dotGeo = new RoundedBoxGeometry(0.06, 0.014, 0.014, 1, 0.005);
    const dots = new InstancedMesh(dotGeo, m.line, 2);
    dots.instanceMatrix.setUsage(DynamicDrawUsage);
    const dotOf = new Map<number, number>();
    ["KeyF", "KeyJ"].forEach((c, d) => dotOf.set(
        defs.findIndex((k) => k.code === c),
        d,
    ));
    root.add(dots);

    const mat = new Matrix4();
    const place = (i: number, dy: number) => {
        const { x, z } = defs[i];
        const { cls, at } = slot[i];
        mat.makeTranslation(x, KEY_Y + dy, z);
        cls.fill.setMatrixAt(at, mat);
        cls.hull.setMatrixAt(at, mat);
        const d = dotOf.get(i);
        if (d !== undefined) {
            mat.makeTranslation(x, KEY_Y + KEY_H / 2 + 0.004 + dy, z + (U - GAP) * 0.3);
            dots.setMatrixAt(d, mat);
        }
    };
    const flushMatrices = () => {
        for (const c of classes.values()) {
            c.fill.instanceMatrix.needsUpdate = true;
            c.hull.instanceMatrix.needsUpdate = true;
        }
        dots.instanceMatrix.needsUpdate = true;
    };
    defs.forEach((_, i) => place(i, 0));
    flushMatrices();

    const dist = new Float32Array(n * n);
    for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
            dist[a * n + b] = Math.hypot(defs[a].x - defs[b].x, defs[a].z - defs[b].z) / U;
        }
    }
    const far = dist.reduce((a, b) => Math.max(a, b), 0);
    const lifetime = far / SPEED + WAVE_SECONDS;

    const ripples: { from: number; t0: number }[] = [];
    const pressed: { i: number; t0: number }[] = [];
    const applied = new Float32Array(n);

    function waveDip(i: number, t: number) {
        let dip = 0;
        for (const rp of ripples) {
            if (rp.from === i) continue;
            const d = dist[rp.from * n + i];
            const age = t - rp.t0 - d / SPEED;
            if (age < 0 || age > WAVE_SECONDS) continue;
            const amp = WAVE_DIP * Math.max(0.4, 1 - d * 0.04);
            dip = Math.max(dip, amp * Math.sin((age / WAVE_SECONDS) * Math.PI));
        }
        return dip;
    }

    const api: KeyboardRig = {
        count: n,
        get active() {
            return ripples.length;
        },
        pick: [...classes.values()].map((c) => c.fill),
        press(index, now) {
            if (index < 0 || index >= n) return;
            const k = pressed.findIndex((p) => p.i === index);
            if (k >= 0) pressed.splice(k, 1);
            pressed.push({ i: index, t0: now });
            ripples.push({ from: index, t0: now });
            if (ripples.length > MAX_RIPPLES) ripples.shift();
        },
        pressCode(code, now) {
            const i = defs.findIndex((d) => d.code === (ALIAS[code] ?? code));
            if (i < 0) return false;
            api.press(i, now);
            return true;
        },
        pressRandom(now) {
            api.press(Math.floor(Math.random() * n), now);
        },
        indexOf(mesh, id) {
            return byMesh.get(mesh)?.[id] ?? -1;
        },
    };

    root.userData.rig = api;
    root.userData.tick = (t: number) => {
        for (let k = ripples.length - 1; k >= 0; k--) if (t - ripples[k].t0 > lifetime) ripples.splice(k, 1);
        let moved = false;
        for (let i = 0; i < n; i++) {
            const p = pressed.find((x) => x.i === i);
            const f = p ? (t - p.t0) / DIP_SECONDS : 1;
            const press = f < 1 ? DIP * Math.sin(Math.max(f, 0) * Math.PI) : 0;
            const dy = -Math.max(press, ripples.length ? waveDip(i, t) : 0);
            if (Math.abs(dy - applied[i]) < 1e-5) continue;
            applied[i] = dy;
            place(i, dy);
            moved = true;
        }
        for (let k = pressed.length - 1; k >= 0; k--) if (t - pressed[k].t0 >= DIP_SECONDS) pressed.splice(k, 1);
        if (moved) flushMatrices();
    };
    return root;
}
