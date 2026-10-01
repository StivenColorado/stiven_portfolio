import {
    AmbientLight,
    BufferAttribute,
    Box3,
    ExtrudeGeometry,
    Path,
    Shape,
    BufferGeometry,
    Color,
    DirectionalLight,
    Group,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
    type Material,
    type Object3D,
} from "three"
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { createFill, createHull, type HullMaterial } from "../three/outline.ts"

export interface MacbookState {
    enter: number
    open: number
    vis: number
}

export interface MacbookScene {
    update(state: MacbookState): void
    dispose(): void
}

interface Options {
    url: string
    screenEl: HTMLElement
    staticOpen: boolean
    onLost: () => void
}

const UNIT = 3 / 0.31
const PIVOT = new Vector3(0, 0.0105 * UNIT, -0.1095 * UNIT)
const OPEN_ANGLE = -0.3
const CLOSED_ANGLE = Math.PI / 2
const FOV = 28
const CREASE = (40 * Math.PI) / 180
const BEZEL = 0.1
const SCREEN_RATIO = 1.6

const ease = (t: number) => 1 - (1 - t) ** 3
const inOut = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function baked(mesh: Mesh, shift?: Vector3): BufferGeometry {
    const src = mesh.geometry.attributes.position
    const out = new Float32Array(src.count * 3)
    const v = new Vector3()
    for (let i = 0; i < src.count; i++) {
        v.fromBufferAttribute(src, i).applyMatrix4(mesh.matrixWorld)
        if (shift) v.sub(shift)
        v.toArray(out, i * 3)
    }
    const geo = new BufferGeometry()
    geo.setAttribute("position", new BufferAttribute(out, 3))
    if (mesh.geometry.index) geo.setIndex(mesh.geometry.index.clone())
    return geo
}

function solid(geo: BufferGeometry, fill: Material, hull: Material): Group {
    const g = new Group()
    g.add(new Mesh(toCreasedNormals(geo.clone(), CREASE), fill))
    geo.computeVertexNormals()
    g.add(new Mesh(geo, hull))
    return g
}

function wallHull(geo: BufferGeometry, hull: Material): Mesh {
    const pos = geo.attributes.position
    const idx = geo.index!
    const keep: number[] = []
    const a = new Vector3()
    const b = new Vector3()
    const c = new Vector3()
    for (let i = 0; i < idx.count; i += 3) {
        a.fromBufferAttribute(pos, idx.getX(i))
        b.fromBufferAttribute(pos, idx.getX(i + 1))
        c.fromBufferAttribute(pos, idx.getX(i + 2))
        const n = b.sub(a).cross(c.sub(a)).normalize()
        if (Math.abs(n.y) < 0.55) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2))
    }
    const walls = new BufferGeometry()
    walls.setAttribute("position", pos)
    walls.setIndex(keep)
    walls.computeVertexNormals()
    return new Mesh(walls, hull)
}

function roundedRect(path: Shape | Path, x0: number, x1: number, z0: number, z1: number, r: number) {
    path.moveTo(x0 + r, z0)
    path.lineTo(x1 - r, z0)
    path.quadraticCurveTo(x1, z0, x1, z0 + r)
    path.lineTo(x1, z1 - r)
    path.quadraticCurveTo(x1, z1, x1 - r, z1)
    path.lineTo(x0 + r, z1)
    path.quadraticCurveTo(x0, z1, x0, z1 - r)
    path.lineTo(x0, z0 + r)
    path.quadraticCurveTo(x0, z0, x0 + r, z0)
}

function underRing(box: Box3, t: number): ExtrudeGeometry {
    const e = t * 0.7
    const s = new Shape()
    roundedRect(s, box.min.x - e, box.max.x + e, box.min.z - e, box.max.z + e, 0.13 + e)
    const hole = new Path()
    const g = 0.05
    roundedRect(hole, box.min.x + g, box.max.x - g, box.min.z + g, box.max.z - g, 0.13 - g)
    s.holes.push(hole)
    const geo = new ExtrudeGeometry(s, { depth: t * 1.2, bevelEnabled: false, curveSegments: 8 })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, box.min.y, 0)
    return geo
}

function pick(root: Object3D, name: string): Mesh {
    let found: Mesh | null = null
    root.traverse((o) => {
        if (!found && (o as Mesh).isMesh && o.name === name) found = o as Mesh
    })
    if (!found) throw new Error(`macbook: falta la malla ${name}`)
    return found
}

