import {
    BufferAttribute,
    BufferGeometry,
    Box3,
    CircleGeometry,
    Group,
    Matrix4,
    Mesh,
    TorusGeometry,
    Vector3,
    type Material,
    type MeshBasicMaterial,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Materials } from "./objects.ts";

export interface LoadedModels {
    glasses: Group | null;
    laptop: Group | null;
}

const CREASE = (40 * Math.PI) / 180;
const GLASSES_WIDTH = 1.45;
const LAPTOP_WIDTH = 3;

function baked(mesh: Mesh, extra: Matrix4): BufferGeometry {
    const m = new Matrix4().multiplyMatrices(extra, mesh.matrixWorld);
    const src = mesh.geometry.attributes.position;
    const out = new Float32Array(src.count * 3);
    const v = new Vector3();
    for (let i = 0; i < src.count; i++) v.fromBufferAttribute(src, i).applyMatrix4(m).toArray(out, i * 3);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(out, 3));
    if (mesh.geometry.index) geo.setIndex(mesh.geometry.index.clone());
    return geo;
}

function solid(geo: BufferGeometry, fill: Material, hull?: Material): Group {
    const g = new Group();
    const smooth = toCreasedNormals(geo, CREASE);
    g.add(new Mesh(smooth, fill));
    if (hull) {
        geo.computeVertexNormals();
        g.add(new Mesh(geo, hull));
    } else geo.dispose();
    return g;
}

async function read(url: string): Promise<Record<string, Mesh[]>> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url);
    gltf.scene.updateMatrixWorld(true);
    const byName: Record<string, Mesh[]> = {};
    gltf.scene.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        const name = (mesh.material as Material).name;
        (byName[name] ??= []).push(mesh);
    });
    return byName;
}

function box(meshes: Mesh[], extra = new Matrix4()): Box3 {
    const b = new Box3();
    for (const mesh of meshes) {
        const g = baked(mesh, extra);
        g.computeBoundingBox();
        b.union(g.boundingBox!);
        g.dispose();
    }
    return b;
}

export async function loadGlasses(m: Materials, url: string): Promise<Group> {
    const parts = await read(url);
    const frame = box(parts.frame);
    const k = GLASSES_WIDTH / (frame.max.x - frame.min.x);
    const scale = new Matrix4().makeScale(k, k, k);
    const c = box([...parts.frame, ...parts.temples, ...parts.lens], scale).getCenter(new Vector3());
    const place = new Matrix4().makeTranslation(-c.x, -c.y, -c.z).multiply(scale);
    const root = new Group();
    for (const mesh of parts.frame) root.add(solid(baked(mesh, place), m.fill, m.hull.g));
    for (const mesh of parts.temples) root.add(solid(baked(mesh, place), m.fill, m.hull.g));
    for (const mesh of parts.lens) root.add(new Mesh(baked(mesh, place), m.lens));
    return root;
}

function screenFace(screen: Mesh, place: Matrix4, chalk: MeshBasicMaterial): Group {
    const geo = baked(screen, place);
    geo.computeBoundingBox();
    const c = geo.boundingBox!.getCenter(new Vector3());
    const p = geo.attributes.position;
    const idx = geo.index!;
    const a = new Vector3().fromBufferAttribute(p, idx.getX(0));
    const b = new Vector3().fromBufferAttribute(p, idx.getX(1));
    const d = new Vector3().fromBufferAttribute(p, idx.getX(2));
    const n = b.sub(a).cross(d.sub(a)).normalize();
    if (n.z < 0) n.negate();
    const up = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
    const right = new Vector3().crossVectors(up, n);
    const size = geo.boundingBox!.getSize(new Vector3());
    const w = Math.min(size.x, Math.hypot(size.y, size.z) * 1.6);
    geo.dispose();

    const face = new Group();
    face.matrix.makeBasis(right, up, n).setPosition(c.addScaledVector(n, 0.004));
    face.matrixAutoUpdate = false;
    const eye = new CircleGeometry(w * 0.05, 20);
    for (const x of [-0.17, 0.17]) {
        const e = new Mesh(eye, chalk);
        e.position.set(x * w, w * 0.07, 0);
        face.add(e);
    }
    const smile = new Mesh(new TorusGeometry(w * 0.13, w * 0.016, 6, 24, Math.PI), chalk);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -w * 0.02, 0);
    face.add(smile);
    return face;
}

export async function loadLaptop(m: Materials, url: string): Promise<Group> {
    const parts = await read(url);
    const all = Object.values(parts).flat();
    const bounds = box(all);
    const k = LAPTOP_WIDTH / (bounds.max.x - bounds.min.x);
    const c = bounds.getCenter(new Vector3());
    const place = new Matrix4()
        .makeScale(k, k, k)
        .multiply(new Matrix4().makeTranslation(-c.x, -c.y, -c.z));
    const root = new Group();
    for (const mesh of parts.alu) root.add(solid(baked(mesh, place), m.fill, m.hull.l));
    for (const name of ["keys", "bezel", "screen"]) {
        for (const mesh of parts[name] ?? []) root.add(new Mesh(baked(mesh, place), m.line));
    }
    if (parts.screen?.[0]) root.add(screenFace(parts.screen[0], place, m.chalk));
    return root;
}
