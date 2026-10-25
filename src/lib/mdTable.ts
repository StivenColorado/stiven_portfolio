const SEPARATOR = /^:?-{3,}:?$/;

export const isTable = (text: string) => /^\s*\|/.test(text) && /\n\s*\|[\s:|-]*-{3}[\s:|-]*\|/.test(text);

/** Lee una tabla escrita con barras (| a | b |); la primera fila es el encabezado. */
export function parseTable(text: string): string[][] {
    const rows = text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"))
        .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
        .filter((cells) => !cells.every((c) => SEPARATOR.test(c)));
    const width = Math.max(0, ...rows.map((r) => r.length));
    return rows.map((r) => [...r, ...Array<string>(width - r.length).fill("")]);
}

export function serializeTable(rows: string[][]): string {
    if (rows.length === 0) return "";
    const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
    return [line(rows[0] as string[]), `|${(rows[0] as string[]).map(() => "---").join("|")}|`, ...rows.slice(1).map(line)].join("\n");
}