export async function createMacbookScene(host: HTMLElement, opts: Options): Promise<MacbookScene> {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(opts.url)
    gltf.scene.updateMatrixWorld(true)
    const baseGeo = baked(pick(gltf.scene, "base"))
    const deckGeo = baked(pick(gltf.scene, "deck"))
    const keysGeo = baked(pick(gltf.scene, "keys"))
    const lidGeo = baked(pick(gltf.scene, "lid"), PIVOT)
    const glassGeo = baked(pick(gltf.scene, "screen"), PIVOT)
    glassGeo.computeBoundingBox()
    const glass = glassGeo.boundingBox!

    const mobile = () => window.innerWidth < 768
    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    renderer.setClearAlpha(0)
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
    const css = new CSS3DRenderer()
    css.domElement.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none"
    host.append(renderer.domElement, css.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 80)
    scene.add(new AmbientLight(0xffffff, 0.7))
    const sun = new DirectionalLight(0xffffff, 2.5)
    sun.position.set(-3, 5, 6)
    scene.add(sun)

    const fill = createFill(new Color("#f4f2ec"))
    const hull: HullMaterial = createHull(new Color("#111111"))
    const dark = new MeshBasicMaterial({ color: new Color("#111111"), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    const plateMat = new MeshBasicMaterial({ color: new Color("#111111") })
    const glassMat = new MeshBasicMaterial({ color: new Color("#18181b") })

    const rig = new Group()
    const mac = new Group()
    rig.add(mac)
    const shell = new Group()
    shell.add(new Mesh(toCreasedNormals(baseGeo.clone(), CREASE), fill), wallHull(baseGeo, hull))
    baseGeo.computeBoundingBox()
    const baseBox = baseGeo.boundingBox!.clone()
    const plate = new Mesh(underRing(baseBox, 0.03), plateMat)
    shell.add(plate)
    mac.add(shell)
    mac.add(new Mesh(toCreasedNormals(deckGeo, CREASE), fill))
    mac.add(new Mesh(keysGeo, dark))
    const lid = new Group()
    lid.position.copy(PIVOT)
    lid.add(solid(lidGeo, fill, hull))
    lid.add(new Mesh(glassGeo, glassMat))
    mac.add(lid)
    scene.add(rig)

    const sw = glass.max.x - glass.min.x - BEZEL * 2
    const sh = sw / SCREEN_RATIO
    const scx = (glass.max.x + glass.min.x) / 2
    const scy = glass.max.y - BEZEL - sh / 2
    const screenObj = new CSS3DObject(opts.screenEl)
    opts.screenEl.style.userSelect = "text"
    opts.screenEl.style.setProperty("-webkit-user-select", "text")
    screenObj.position.set(scx, scy, glass.max.z + 0.006)
    lid.add(screenObj)

    const state: MacbookState = { enter: 0, open: 0, vis: 0 }
    let raf = 0
    let disposed = false
    let width = 1
    let height = 1

    const tmpN = new Vector3()
    const tmpP = new Vector3()
    const tmpC = new Vector3()

    function applyPose() {
        const e = ease(clamp01(state.enter))
        rig.rotation.y = (1 - e) * -Math.PI * 1.35
        rig.position.y = (1 - e) * -0.7
        rig.scale.setScalar(0.72 + 0.28 * e)
        lid.rotation.x = CLOSED_ANGLE + (OPEN_ANGLE - CLOSED_ANGLE) * inOut(clamp01(state.open))
        rig.updateMatrixWorld(true)
        screenObj.getWorldPosition(tmpP)
        tmpN.set(0, 0, 1).transformDirection(lid.matrixWorld)
        tmpC.copy(camera.position).sub(tmpP).normalize()
        const facing = tmpN.dot(tmpC)
        const shown = clamp01((state.open - 0.55) / 0.3) * clamp01(facing * 6) * (state.vis > 0.02 ? 1 : 0)
        opts.screenEl.style.opacity = String(shown)
        screenObj.visible = shown > 0.01
    }

    function layout() {
        width = Math.max(1, host.clientWidth)
        height = Math.max(1, host.clientHeight)
        const dpr = Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2)
        renderer.setPixelRatio(dpr)
        renderer.setSize(width, height, false)
        css.setSize(width, height)
        const aspect = width / height
        camera.aspect = aspect
        camera.updateProjectionMatrix()

        const wide = aspect > 1.15
        const half = Math.tan((FOV * Math.PI) / 360)
        const keep = { ...state }
        state.enter = 1
        state.open = 1
        state.vis = 1
        camera.position.set(0, 0, 10)
        camera.updateMatrixWorld(true)
        applyPose()

        const box = new Box3().setFromObject(mac)
        const corners: Vector3[] = []
        for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z))
        const center = box.getCenter(new Vector3())
        const fitW = wide ? 0.56 : 0.97
        const fitH = wide ? 0.8 : 0.7
        const goalX = wide ? 0.32 : 0
        const goalY = wide ? 0.0 : 0.06
        const elev = wide ? -OPEN_ANGLE : 0.5
        let dist = 10
        const look = center.clone()
        const aim = () => {
            camera.position.set(look.x, look.y + dist * Math.sin(elev), look.z + dist * Math.cos(elev))
            camera.lookAt(look)
            camera.updateMatrixWorld(true)
        }
        const extent = () => {
            let x0 = Infinity
            let x1 = -Infinity
            let y0 = Infinity
            let y1 = -Infinity
            for (const c of corners) {
                const p = c.clone().project(camera)
                x0 = Math.min(x0, p.x)
                x1 = Math.max(x1, p.x)
                y0 = Math.min(y0, p.y)
                y1 = Math.max(y1, p.y)
            }
            return { x0, x1, y0, y1 }
        }
        for (let i = 0; i < 5; i++) {
            aim()
            const e = extent()
            dist *= Math.max((e.x1 - e.x0) / (2 * fitW), (e.y1 - e.y0) / (2 * fitH))
            aim()
            const f = extent()
            const cx = (f.x0 + f.x1) / 2 - goalX
            const cy = (f.y0 + f.y1) / 2 - goalY
            const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
            const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
            look.addScaledVector(right, cx * half * dist * aspect).addScaledVector(up, cy * half * dist)
        }
        aim()

        const left = lid.localToWorld(new Vector3(scx - sw / 2, scy, 0))
        const right = lid.localToWorld(new Vector3(scx + sw / 2, scy, 0))
        const toPx = (v: Vector3) => v.project(camera).x * (width / 2)
        const pxW = Math.abs(toPx(right) - toPx(left))
        const cssW = Math.max(240, Math.round(pxW))
        const cssH = Math.round(cssW / SCREEN_RATIO)
        opts.screenEl.style.width = `${cssW}px`
        opts.screenEl.style.height = `${cssH}px`
        opts.screenEl.style.fontSize = `${cssW < 420 ? 12 : cssW < 760 ? 13.5 : 15.5}px`
        opts.screenEl.dataset.size = cssW < 420 ? "s" : "m"
        screenObj.scale.setScalar(sw / cssW)

        const wpp = (2 * half * dist) / height
        const thick = (mobile() ? 2 : 2.5) * wpp
        hull.userData.thick.value = thick
        plate.geometry.dispose()
        plate.geometry = underRing(baseBox, thick)

        Object.assign(state, keep)
        applyPose()
    }

    function frame() {
        raf = 0
        if (disposed) return
        applyPose()
        renderer.render(scene, camera)
        css.render(scene, camera)
    }

    function request() {
        if (raf || disposed || document.hidden) return
        raf = requestAnimationFrame(frame)
    }

    const onVisible = () => {
        if (!document.hidden) request()
    }
    const onLost = (e: Event) => {
        e.preventDefault()
        opts.onLost()
    }
    renderer.domElement.addEventListener("webglcontextlost", onLost)
    document.addEventListener("visibilitychange", onVisible)
    const observer = new ResizeObserver(() => {
        layout()
        request()
    })
    observer.observe(host)
    layout()

    if (opts.staticOpen) {
        state.enter = 1
        state.open = 1
        state.vis = 1
        request()
    }

    return {
        update(next) {
            if (opts.staticOpen) return
            const changed =
                Math.abs(next.enter - state.enter) > 1e-4 ||
                Math.abs(next.open - state.open) > 1e-4 ||
                (next.vis > 0.02) !== (state.vis > 0.02)
            state.enter = next.enter
            state.open = next.open
            state.vis = next.vis
            if (changed && next.vis > 0.02) request()
        },
        dispose() {
            disposed = true
            cancelAnimationFrame(raf)
            observer.disconnect()
            document.removeEventListener("visibilitychange", onVisible)
            renderer.domElement.removeEventListener("webglcontextlost", onLost)
            scene.traverse((o) => {
                const mesh = o as Mesh
                if (mesh.isMesh) mesh.geometry.dispose()
            })
            for (const m of [fill, hull, dark, plateMat, glassMat]) m.dispose()
            renderer.dispose()
            renderer.forceContextLoss()
            renderer.domElement.remove()
            css.domElement.remove()
            opts.screenEl.remove()
        },
    }
}
