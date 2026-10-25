import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Circle, FilePlus, Lock, PenLine } from "lucide-react";
import DocStatusBadge from "./DocStatusBadge";
import type { ContractDoc, DocKind } from "../../types/contracts";

interface Stage { kind: DocKind; phase: "start" | "formalize" | "build" | "close" | "keep"; optional?: boolean; repeatable?: boolean; needsContract?: boolean }

const STAGES: Stage[] = [
    { kind: "nda", phase: "start", optional: true },
    { kind: "sow", phase: "start" },
    { kind: "services", phase: "formalize" },
    { kind: "data_processing", phase: "formalize", optional: true, needsContract: true },
    { kind: "change_order", phase: "build", optional: true, repeatable: true, needsContract: true },
    { kind: "acceptance", phase: "close", needsContract: true },
    { kind: "sla", phase: "close", optional: true },
    { kind: "retainer", phase: "keep", optional: true },
];

const DONE = new Set(["active", "expired"]);
const RANK: Record<string, number> = { active: 5, expired: 4, client_signed: 3, sent: 2, draft: 1 };

type State = "done" | "progress" | "pending" | "locked";

interface Props { docs: ContractDoc[]; clientId: number; onCreate: (kind: DocKind) => void }

export default function ProcessTimeline({ docs, clientId, onCreate }: Props) {
    const { t } = useTranslation();
    const live = docs.filter((d) => d.status !== "cancelled");
    const hasContract = live.some((d) => d.kind === "services");

    const rows = STAGES.map((s) => {
        const mine = live.filter((d) => d.kind === s.kind).sort((a, b) => (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0));
        const best = mine[0];
        const state: State = best ? (DONE.has(best.status) ? "done" : "progress") : s.needsContract && !hasContract ? "locked" : "pending";
        return { ...s, mine, best, state };
    });
    const next = rows.find((r) => !r.optional && (r.state === "pending" || r.state === "progress"));
    let lastPhase = "";

    return (
        <section className="window" aria-label={t("adminContracts.timeline.title")}>
            <div className="window-bar">
                <span className="window-dot" aria-hidden="true" />
                <span className="flex-1 truncate">proceso.timeline</span>
            </div>
            <div className="window-body space-y-5">
                <div>
                    <h2 className="font-display text-2xl tracking-tight text-ink">{t("adminContracts.timeline.title")}</h2>
                    <p className="text-sm text-muted">{t("adminContracts.timeline.hint")}</p>
                </div>

                {next ? (
                    <div className="dither flex flex-wrap items-center justify-between gap-3 border-2 border-dashed border-ink p-3" role="status">
                        <p className="text-sm font-extrabold text-ink"><ArrowRight size={14} strokeWidth={2.5} className="mr-1 inline" aria-hidden />{t("adminContracts.timeline.next", { name: t(`adminContracts.kind.${next.kind}`) })}</p>
                        {next.state === "pending"
                            ? <button type="button" className="btn btn-primary !min-h-10 !px-3 !py-1 !text-sm" onClick={() => onCreate(next.kind)}><FilePlus size={14} strokeWidth={2.5} aria-hidden /> {t("adminContracts.timeline.create")}</button>
                            : next.best && <Link to={`/admin/contratos/${clientId}/documentos/${next.best.id}`} className="btn btn-primary !min-h-10 !px-3 !py-1 !text-sm">{t("adminContracts.timeline.continue")}</Link>}
                    </div>
                ) : live.length > 0 && <p className="text-sm font-extrabold text-ink" role="status">{t("adminContracts.timeline.allDone")}</p>}

                <ol className="space-y-0">
                    {rows.map((r, i) => {
                        const heading = r.phase !== lastPhase;
                        lastPhase = r.phase;
                        const Icon = r.state === "done" ? Check : r.state === "progress" ? PenLine : r.state === "locked" ? Lock : Circle;
                        const isNext = next?.kind === r.kind;
                        return (
                            <li key={r.kind} className="min-w-0">
                                {heading && <p className={`eyebrow ${i ? "pt-4" : ""} pb-2 pl-10`}>{t(`adminContracts.timeline.phases.${r.phase}`)}</p>}
                                <div className="relative flex gap-3 pb-4 pl-0">
                                    {i < rows.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0 border-l-2 border-ink" />}
                                    <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center border-2 border-ink ${r.state === "done" ? "bg-ink text-paper" : "bg-paper text-ink"} ${r.state === "locked" ? "opacity-50" : ""} ${isNext ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}>
                                        <Icon size={15} strokeWidth={2.5} aria-hidden />
                                    </span>
                                    <div className={`min-w-0 flex-1 space-y-1 ${r.state === "locked" ? "opacity-60" : ""}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-extrabold text-ink">{t(`adminContracts.kind.${r.kind}`)}</span>
                                            <span className="tag">{r.optional ? t("adminContracts.timeline.optional") : t("adminContracts.timeline.required")}</span>
                                            {r.best && <DocStatusBadge status={r.best.status} />}
                                            {r.mine.length > 1 && <span className="font-mono text-xs text-muted">×{r.mine.length}</span>}
                                        </div>
                                        <p className="text-xs text-muted">{r.state === "locked" ? t("adminContracts.timeline.locked") : t(`adminContracts.timeline.why.${r.kind}`)}</p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {r.mine.map((d) => (
                                                <Link key={d.id} to={`/admin/contratos/${clientId}/documentos/${d.id}`} className="btn !min-h-10 !px-2.5 !py-0.5 !text-xs">{t("adminContracts.timeline.open")}{r.mine.length > 1 ? ` #${d.id}` : ""}</Link>
                                            ))}
                                            {(r.state === "pending" || (r.repeatable && r.state !== "locked")) && (
                                                <button type="button" className="btn !min-h-10 !px-2.5 !py-0.5 !text-xs" onClick={() => onCreate(r.kind)}>
                                                    <FilePlus size={12} strokeWidth={2.5} aria-hidden /> {r.mine.length ? t("adminContracts.timeline.another") : t("adminContracts.timeline.create")}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
