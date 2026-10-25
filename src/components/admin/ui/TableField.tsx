import { useState } from "react";
import { ChevronDown, Plus, TableProperties, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "./ConfirmDialog";
import { parseTable, serializeTable } from "../../../lib/mdTable";

interface Props { label: string; value: string; onChange: (markdown: string) => void; fallback?: string; hint?: string; error?: string; editStructure?: boolean }

const cell = "field h-11 w-full min-w-[9rem] !py-0 !text-sm";
const STATUS_HEADER = /^(estado|status)$/i;
const AUTO_HEADER = /^(entregable|deliverable)$/i;
const STATUS_OPTIONS = {
    es: ["Pendiente", "En pruebas", "Hecho", "Confirmado por el cliente"],
    en: ["Pending", "In testing", "Done", "Confirmed by client"],
};
const statusOptions = (header: string, current: string) => {
    const list = STATUS_OPTIONS[/^status$/i.test(header) ? "en" : "es"];
    return !current || list.includes(current) ? list : [current, ...list];
};
const blankRow = (header: string[]) => header.map((h) => (STATUS_HEADER.test(h) ? statusOptions(h, "")[0] as string : ""));
const clean = (v: string) => v.replace(/[|\n]/g, " ");

/** Las columnas "Entregable" se numeran solas y "Estado" es una lista; el resto son celdas libres.
 * Los datos se llenan en un modal con la tabla a pantalla; solo el editor de plantillas puede cambiar encabezados y columnas. */
export default function TableField({ label, value, onChange, fallback = "", hint, error, editStructure = false }: Props) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<string[][] | null>(null);
    const base = parseTable(value);
    const rows = base.length ? base : parseTable(fallback).length ? parseTable(fallback) : [["", ""], ["", ""]];
    const cols = draft?.[0]?.length ?? 0;
    const isAuto = (h: string) => AUTO_HEADER.test(h.trim());
    const withAuto = (d: string[][]) => d.map((row, i) => (i === 0 ? row : row.map((v, c) => (isAuto(d[0]?.[c] ?? "") ? `${d[0]?.[c]} ${i}` : v))));
    const setCell = (r: number, c: number, v: string) => setDraft((d) => d && d.map((row, i) => (i === r ? row.map((x, j) => (j === c ? clean(v) : x)) : row)));
    const focusNext = (r: number, c: number) => (e: React.KeyboardEvent) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const next = document.querySelector<HTMLInputElement>(`[data-cell="${r + 1}-${c}"]`);
        if (next) next.focus();
        else { setDraft((d) => d && [...d, blankRow(d[0] ?? [])]); setTimeout(() => document.querySelector<HTMLInputElement>(`[data-cell="${r + 1}-${c}"]`)?.focus(), 0); }
    };

    return (
        <fieldset className="min-w-0 space-y-2">
            <legend className="eyebrow">{label}</legend>
            {hint && <p className="text-xs text-muted">{hint}</p>}
            <div className="overflow-x-auto border-2 border-ink">
                <table className="w-full border-collapse text-left text-sm">
                    <thead><tr className="bg-grey/40">{rows[0]?.map((h, c) => <th key={c} scope="col" className="border-b-2 border-ink p-2 font-extrabold">{h}</th>)}</tr></thead>
                    <tbody>
                        {rows.slice(1).map((row, i) => (
                            <tr key={i} className="border-t border-ink/30">{row.map((v, c) => <td key={c} className="p-2 align-top break-words">{v || <span className="text-muted">—</span>}</td>)}</tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-sm" onClick={() => setDraft(rows.map((r) => [...r]))}>
                <TableProperties size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.table.fill")}
            </button>
            {error && <p role="alert" className="text-sm font-extrabold text-ink">{error}</p>}

            <ConfirmDialog open={draft !== null} wide="xl" title={label} confirmLabel={t("adminContracts.table.save")} onCancel={() => setDraft(null)}
                onConfirm={() => { if (draft) onChange(serializeTable(withAuto(draft))); setDraft(null); }}>
                {draft && (
                    <div className="space-y-3">
                        <p>{t("adminContracts.table.fillHint")}</p>
                        <div className="max-h-[60vh] overflow-auto border-2 border-ink">
                            <table className="w-full border-collapse text-left">
                                <thead className="sticky top-0 z-10 bg-paper">
                                    <tr className="bg-grey/40">
                                        <th scope="col" className="w-10 border-b-2 border-ink p-2 text-center font-mono text-xs text-muted">#</th>
                                        {draft[0]?.map((h, c) => (
                                            <th key={c} scope="col" className="min-w-[11rem] border-b-2 border-ink p-2 align-middle">
                                                {editStructure ? (
                                                    <div className="flex items-center gap-1">
                                                        <input aria-label={t("adminContracts.table.header", { n: c + 1 })} value={h} onChange={(e) => setCell(0, c, e.target.value)} className={`${cell} !font-extrabold`} />
                                                        {cols > 1 && <button type="button" aria-label={t("adminContracts.table.removeCol")} onClick={() => setDraft((d) => d && d.map((r) => r.filter((_, j) => j !== c)))} className="flex size-10 shrink-0 items-center justify-center hover:bg-ink hover:text-paper"><X size={14} strokeWidth={2.5} aria-hidden /></button>}
                                                    </div>
                                                ) : <span className="eyebrow">{h}</span>}
                                            </th>
                                        ))}
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {draft.slice(1).map((row, i) => (
                                        <tr key={i} className="border-t border-ink/30">
                                            <td className="p-2 text-center align-middle font-mono text-xs text-muted">{i + 1}</td>
                                            {row.map((v, c) => (
                                                <td key={c} className="p-1.5 align-middle">
                                                    {isAuto(draft[0]?.[c] ?? "")
                                                        ? <span className="flex h-11 items-center px-1 font-extrabold">{draft[0]?.[c]} {i + 1}</span>
                                                        : STATUS_HEADER.test(draft[0]?.[c] ?? "")
                                                            ? <div className="relative">
                                                                <select data-cell={`${i + 1}-${c}`} aria-label={`${draft[0]?.[c] ?? ""} · ${i + 1}`} value={v} onChange={(e) => setCell(i + 1, c, e.target.value)} className={`${cell} appearance-none !pr-9`}>
                                                                    {statusOptions(draft[0]?.[c] ?? "", v).map((o) => <option key={o} value={o}>{o}</option>)}
                                                                </select>
                                                                <ChevronDown size={16} strokeWidth={2.5} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                                                            </div>
                                                            : <input data-cell={`${i + 1}-${c}`} aria-label={`${draft[0]?.[c] ?? ""} · ${i + 1}`} value={v} onChange={(e) => setCell(i + 1, c, e.target.value)} onKeyDown={focusNext(i + 1, c)} className={cell} />}
                                                </td>
                                            ))}
                                            <td className="p-1.5 align-middle">
                                                {draft.length > 2 && <button type="button" aria-label={t("adminContracts.table.removeRow")} title={t("adminContracts.table.removeRow")} onClick={() => setDraft((d) => d && d.filter((_, j) => j !== i + 1))} className="flex size-10 items-center justify-center hover:bg-ink hover:text-paper"><X size={14} strokeWidth={2.5} aria-hidden /></button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-sm" onClick={() => setDraft((d) => d && [...d, blankRow(d[0] ?? [])])}><Plus size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.table.addRow")}</button>
                            {editStructure && cols < 6 && <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-sm" onClick={() => setDraft((d) => d && d.map((r, i) => [...r, i === 0 ? t("adminContracts.table.newCol") : ""]))}><Plus size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.table.addCol")}</button>}
                        </div>
                    </div>
                )}
            </ConfirmDialog>
        </fieldset>
    );
}
