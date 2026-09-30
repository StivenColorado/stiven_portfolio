import {
    AmbientLight,
    Color,
    DirectionalLight,
    Group,
    PerspectiveCamera,
    Raycaster,
    Scene,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import {
    SIZE,
    countTriangles,
    createMaterials,
    disposeTree,
    mouse,
    mug,
    setHullThickness,
    tickObject,
    type Palette,
} from "./objects.ts";
import {
    OBJECT_KEYS,
    fixed,
    lerp,
    readAnchors,
    sample,
    sceneForPath,
    type ObjectKey,
    type ResolvedPose,
} from "./keyframes.ts";
import type { InstancedMesh } from "three";
import { keyboard, type KeyboardRig } from "./keyboard.ts";
import { loadGlasses, loadLaptop } from "./models.ts";

export interface SceneHandle {
    setRoute(pathname: string): void;
    dispose(): void;
    readonly triangles: number;
}

const FOLLOW = 0.08;
const isMobile = () => window.innerWidth < 768;
const isTablet = () => window.innerWidth < 1024;
const CAMERA_Z = 9;
const IDLE_AFTER = 3000;
const INTERACTIVE = "a,button,input,textarea,select,label,summary,[role='button'],[role='link'],[contenteditable]";
const VALID_SLOTS = new Set<string>(OBJECT_KEYS);

const STICKER: Palette = {
    ink: new Color("#111111"),
    lens: new Color("#3b82f6"),
    paper: new Color("#f4f2ec"),
};

export function mount(container: HTMLElement, initialPath: string): SceneHandle {
    const dprCap = isMobile() ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
    });
    renderer.setPixelRatio(dpr);
    renderer.setClearAlpha(0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    const fovFor = () => (isMobile() ? 50 : 35);
    const camera = new PerspectiveCamera(fovFor(), 1, 0.1, 50);
    camera.position.set(0, 0, CAMERA_Z);
    camera.lookAt(0, 0, 0);
    scene.add(new AmbientLight(0xffffff, 0.7));
    const sun = new DirectionalLight(0xffffff, 2.5);
    sun.position.set(-3, 5, 6);
    scene.add(sun);

    const materials = createMaterials(STICKER);
    const parts: Record<ObjectKey, Group> = {
        g: new Group(),
        k: keyboard(materials),
        m: mouse(materials),
        t: mug(materials),
        l: new Group(),
    };
    const world = new Group();
    OBJECT_KEYS.forEach((k) => world.add(parts[k]));
    scene.add(world);
    let triangles = countTriangles(scene);
    const logTriangles = () => {
        triangles = countTriangles(scene);
        if (import.meta.env.DEV) console.info("[three]", Math.round(triangles), "tris");
    };
    logTriangles();

    let path = initialPath;
    let anchors = readAnchors();
    let current: Record<ObjectKey, ResolvedPose> | null = null;
    let raf = 0;
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stableH = window.innerHeight;
    let stableW = window.innerWidth;
    const viewH = () => (isMobile() ? stableH : window.innerHeight);
    const slotEl: Partial<Record<ObjectKey, HTMLElement>> = {};
    const slotChanged = new Set<ObjectKey>();
    const onScreen: Partial<Record<ObjectKey, boolean>> = {};
    const wasOn: Partial<Record<ObjectKey, boolean>> = {};
    let activeScene: HTMLElement | null = null;
    const offset = {} as Record<ObjectKey, { p: [number, number, number]; s: number }>;
    for (const k of OBJECT_KEYS) offset[k] = { p: [0, 0, 0], s: 0 };
    const ndc = new Vector3();
    const dir = new Vector3();

    function slotToWorld(el: HTMLElement) {
        const r = el.getBoundingClientRect();
        const vh = viewH();
        ndc.set(((r.left + r.width / 2) / window.innerWidth) * 2 - 1, -(((r.top + r.height / 2) / vh) * 2 - 1), 0.5);
        ndc.unproject(camera);
        dir.copy(ndc).sub(camera.position);
        const k = -camera.position.z / dir.z;
        const worldPerPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * CAMERA_Z) / vh;
        return {
            on: r.bottom > 0 && r.top < vh,
            p: [camera.position.x + dir.x * k, camera.position.y + dir.y * k, 0] as [number, number, number],
            w: r.width * worldPerPx,
            h: r.height * worldPerPx,
        };
    }

    /** En móvil cada objeto queda pegado a un hueco `data-slot` de su clase, elegido solo al cambiar la sección activa; el tamaño sale del rect completo y nunca de la parte visible. La laptop usa el hueco `l` y, si no existe, comparte mitad del hueco `t`. */
    function slotPoses(base: Record<ObjectKey, ResolvedPose>): Record<ObjectKey, ResolvedPose> {
        const out = {} as Record<ObjectKey, ResolvedPose>;
        const docY = (el: HTMLElement) => {
            const r = el.getBoundingClientRect();
            return r.top + window.scrollY + r.height / 2;
        };
        const focus = window.scrollY + window.innerHeight / 2;
        let active: HTMLElement | null = null;
        let activeY = -Infinity;
        document.querySelectorAll<HTMLElement>("[data-scene]").forEach((el) => {
            const y = docY(el);
            if (y <= focus && y > activeY) {
                active = el;
                activeY = y;
            }
        });
        const sectionY = active ? activeY : focus;
        const slots: Partial<Record<ObjectKey, HTMLElement[]>> = {};
        document.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
            const key = el.dataset.slot ?? "";
            if (!VALID_SLOTS.has(key) || el.getBoundingClientRect().height < 1) return;
            (slots[key as ObjectKey] ??= []).push(el);
        });
        const pick = (k: ObjectKey) => {
            const list = slots[k];
            if (!list) return undefined;
            const scene = active as HTMLElement | null;
            const inside = scene ? list.find((el) => scene.contains(el)) : undefined;
            return (
                inside ??
                list.reduce((a, b) => (Math.abs(docY(b) - sectionY) < Math.abs(docY(a) - sectionY) ? b : a))
            );
        };
        const sectionChanged = active !== activeScene;
        const chosen: Partial<Record<ObjectKey, HTMLElement>> = {};
        for (const k of OBJECT_KEYS) {
            const kept = slotEl[k];
            const list = slots[k];
            chosen[k] = !sectionChanged && kept && list?.includes(kept) ? kept : pick(k);
        }
        activeScene = active;
        const shared = !chosen.l && !!chosen.t;
        for (const k of OBJECT_KEYS) {
            const el = chosen[k] ?? (k === "l" ? chosen.t : undefined);
            if (el !== slotEl[k]) {
                slotEl[k] = el;
                slotChanged.add(k);
            }
            if (!el) {
                out[k] = { p: base[k].p, r: base[k].r, s: 0 };
                continue;
            }
            const w = slotToWorld(el);
            onScreen[k] = w.on;
            const half = shared && (k === "l" || k === "t");
            const width = half ? w.w / 2 : w.w;
            const x = half ? w.p[0] + (k === "l" ? 1 : -1) * (w.w / 4) : w.p[0];
            const fit = Math.min(w.h / SIZE[k].h, width / SIZE[k].w) * (half ? 0.8 : 0.92);
            out[k] = {
                p: [x, w.p[1], w.p[2]],
                r: k === "g" || k === "k" ? base[k].r : (base[k].r.map((v) => v * 0.5) as ResolvedPose["r"]),
                s: Math.min(fit, 1.15),
            };
        }
        return out;
    }

    function target(): Record<ObjectKey, ResolvedPose> {
        const mobile = isMobile();
        const tablet = isTablet();
        const route = sceneForPath(path);
        const base = route ? fixed(route, tablet) : sample(anchors, window.scrollY, tablet);
        return mobile ? slotPoses(base) : base;
    }

    function apply(pose: Record<ObjectKey, ResolvedPose>) {
        const px = isMobile() ? 3.5 : 5;
        const vh = viewH();
        for (const k of OBJECT_KEYS) {
            const o = parts[k];
            const p = pose[k];
            o.position.set(...p.p);
            o.rotation.set(...p.r);
            const s = Math.max(p.s, 0.0001);
            o.scale.setScalar(s);
            o.visible = p.s > 0.01;
            const dist = CAMERA_Z - p.p[2];
            const worldPerPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * dist) / vh;
            setHullThickness(materials, k, (px * worldPerPx) / s);
        }
    }

    const rig = parts.k.userData.rig as KeyboardRig;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let lastInput = performance.now();
    let nextIdle = 0;
    const live = () => !reduced.matches && !document.hidden && parts.k.visible;

    function onKeyDown(e: KeyboardEvent) {
        const t = e.target;
        if (!live() || e.repeat) return;
        if (t instanceof Element && (t.closest("input,textarea,select,[contenteditable]") || (t as HTMLElement).isContentEditable)) return;
        const now = performance.now();
        if (rig.pressCode(e.code, now / 1000)) lastInput = now;
    }

    function onPointerDown(e: PointerEvent) {
        if (!live() || (e.target instanceof Element && e.target.closest(INTERACTIVE))) return;
        pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / viewH()) * 2 - 1));
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(rig.pick, false)[0];
        if (!hit || hit.instanceId === undefined) return;
        const index = rig.indexOf(hit.object as InstancedMesh, hit.instanceId);
        if (index < 0) return;
        const now = performance.now();
        rig.press(index, now / 1000);
        lastInput = now;
    }

    function idleRipple(now: number) {
        if (!parts.k.visible || now - lastInput < IDLE_AFTER || now < nextIdle) return;
        rig.pressRandom(now / 1000);
        nextIdle = now + 2000 + Math.random() * 2000;
    }

    function render() {
        renderer.render(scene, camera);
    }

    function frame(now: number) {
        raf = 0;
        if (disposed || document.hidden || reduced.matches) return;
        const goal = target();
        const mobile = isMobile();
        if (!current) current = goal;
        else if (mobile) {
            for (const k of OBJECT_KEYS) {
                const c = current[k];
                const g = goal[k];
                const o = offset[k];
                if (slotChanged.has(k)) {
                    const both = wasOn[k] && onScreen[k];
                    o.p = both ? [c.p[0] - g.p[0], c.p[1] - g.p[1], c.p[2] - g.p[2]] : [0, 0, 0];
                    o.s = both ? c.s - g.s : 0;
                }
                o.p = [o.p[0] * 0.85, o.p[1] * 0.85, o.p[2] * 0.85];
                o.s *= 0.85;
                wasOn[k] = onScreen[k];
                c.p = [g.p[0] + o.p[0], g.p[1] + o.p[1], g.p[2] + o.p[2]];
                c.r = [lerp(c.r[0], g.r[0], FOLLOW), lerp(c.r[1], g.r[1], FOLLOW), lerp(c.r[2], g.r[2], FOLLOW)];
                c.s = Math.max(0, g.s + o.s);
            }
            slotChanged.clear();
        } else
            for (const k of OBJECT_KEYS) {
                const c = current[k];
                const g = goal[k];
                c.p = [lerp(c.p[0], g.p[0], FOLLOW), lerp(c.p[1], g.p[1], FOLLOW), lerp(c.p[2], g.p[2], FOLLOW)];
                c.r = [lerp(c.r[0], g.r[0], FOLLOW), lerp(c.r[1], g.r[1], FOLLOW), lerp(c.r[2], g.r[2], FOLLOW)];
                c.s = lerp(c.s, g.s, FOLLOW);
            }
        apply(current);
        idleRipple(now);
        const seconds = now / 1000;
        for (const k of OBJECT_KEYS) if (parts[k].visible) tickObject(parts[k], seconds);
        render();
        raf = requestAnimationFrame(frame);
    }

    function still() {
        current = target();
        slotChanged.clear();
        apply(current);
        render();
    }

    function start() {
        if (disposed || raf || document.hidden) return;
        if (reduced.matches) still();
        else raf = requestAnimationFrame(frame);
    }

    function stop() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    }

    function resize() {
        let w = container.clientWidth || window.innerWidth;
        let h = container.clientHeight || window.innerHeight;
        if (isMobile()) {
            stableH = window.innerWidth === stableW ? Math.max(stableH, window.innerHeight) : window.innerHeight;
            stableW = window.innerWidth;
            w = stableW;
            h = stableH;
        }
        renderer.setSize(w, h, false);
        renderer.domElement.style.height = isMobile() ? `${h}px` : "100%";
        camera.aspect = w / h;
        camera.fov = fovFor();
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        anchors = readAnchors();
        if (reduced.matches) still();
    }

    function onScroll() {
        if (reduced.matches && isMobile()) still();
    }

    function onVisibility() {
        if (document.hidden) stop();
        else start();
    }

    function onMotionChange() {
        stop();
        start();
    }

    const modelUrl = (name: string) => `${import.meta.env.BASE_URL}models/${name}.glb`;
    const settle = () => {
        logTriangles();
        if (reduced.matches) still();
    };
    loadGlasses(materials, modelUrl("glasses")).then(
        (glasses) => {
            if (disposed) return;
            parts.g.add(glasses);
            settle();
        },
        () => {},
    );
    loadLaptop(materials, modelUrl("laptop")).then(
        (laptop) => {
            if (disposed) return;
            parts.l.add(laptop);
            settle();
        },
        () => {},
    );

    if (import.meta.env.DEV) {
        (window as unknown as { __scene: unknown }).__scene = {
            waves: () => rig.active,
            probe(k: ObjectKey) {
                const o = parts[k];
                const v = o.position.clone().project(camera);
                const wpp = (2 * Math.tan((camera.fov * Math.PI) / 360) * (CAMERA_Z - o.position.z)) / viewH();
                return {
                    x: ((v.x + 1) / 2) * window.innerWidth,
                    y: ((1 - v.y) / 2) * viewH(),
                    h: (o.scale.x * SIZE[k].h) / wpp,
                    visible: o.visible,
                };
            },
        };
    }

    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(container);
    resizeObs.observe(document.body);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    reduced.addEventListener("change", onMotionChange);
    resize();
    start();

    return {
        get triangles() {
            return triangles;
        },
        setRoute(pathname) {
            path = pathname;
            anchors = readAnchors();
            if (reduced.matches) still();
        },
        dispose() {
            disposed = true;
            stop();
            resizeObs.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("scroll", onScroll);
            reduced.removeEventListener("change", onMotionChange);
            disposeTree(scene);
            scene.clear();
            renderer.dispose();
            renderer.forceContextLoss();
            renderer.domElement.remove();
        },
    };
}
