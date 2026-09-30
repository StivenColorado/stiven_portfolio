import type { KeyboardEvent, MouseEvent } from "react";
import type { Visitor } from "../../lib/api";
import Check from "./Check";
import { countryName } from "./country";
import Flag from "./Flag";
import { fmtDateTime, fmtShort, timesLabel } from "./format";

interface Props {
    visitors: Visitor[];
    selected: Set<string>;
    onToggle: (ip: string, on: boolean) => void;
    onToggleAll: (on: boolean) => void;
    onOpen: (v: Visitor) => void;
}

export function Place({ v }: { v: Pick<Visitor, "country" | "city"> }) {
    if (!v.country && !v.city) return <>—</>;
    return (
        <span className="inline-flex items-center gap-2">
            {v.country && <Flag code={v.country} />}
            <span>{[v.country && countryName(v.country), v.city].filter(Boolean).join(" · ")}</span>
        </span>
    );
}

export const Multi = ({ main, all }: { main: string; all: string[] }) =>
    all.length > 1 ? <span title={all.join(", ")}>{main} <span className="text-muted">+{all.length - 1}</span></span> : <>{main}</>;

const rowProps = (v: Visitor, onOpen: (v: Visitor) => void) => ({
    tabIndex: 0,
    onClick: () => onOpen(v),
    onKeyDown: (e: KeyboardEvent) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onOpen(v);
        }
    },
});

const stop = (e: MouseEvent) => e.stopPropagation();

function DetailButton({ v, onOpen }: { v: Visitor; onOpen: (v: Visitor) => void }) {
    return (
        <button type="button" className="btn !min-h-8 whitespace-nowrap !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); onOpen(v); }}>
            Ver detalle
        </button>
    );
}

export default function VisitsTable({ visitors, selected, onToggle, onToggleAll, onOpen }: Props) {
    if (visitors.length === 0) return <p className="text-sm text-muted">Sin visitantes para estos filtros.</p>;

    const all = visitors.every((v) => selected.has(v.ip));
    const focus = "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lens";

    return (
        <>
            <div className="flex items-center gap-2 text-sm md:hidden">
                <Check checked={all} onChange={onToggleAll} label="Seleccionar todos los visitantes de la página" />
                <span className="text-muted">Seleccionar todo</span>
            </div>
            <ul className="space-y-3 md:hidden">
                {visitors.map((v) => (
                    <li key={v.ip} {...rowProps(v, onOpen)} className={`window window-body space-y-2 !p-3 text-sm ${focus} ${selected.has(v.ip) ? "bg-grey-2" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3" onClick={stop}>
                                <Check checked={selected.has(v.ip)} onChange={(on) => onToggle(v.ip, on)} label={`Seleccionar ${v.ip}`} />
                                <p className="break-all font-mono text-xs font-bold text-ink">{v.ip}</p>
                            </div>
                            <span className="tag shrink-0">{timesLabel(v.visits)}</span>
                        </div>
                        <p><Place v={v} /></p>
                        <p className="text-muted"><Multi main={v.os} all={v.oses} /> · <Multi main={v.device} all={v.devices} /></p>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs text-muted">
                            <dt>Última</dt><dd className="font-mono">{fmtDateTime.format(v.lastSeen)}</dd>
                            <dt>Primera</dt><dd className="font-mono">{fmtDateTime.format(v.firstSeen)}</dd>
                        </dl>
                        <DetailButton v={v} onOpen={onOpen} />
                    </li>
                ))}
            </ul>
            <div className="window hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead className="eyebrow border-b-2 border-ink bg-grey-2">
                        <tr>
                            <th className="w-10 px-3 py-2">
                                <Check checked={all} onChange={onToggleAll} label="Seleccionar todos los visitantes de la página" />
                            </th>
                            {["Última visita", "IP", "Ubicación", "OS · Dispositivo", "Ingresos", "Primera visita"].map((h) => (
                                <th key={h} className="whitespace-nowrap px-3 py-2 font-normal">{h}</th>
                            ))}
                            <th className="px-3 py-2"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.map((v) => (
                            <tr key={v.ip} {...rowProps(v, onOpen)} className={`border-b border-grey-2 hover:bg-grey ${focus} ${selected.has(v.ip) ? "bg-grey-2" : ""}`}>
                                <td className="px-3 py-2" onClick={stop}><Check checked={selected.has(v.ip)} onChange={(on) => onToggle(v.ip, on)} label={`Seleccionar ${v.ip}`} /></td>
                                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{fmtShort.format(v.lastSeen)}</td>
                                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{v.ip}</td>
                                <td className="whitespace-nowrap px-3 py-2"><Place v={v} /></td>
                                <td className="whitespace-nowrap px-3 py-2"><Multi main={v.os} all={v.oses} /> · <Multi main={v.device} all={v.devices} /></td>
                                <td className="whitespace-nowrap px-3 py-2"><span className="tag">{timesLabel(v.visits)}</span></td>
                                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{fmtShort.format(v.firstSeen)}</td>
                                <td className="px-3 py-2"><DetailButton v={v} onOpen={onOpen} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
