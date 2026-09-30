import type { Visit } from "../../lib/api";
import Check from "./Check";
import { countryName } from "./country";
import Flag from "./Flag";
import RowMenu from "./RowMenu";

interface Props {
    visits: Visit[];
    selected: Set<number>;
    onToggle: (id: number, on: boolean) => void;
    onToggleAll: (on: boolean) => void;
    onDeleteOne: (v: Visit) => void;
    onDeleteIp: (v: Visit) => void;
}

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "medium" });

function Place({ v }: { v: Visit }) {
    if (!v.country && !v.city) return <>—</>;
    return (
        <span className="inline-flex items-center gap-2">
            {v.country && <Flag code={v.country} />}
            <span>{[v.country && countryName(v.country), v.city].filter(Boolean).join(" · ")}</span>
        </span>
    );
}

const when = (v: Visit) => fmt.format(new Date(v.ts));
const trunc = (s: string | null, n = 40) => (s && s.length > n ? `${s.slice(0, n)}…` : s || "—");

export default function VisitsTable({ visits, selected, onToggle, onToggleAll, onDeleteOne, onDeleteIp }: Props) {
    if (visits.length === 0) return <p className="text-sm text-muted">Sin visitas para estos filtros.</p>;

    const all = visits.every((v) => selected.has(v.id));

    return (
        <>
            <div className="flex items-center gap-2 text-sm md:hidden">
                <Check checked={all} onChange={onToggleAll} label="Seleccionar todas las visitas de la página" />
                <span className="text-muted">Seleccionar todo</span>
            </div>
            <ul className="space-y-3 md:hidden">
                {visits.map((v) => (
                    <li key={v.id} className="window window-body space-y-1 !p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <Check checked={selected.has(v.id)} onChange={(on) => onToggle(v.id, on)} label={`Seleccionar visita ${v.id}`} />
                                <p className="font-mono text-xs text-muted">{when(v)}</p>
                            </div>
                            <RowMenu ip={v.ip} onOne={() => onDeleteOne(v)} onIp={() => onDeleteIp(v)} />
                        </div>
                        <p className="break-all font-mono text-ink">{v.path}</p>
                        <p className="text-muted">{v.os} · {v.device} · <Place v={v} /></p>
                        <p className="break-all font-mono text-xs text-muted">{v.ip}</p>
                        <p className="break-all text-xs text-muted" title={v.referrer ?? undefined}>{trunc(v.referrer, 60)}</p>
                        <p className="break-all font-mono text-xs text-muted" title={v.ua ?? undefined}>{trunc(v.ua, 60)}</p>
                    </li>
                ))}
            </ul>
            <div className="window hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead className="eyebrow border-b-2 border-ink bg-grey-2">
                        <tr>
                            <th className="w-10 px-3 py-2">
                                <Check checked={all} onChange={onToggleAll} label="Seleccionar todas las visitas de la página" />
                            </th>
                            {["Fecha", "IP", "Ubicación", "OS", "Dispositivo", "Ruta", "Referrer", "UA"].map((h) => (
                                <th key={h} className="whitespace-nowrap px-3 py-2 font-normal">{h}</th>
                            ))}
                            <th className="w-10 px-3 py-2"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visits.map((v) => (
                            <tr key={v.id} className={`border-b border-grey-2 ${selected.has(v.id) ? "bg-grey-2" : ""}`}>
                                <td className="px-3 py-2"><Check checked={selected.has(v.id)} onChange={(on) => onToggle(v.id, on)} label={`Seleccionar visita ${v.id}`} /></td>
                                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{when(v)}</td>
                                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{v.ip}</td>
                                <td className="whitespace-nowrap px-3 py-2"><Place v={v} /></td>
                                <td className="px-3 py-2">{v.os}</td>
                                <td className="px-3 py-2">{v.device}</td>
                                <td className="px-3 py-2 font-mono text-xs">{v.path}</td>
                                <td className="px-3 py-2 text-xs" title={v.referrer ?? undefined}>{trunc(v.referrer, 30)}</td>
                                <td className="px-3 py-2 font-mono text-xs" title={v.ua ?? undefined}>{trunc(v.ua, 30)}</td>
                                <td className="px-3 py-2"><RowMenu ip={v.ip} onOne={() => onDeleteOne(v)} onIp={() => onDeleteIp(v)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
