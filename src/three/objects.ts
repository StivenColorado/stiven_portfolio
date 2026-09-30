import {
    CapsuleGeometry,
    CatmullRomCurve3,
    Color,
    Group,
    LatheGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    TorusGeometry,
    TubeGeometry,
    Vector2,
    Vector3,
    type BufferGeometry,
    type InstancedMesh,
    type MeshToonMaterial,
} from "three";
import { createFill, createHull, part, type HullMaterial } from "./outline.ts";
import type { ObjectKey } from "./keyframes.ts";

export interface Palette {
    ink: Color;
    lens: Color;
    paper: Color;
}

export interface Materials {
    fill: MeshToonMaterial;
    line: MeshBasicMaterial;
    lens: MeshBasicMaterial;
    chalk: MeshBasicMaterial;
    hull: Record<ObjectKey, HullMaterial>;
    keycapHull: HullMaterial;
}

export type Tick = (seconds: number) => void;

/** Alto y ancho aproximados (unidades de escena, escala 1) para encajar cada objeto en su hueco móvil. */
export const SIZE: Record<ObjectKey, { w: number; h: number }> = {
    g: { w: 1.5, h: 1.1 },
    k: { w: 4.2, h: 1.75 },
    m: { w: 1.2, h: 1.7 },
    t: { w: 1.4, h: 1.2 },
    l: { w: 3, h: 2.4 },
};

const KEYS: ObjectKey[] = ["g", "k", "m", "t", "l"];

export function createMaterials(p: Palette): Materials {
    const hull = {} as Record<ObjectKey, HullMaterial>;
    for (const k of KEYS) hull[k] = createHull(p.ink);
    return {
        fill: createFill(p.paper),
        line: new MeshBasicMaterial({ color: p.ink.clone() }),
        lens: new MeshBasicMaterial({
            color: p.lens.clone(),
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
        }),
        chalk: new MeshBasicMaterial({ color: p.paper.clone() }),
        hull,
        keycapHull: createHull(p.ink),
    };
}

export function setHullThickness(m: Materials, key: ObjectKey, value: number) {
    m.hull[key].userData.thick.value = value;
    if (key === "k") m.keycapHull.userData.thick.value = value * 0.5;
}

function at<T extends Object3D>(o: T, x: number, y: number, z: number): T {
    o.position.set(x, y, z);
    return o;
}

function tube(points: [number, number, number][], seg: number, radius: number, radial: number) {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    return new TubeGeometry(curve, seg, radius, radial);
}

export function mouse(m: Materials): Group {
    const root = new Group();
    const hull = m.hull.m;
    const RX = 0.31;
    const RZ = 0.5;
    const H = 0.2;
    const dome = (x: number, z: number) => H * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2 - (z / RZ) ** 2));

    const pts: Vector2[] = [new Vector2(0, 0), new Vector2(0.97, 0)];
    for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * (Math.PI / 2);
        pts.push(new Vector2(Math.cos(a), 0.02 + Math.sin(a) * (H - 0.02)));
    }
    const body = new LatheGeometry(pts, 28);
    body.scale(RX, 1, RZ);
    const pos = body.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        pos.setX(i, pos.getX(i) * (0.88 + 0.12 * ((z + RZ) / (2 * RZ))));
    }
    body.computeVertexNormals();
    root.add(part(body, m.fill, hull));

    const lift = 0.006;
    const split: [number, number, number][] = [];
    for (let i = 0; i <= 8; i++) {
        const z = -0.47 + (i / 8) * 0.4;
        split.push([0, dome(0, z) + lift, z]);
    }
    root.add(new Mesh(tube(split, 16, 0.007, 5), m.line));
    const cross: [number, number, number][] = [];
    for (let i = 0; i <= 10; i++) {
        const x = -0.27 + (i / 10) * 0.54;
        cross.push([x, dome(x, -0.07) + lift, -0.07]);
    }
    root.add(new Mesh(tube(cross, 20, 0.007, 5), m.line));

    const wheel = new Mesh(new CapsuleGeometry(0.03, 0.09, 3, 8), m.line);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0, dome(0, -0.25) + 0.012, -0.25);
    root.add(wheel);

    root.add(
        new Mesh(
            tube(
                [
                    [0, 0.02, -0.46],
                    [0, 0.02, -0.72],
                    [-0.04, 0.02, -0.92],
                    [-0.22, 0.02, -1.06],
                    [-0.5, 0.02, -1.1],
                ],
                24,
                0.016,
                6,
            ),
            m.line,
        ),
    );
    root.position.z = 0.35;
    return root;
}

export function mug(m: Materials): Group {
    const root = new Group();
    const hull = m.hull.t;
    const profile = [
        [0, 0],
        [0.32, 0],
        [0.34, 0.5],
        [0.32, 0.55],
        [0.28, 0.55],
        [0.28, 0.05],
    ].map(([r, y]) => new Vector2(r, y));
    const inner = new Group();
    inner.position.y = -0.3;
    inner.add(part(new LatheGeometry(profile, 20), m.fill, hull));
    const handle = part(new TorusGeometry(0.16, 0.045, 8, 16, Math.PI), m.fill, hull);
    handle.rotation.z = -Math.PI / 2;
    inner.add(at(handle, 0.38, 0.3, 0));
    const steam: Mesh[] = [];
    for (const x of [-0.1, 0.1]) {
        const s = new Mesh(
            tube(
                [
                    [0, 0.6, 0],
                    [0.06, 0.75, 0],
                    [-0.06, 0.9, 0],
                    [0.04, 1.05, 0],
                ],
                12,
                0.022,
                5,
            ),
            m.line,
        );
        s.position.x = x;
        inner.add(s);
        steam.push(s);
    }
    root.add(inner);
    root.userData.tick = ((t) => {
        steam.forEach((s, i) => {
            s.position.y = Math.sin(t * 1.5 + i * 2) * 0.03;
        });
    }) satisfies Tick;
    return root;
}

export function tickObject(o: Object3D, seconds: number) {
    (o.userData.tick as Tick | undefined)?.(seconds);
}

export function countTriangles(root: Object3D): number {
    let total = 0;
    root.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        const geo = mesh.geometry as BufferGeometry;
        const n = geo.index ? geo.index.count : geo.attributes.position.count;
        const inst = (o as InstancedMesh).isInstancedMesh ? (o as InstancedMesh).count : 1;
        total += (n / 3) * inst;
    });
    return total;
}

export function disposeTree(root: Object3D) {
    const mats = new Set<{ dispose(): void }>();
    root.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mm = mesh.material;
        (Array.isArray(mm) ? mm : [mm]).forEach((x) => mats.add(x));
        if ((o as InstancedMesh).isInstancedMesh) (o as InstancedMesh).dispose();
    });
    mats.forEach((x) => x.dispose());
}
