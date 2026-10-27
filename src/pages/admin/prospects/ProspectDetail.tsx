import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, Mail, Pencil, Phone, User } from "lucide-react";
import EmptyState from "../../../components/admin/ui/EmptyState";
import { fmtShort } from "../../../components/admin/format";
import { isUnauthorized } from "../../../lib/adminApi";
import { prospectsApi } from "../../../lib/prospectsApi";
import type { Prospect } from "../../../types/prospects";
import { parseId } from "../services/useEditor";
import ProspectLinks from "./ProspectLinks";
import ProspectStatusBadge from "./ProspectStatusBadge";
import ProspectTracking from "./ProspectTracking";
import { linkMeta } from "./linkMeta";

const row = "flex items-center gap-2 break-all";
const ico = { size: 16, strokeWidth: 2.5, "aria-hidden": true, className: "shrink-0" } as const;
const link = "underline underline-offset-4 hover:bg-ink hover:text-paper";

export default function ProspectDetail() {
    const { t } = useTranslation();
    const id = parseId(useParams().id);
    const [item, setItem] = useState<Prospect | null>(null);
    const [state, setState] = useState<"loading" | "notFound" | "failed" | "ok">("loading");

    const load = useCallback(() => {
        if (id === null) return setState("notFound");
        setState("loading");
        prospectsApi.get(id)
            .then((p) => { setItem(p); setState("ok"); })
            .catch((e: unknown) => { if (!isUnauthorized(e)) setState((e as { status?: number }).status === 404 ? "notFound" : "failed"); });
    }, [id]);

    useEffect(load, [load]);

    const back = <Link to="/admin/prospectos" className="btn">{t("adminProspects.backToList")}</Link>;
    if (state === "loading") return <p className="text-sm text-muted" role="status">{t("adminProspects.loading")}</p>;
    if (state === "notFound") return <EmptyState title={t("adminProspects.notFound")} action={back} />;
    if (state === "failed" || !item) return <EmptyState title={t("adminProspects.loadFailed")} action={<button type="button" className="btn" onClick={load}>{t("adminProspects.retry")}</button>} />;

    return (
        <div className="min-w-0 space-y-6">
            <header className="space-y-2">
                <Link to="/admin/prospectos" className="inline-flex min-h-10 items-center gap-1 text-sm underline underline-offset-4 hover:bg-ink hover:text-paper">
                    <ArrowLeft size={14} strokeWidth={2.5} aria-hidden /> {t("adminProspects.backToList")}
                </Link>
                <p className="eyebrow">{t("adminProspects.eyebrow")}</p>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="break-words font-display text-3xl tracking-tight text-ink">{item.business}</h1>
                    <ProspectStatusBadge status={item.status} />
                    <Link to={`/admin/prospectos/${item.id}/editar`} className="btn !min-h-10 !px-3 !py-1 !text-sm"><Pencil size={14} strokeWidth={2.5} aria-hidden /> {t("adminProspects.edit")}</Link>
                </div>
                <p className="text-xs text-muted">
                    {item.lastContactAt ? t("adminProspects.lastContact", { date: fmtShort.format(item.lastContactAt) }) : t("adminProspects.neverContacted")}
                    {" · "}{t("adminProspects.createdAt", { date: fmtShort.format(item.createdAt) })}
                </p>
            </header>

            <section className="window window-body space-y-4 !shadow-none">
                <h2 className="eyebrow">{t("adminProspects.sectionContact")}</h2>
                <ul className="space-y-2 text-sm">
                    {item.owner && <li className={row}><User {...ico} /> {item.owner}</li>}
                    {item.phones.map((v) => <li key={v} className={row}><Phone {...ico} /><a href={`tel:${v.replace(/[^+\d]/g, "")}`} className={link}>{v}</a></li>)}
                    {item.emails.map((v) => <li key={v} className={row}><Mail {...ico} /><a href={`mailto:${v}`} className={link}>{v}</a></li>)}
                    {item.websites.map((v) => <li key={v} className={row}><Globe {...ico} /><a href={v} target="_blank" rel="noopener noreferrer" className={link}>{linkMeta(v).host}</a></li>)}
                </ul>
                {!item.owner && !item.phones.length && !item.emails.length && !item.websites.length && <p className="text-sm text-muted">{t("adminProspects.noContact")}</p>}
            </section>

            <section className="window window-body space-y-4 !shadow-none">
                <h2 className="eyebrow">{t("adminProspects.sourceLinks")}</h2>
                {item.source && <p className="text-sm">{t("adminProspects.source")}: <strong>{item.source}</strong></p>}
                {item.sourceLinks.length > 0 ? <ProspectLinks links={item.sourceLinks} /> : <p className="text-sm text-muted">{t("adminProspects.noSourceLinks")}</p>}
            </section>

            <ProspectTracking id={item.id} initialStatus={item.status} onStatus={(status) => setItem((p) => (p ? { ...p, status } : p))} />
        </div>
    );
}
