import {
    CapsuleGeometry,
    CatmullRomCurve3,
    Color,
    Group,
    LatheGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    SphereGeometry,
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
    m: { w: 1.6, h: 2.0 },
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
    const A = { x: 0.46, y: 0.85, z: 0.32 };
    const deform = (v: Vector3) => {
        const t = (v.y / A.y + 1) / 2;
        v.x = v.x * (1 - 0.45 * t) + 0.36 * v.y;
        v.z *= 1 - 0.3 * t;
        return v;
    };
    const face = (x: number, y: number, lift = 0) => {
        const k = 1 - (x / A.x) ** 2 - (y / A.y) ** 2;
        const v = new Vector3(x, y, A.z * Math.sqrt(Math.max(k, 0.0001)));
        deform(v);
        v.z += lift;
        return v;
    };

    const lean = new Group();
    lean.rotation.set(0, 0, -0.28);
    lean.position.y = 0;
    root.add(lean);

    const body = new SphereGeometry(1, 22, 14);
    body.scale(A.x, A.y, A.z);
    const pos = body.attributes.position;
    const tmp = new Vector3();
    for (let i = 0; i < pos.count; i++) {
        tmp.fromBufferAttribute(pos, i);
        deform(tmp);
        pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    body.computeVertexNormals();
    lean.add(part(body, m.fill, hull));

    const capGeo = new SphereGeometry(1, 14, 10);
    capGeo.scale(0.15, 0.34, 0.1);
    for (const sx of [-1, 1]) {
        const cap = part(capGeo, m.fill, hull);
        cap.position.copy(face(sx * 0.16 + 0.12, 0.4, 0.05));
        cap.rotation.z = -0.32;
        lean.add(cap);
    }
    const wheel = new Mesh(new CapsuleGeometry(0.04, 0.16, 3, 8), m.line);
    wheel.position.copy(face(0.12, 0.4, 0.15));
    wheel.rotation.z = -0.32;
    lean.add(wheel);

    const thumb = new CapsuleGeometry(0.12, 0.36, 4, 10);
    thumb.rotateZ(Math.PI / 2 - 0.55);
    lean.add(at(part(thumb, m.fill, hull), -0.1, -0.3, 0.26));

    lean.add(
        new Mesh(
            tube(
                [
                    [0.3, 0.8, 0.0],
                    [0.36, 1.1, 0.0],
                    [0.05, 1.35, 0.0],
                    [0.3, 1.7, 0.0],
                ],
                18,
                0.028,
                6,
            ),
            m.line,
        ),
    );
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
