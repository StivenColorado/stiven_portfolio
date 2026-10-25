import { fill, toBlocks } from "./contractText";
import type { Block } from "./contractText";
import type { ContractLang, TemplateVar, VarType } from "../types/contracts";

const TEXTAREA = new Set(["alcance", "entregables", "hitos", "observaciones", "objeto", "cambio_descripcion"]);
const MONEY = new Set(["monto", "tarifa_hora", "cambio_costo"]);

/** Cuando el documento no trae definiciones declaradas se infiere el control por el nombre de la variable. */
export function varType(key: string, defs: TemplateVar[] = []): VarType {
    const def = defs.find((d) => d.key === key);
    if (def) return def.type;
    if (TEXTAREA.has(key)) return "textarea";
    if (MONEY.has(key)) return "money";
    if (key.startsWith("fecha")) return "date";
    if (/_(dias|horas|meses)$/.test(key) || key === "horas_mensuales" || key === "rondas_revision") return "number";
    return "text";
}

export const varLabel = (key: string, defs: TemplateVar[] = []): string =>
    defs.find((d) => d.key === key)?.label || key.replace(/_/g, " ");

export function previewBlocks(body: string, vars: Record<string, string>, defs: TemplateVar[], lang: ContractLang): Block[] {
    const keys = new Set([...Object.keys(vars), ...defs.map((d) => d.key)]);
    const types: Record<string, string> = {};
    keys.forEach((k) => { types[k] = varType(k, defs); });
    return toBlocks(fill(body, vars, { types, lang }));
}

export const shortHash = (hash: string | null | undefined) => (hash ? hash.slice(0, 8) : "");
