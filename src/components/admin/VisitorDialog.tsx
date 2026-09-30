import { useEffect, useRef, useState } from "react";
import { adminApi } from "../../lib/api";
import type { Visit, Visitor } from "../../lib/api";
import { fmtDateTime, timesLabel } from "./format";
import { Multi, Place } from "./VisitsTable";

interface Props {
    visitor: Visitor | null;
    onClose: () => void;
    onDelete: (v: Visitor) => void;
    onUnauthorized: (err: unknown) => void;
}

type Detail = { ip: string; visits: Visit[] } | "error";

const Stat = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="min-w-0">
        <dt className="eyebrow">{label}</dt>
        <dd className="mt-1 break-words text-sm font-bold text-ink">{children}</dd>
    </div>
);

export default function VisitorDialog({ visitor, onClose, onDelete, onUnauthorized }: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const [detail, setDetail] = useState<Detail | null>(null);
    const ip = visitor?.ip;

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (visitor && !dialog.open) dialog.showModal();
        if (!visitor && dialog.open) dialog.close();
    }, [visitor]);

    useEffect(() => {
        if (!ip) return;
        let live = true;
        adminApi.visitorVisits(ip)
            .then(({ visits }) => live && setDetail({ ip, visits }))
            .catch((err: unknown) => { onUnauthorized(err); if (live) setDetail("error"); });
        return () => { live = false; setDetail(null); };
    }, [ip, onUnauthorized]);

    const visits = detail && detail !== "error" && detail.ip === ip ? detail.visits : null;
    const v = visitor;

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => e.target === ref.current && ref.current?.close()}
            aria-labelledby="visitor-title"
            className="window m-auto flex max-h-[100dvh] w-full max-w-3xl flex-col p-0 backdrop:bg-paper/60 backdrop:dither-dense max-sm:h-[100dvh] max-sm:max-w-none sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] [&:not([open])]:hidden"
        >
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate font-mono">{v?.ip}.log</span>
                <button type="button" onClick={() => ref.current?.close()} className="px-2 font-bold" aria-label="Cerrar">✕</button>
            </div>
            {v && (
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 id="visitor-title" className="break-all font-mono text-xl leading-tight">{v.ip}</h2>
                        <span className="tag">{timesLabel(v.visits)}</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Stat label="Ubicación"><Place v={v} /></Stat>
                        <Stat label="Sistema"><Multi main={v.os} all={v.oses} /></Stat>
                        <Stat label="Dispositivo"><Multi main={v.device} all={v.devices} /></Stat>
                        <Stat label="Primera visita">{fmtDateTime.format(v.firstSeen)}</Stat>
                        <Stat label="Última visita">{fmtDateTime.format(v.lastSeen)}</Stat>
                        <Stat label="Total">{v.visits}</Stat>
                    </dl>
                    <section className="space-y-2">
                        <h3 className="eyebrow">Rutas visitadas</h3>
                        <ul className="flex flex-wrap gap-2">
                            {v.paths.map((p) => (
                                <li key={p.key} className="tag break-all font-mono">{p.key} <span className="text-muted">×{p.n}</span></li>
                            ))}
                        </ul>
                    </section>
                    <section className="space-y-2">
                        <h3 className="eyebrow">Referrers</h3>
                        {v.referrers.length === 0 ? (
                            <p className="text-sm text-muted">Acceso directo, sin referrer.</p>
                        ) : (
                            <ul className="space-y-1 text-sm">
                                {v.referrers.map((r) => <li key={r} className="break-all">{r}</li>)}
                            </ul>
                        )}
                    </section>
                    <section className="space-y-3">
                        <h3 className="eyebrow">Línea de tiempo</h3>
                        {detail === "error" && <p className="text-sm text-muted">No se pudo cargar el detalle.</p>}
                        {!visits && detail !== "error" && <p className="text-sm text-muted">Cargando…</p>}
                        {visits && (
                            <ol className="space-y-0 border-l-2 border-ink pl-4">
                                {visits.map((x) => (
                                    <li key={x.id} className="relative space-y-1 pb-4 text-sm last:pb-0">
                                        <span aria-hidden="true" className="absolute -left-[1.4rem] top-1.5 size-2.5 border-2 border-ink bg-paper" />
                                        <p className="font-mono text-xs font-bold">{fmtDateTime.format(x.ts)}</p>
                                        <p className="break-all font-mono text-ink">{x.path}</p>
                                        <p className="break-all text-xs text-muted">{x.referrer ?? "Acceso directo"}</p>
                                        <p className="break-all font-mono text-xs text-muted">{x.ua || "—"}</p>
                                    </li>
                                ))}
                                {visits.length >= 500 && <li className="text-xs text-muted">Se muestran las 500 más recientes.</li>}
                            </ol>
                        )}
                    </section>
                </div>
            )}
            {v && (
                <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t-2 border-ink bg-grey p-3 sm:px-6">
                    <button type="button" className="btn" onClick={() => ref.current?.close()}>Cerrar</button>
                    <button type="button" className="btn btn-primary" onClick={() => onDelete(v)}>Borrar todas las visitas de esta IP</button>
                </div>
            )}
        </dialog>
    );
}
