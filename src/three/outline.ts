import {
    BackSide,
    Color,
    DataTexture,
    Group,
    InstancedMesh,
    Mesh,
    MeshBasicMaterial,
    MeshToonMaterial,
    NearestFilter,
    RedFormat,
    type BufferGeometry,
    type Material,
} from "three";

export interface HullMaterial extends MeshBasicMaterial {
    userData: { thick: { value: number } };
}

let gradient: DataTexture | null = null;

function toonGradient(): DataTexture {
    if (!gradient) {
        gradient = new DataTexture(new Uint8Array([80, 200, 255]), 3, 1, RedFormat);
        gradient.minFilter = NearestFilter;
        gradient.magFilter = NearestFilter;
        gradient.needsUpdate = true;
    }
    return gradient;
}

export function createFill(color: Color): MeshToonMaterial {
    return new MeshToonMaterial({ color: color.clone(), gradientMap: toonGradient() });
}

/** El casco se desplaza en el vertex shader para poder cambiar el grosor en píxeles sin clonar geometría. */
export function createHull(color: Color): HullMaterial {
    const mat = new MeshBasicMaterial({ color: color.clone(), side: BackSide }) as HullMaterial;
    const thick = { value: 0.03 };
    mat.userData.thick = thick;
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uThick = thick;
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nuniform float uThick;")
            .replace(
                "#include <begin_vertex>",
                "vec3 transformed = position + normalize(normal) * uThick;",
            );
    };
    return mat;
}

export function part(geo: BufferGeometry, fill: Material, hull: Material | null): Group {
    const g = new Group();
    g.add(new Mesh(geo, fill));
    if (hull) g.add(new Mesh(geo, hull));
    return g;
}

export function instancedPart(
    geo: BufferGeometry,
    fill: Material,
    hull: Material,
    count: number,
): { fill: InstancedMesh; hull: InstancedMesh; group: Group } {
    const f = new InstancedMesh(geo, fill, count);
    const h = new InstancedMesh(geo, hull, count);
    const group = new Group();
    group.add(f, h);
    return { fill: f, hull: h, group };
}
