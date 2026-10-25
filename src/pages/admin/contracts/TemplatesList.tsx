import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Copy, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../components/admin/ui/ConfirmDialog";
import EmptyState from "../../../components/admin/ui/EmptyState";
import { useToast } from "../../../components/admin/ui/toastContext";
import { isUnauthorized } from "../../../lib/adminApi";
import { templatesApi } from "../../../lib/contractsApi";
import { DOC_KINDS } from "../../../types/contracts";
import type { ContractTemplate } from "../../../types/contracts";

type Action = { kind: "delete" | "restore"; tpl: ContractTemplate };

export default function TemplatesList() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [items, setItems] = useState<ContractTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [action, setAction] = useState<Action | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            setItems(await templatesApi.list());
        } catch (e) {
            if (!isUnauthorized(e)) setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const groups = useMemo(
        () => DOC_KINDS.map((kind) => ({ kind, list: items.filter((x) => x.kind === kind).sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)) })).filter((g) => g.list.length),
        [items],
    );

    const fail = (e: unknown) => { if (!isUnauthorized(e)) toast(t("adminContracts.common.actionFailed"), "error"); };

    const duplicate = async (tpl: ContractTemplate) => {
        try {
            const copy = await templatesApi.create({ kind: tpl.kind, lang: tpl.lang, name: `${tpl.name} ${t("adminContracts.templates.copySuffix")}`.slice(0, 120), body: tpl.body, variables: tpl.variables });
            setItems((prev) => [...prev, copy]);
            toast(t("adminContracts.templates.duplicated"));
        } catch (e) { fail(e); }
    };

    const confirm = async () => {
        if (!action) return;
        setBusy(true);
        try {
            if (action.kind === "delete") {
                await templatesApi.remove(action.tpl.id);
                setItems((prev) => prev.filter((x) => x.id !== action.tpl.id));
                toast(t("adminContracts.common.deleted"));
            } else {
                const restored = await templatesApi.restore(action.tpl.id);
                setItems((prev) => prev.map((x) => (x.id === restored.id ? restored : x)));
                toast(t("adminContracts.templates.restored"));
            }
        } catch (e) { fail(e); } finally {
            setBusy(false);
            setAction(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-prose border-2 border-dashed border-ink p-2 text-xs text-muted">{t("adminContracts.legal")}</p>
                <Link to="/admin/contratos/plantillas/nueva" className="btn btn-primary"><Plus size={16} strokeWidth={2.5} aria-hidden /> {t("adminContracts.templates.new")}</Link>
            </div>
            {loading && <p className="text-sm text-muted" role="status">{t("adminContracts.common.loading")}</p>}
            {failed && <EmptyState title={t("adminContracts.common.loadFailed")} action={<button type="button" className="btn" onClick={() => void load()}>{t("adminContracts.common.retry")}</button>} />}
            {!loading && !failed && groups.length === 0 && <EmptyState title={t("adminContracts.templates.empty")} />}
            {groups.map((g) => (
                <section key={g.kind} className="window">
                    <div className="window-bar">
                        <span className="window-dot" aria-hidden="true" />
                        <span className="flex-1 truncate">{t(`adminContracts.kind.${g.kind}`)}</span>
                    </div>
                    <ul className="divide-y-2 divide-ink">
                        {g.list.map((x) => (
                            <li key={x.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="tag">{x.lang.toUpperCase()}</span>
                                    <span className="min-w-0 break-words font-extrabold text-ink">{x.name}</span>
                                    {x.seedKey && <span className="tag dither">{t("adminContracts.templates.default")}</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link to={`/admin/contratos/plantillas/${x.id}`} className="btn !min-h-10 !px-3 !py-1 !text-xs"><Pencil size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.edit")}</Link>
                                    <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-xs" onClick={() => void duplicate(x)}><Copy size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.templates.duplicate")}</button>
                                    {x.seedKey && <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-xs" onClick={() => setAction({ kind: "restore", tpl: x })}><RotateCcw size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.templates.restore")}</button>}
                                    <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-xs" onClick={() => setAction({ kind: "delete", tpl: x })}><Trash2 size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.delete")}</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            <ConfirmDialog
                open={action !== null}
                title={t(action?.kind === "restore" ? "adminContracts.templates.restoreTitle" : "adminContracts.templates.deleteTitle", { name: action?.tpl.name ?? "" })}
                destructive
                busy={busy}
                confirmLabel={t(action?.kind === "restore" ? "adminContracts.templates.restore" : "adminContracts.common.delete")}
                onConfirm={() => void confirm()}
                onCancel={() => setAction(null)}
            >
                {t(action?.kind === "restore" ? "adminContracts.templates.restoreBody" : "adminContracts.templates.deleteBody")}
            </ConfirmDialog>
        </div>
    );
}
