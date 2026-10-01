import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { auditApi } from "../../../lib/adminApi";
import type { AuditEntry } from "../../../types/content";
import Select from "../../../components/ui/Select";
import EmptyState from "../../../components/admin/ui/EmptyState";
import { fmtShort } from "../../../components/admin/format";

const PAGE = 50;
const ENTITIES = ["projects", "services", "experience", "media", "visits", "auth"];

const uniq = (xs: string[]) => [...new Set(xs)].sort();

export default function ActionsTab() {
    const { t } = useTranslation();
    const actionLabel = (a: string) => t(`admin.actions.codes.${a}`, { defaultValue: a });
    const entityLabel = (e: string) => t(`admin.actions.entities.${e}`, { defaultValue: e });
    const [items, setItems] = useState<AuditEntry[]>([]);
    const [action, setAction] = useState("");
    const [entity, setEntity] = useState("");
    const [actions, setActions] = useState<string[]>([]);
    const [entities, setEntities] = useState<string[]>(ENTITIES);
    const [more, setMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const ticket = useRef(0);

    const load = useCallback(async (before?: number) => {
        const t = ++ticket.current;
        setLoading(true);
        setFailed(false);
        try {
            const page = await auditApi.list({ limit: PAGE, before, action, entity });
            if (t !== ticket.current) return;
            setItems((prev) => (before ? [...prev, ...page] : page));
            setMore(page.length === PAGE);
            setActions((prev) => uniq([...prev, ...page.map((e) => e.action), ...(action ? [action] : [])]));
            setEntities((prev) => uniq([...prev, ...page.flatMap((e) => (e.entity ? [e.entity] : []))]));
        } catch {
            if (t === ticket.current) setFailed(true);
        } finally {
            if (t === ticket.current) setLoading(false);
        }
    }, [action, entity]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="space-y-4" role="tabpanel" id="panel-acciones" aria-labelledby="tab-acciones">
            <div className="grid grid-cols-2 gap-3 md:max-w-xl">
                <Select label={t("admin.actions.action")} options={actions.map((a) => ({ value: a, label: actionLabel(a) }))} value={action} onChange={(v: string) => setAction(v)} placeholder={t("admin.common.allFem")} searchPlaceholder={t("admin.filters.search")} clearable searchable={actions.length > 6} />
                <Select label={t("admin.actions.entity")} options={entities.map((e) => ({ value: e, label: entityLabel(e) }))} value={entity} onChange={(v: string) => setEntity(v)} placeholder={t("admin.common.allFem")} searchPlaceholder={t("admin.filters.search")} clearable searchable={false} />
            </div>

            {failed ? (
                <EmptyState title={t("admin.actions.loadFailed")} action={<button type="button" className="btn" onClick={() => void load()}>{t("admin.common.retry")}</button>} />
            ) : items.length === 0 && !loading ? (
                <EmptyState title={t("admin.actions.empty")}>{t("admin.actions.emptyHint")}</EmptyState>
            ) : (
                <div className="window overflow-x-auto !shadow-none">
                    <table className="w-full min-w-[40rem] text-left text-sm">
                        <caption className="sr-only">{t("admin.actions.caption")}</caption>
                        <thead className="border-b-2 border-ink bg-grey">
                            <tr>
                                {["date", "email", "ip", "action", "entity", "detail"].map((h) => (
                                    <th key={h} scope="col" className="eyebrow px-3 py-2 !text-ink">{t(`admin.actions.columns.${h}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((e) => (
                                <tr key={e.id} className="border-b border-ink/30 align-top last:border-b-0">
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{fmtShort.format(e.ts)}</td>
                                    <td className="break-all px-3 py-2">{e.email ?? "—"}</td>
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{e.ip ?? "—"}</td>
                                    <td className="px-3 py-2"><span className="tag">{actionLabel(e.action)}</span></td>
                                    <td className="px-3 py-2">{e.entity ? `${entityLabel(e.entity)}${e.entityId != null ? ` #${e.entityId}` : ""}` : "—"}</td>
                                    <td className="min-w-48 px-3 py-2 font-normal">{e.summary ?? "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {loading && <p role="status" className="text-sm text-muted">{t("admin.common.loading")}</p>}
            {more && !loading && (
                <button type="button" className="btn w-full md:w-auto" onClick={() => load(items[items.length - 1]?.ts)}>{t("admin.common.loadMore")}</button>
            )}
        </div>
    );
}
