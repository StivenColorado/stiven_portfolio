import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import EntityList from "../../../components/admin/ui/EntityList";
import { useToast } from "../../../components/admin/ui/toastContext";
import { isConflict, isUnauthorized, servicesApi } from "../../../lib/adminApi";
import { getServiceIcon } from "../../../lib/serviceIcons";
import type { AdminService, Status } from "../../../types/content";

export default function ServicesList() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [items, setItems] = useState<AdminService[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            setItems(await servicesApi.list());
        } catch (e) {
            if (!isUnauthorized(e)) setError(t("adminContent.common.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { void load(); }, [load]);

    const run = async (id: number | null, action: () => Promise<void>, failKey: string) => {
        setBusyId(id);
        try {
            await action();
        } catch (e) {
            if (!isUnauthorized(e)) toast(isConflict(e) ? t("adminContent.common.conflict") : t(failKey), "error");
        } finally {
            setBusyId(null);
        }
    };

    const setStatus = (item: AdminService, status: Status) =>
        run(item.id, async () => {
            const updated = await servicesApi.setStatus(item.id, status);
            setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
            toast(t(`adminContent.common.status.${status}`));
        }, "adminContent.common.actionFailed");

    const remove = (item: AdminService) =>
        run(item.id, async () => {
            await servicesApi.remove(item.id);
            setItems((prev) => prev.filter((x) => x.id !== item.id));
            toast(t("adminContent.common.deleted"));
        }, "adminContent.common.actionFailed");

    const reorder = (ids: number[]) =>
        run(null, async () => {
            const before = items;
            setItems(ids.map((id) => before.find((x) => x.id === id)).filter((x): x is AdminService => !!x));
            try { await servicesApi.reorder(ids); } catch (e) { setItems(before); throw e; }
        }, "adminContent.common.reorderFailed");

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <p className="eyebrow">{t("adminContent.services.eyebrow")}</p>
                <h1 className="font-display text-3xl tracking-tight text-ink">{t("adminContent.services.title")}</h1>
            </div>
            <EntityList<AdminService>
                items={items}
                loading={loading}
                error={error}
                noun={t("adminContent.services.noun")}
                nounPlural={t("adminContent.services.nounPlural")}
                newTo="/admin/servicios/nuevo"
                editTo={(s) => `/admin/servicios/${s.id}`}
                getTitle={(s) => s.title}
                getSubtitle={(s) => s.tagline}
                renderExtra={(s) => {
                    const Icon = getServiceIcon(s.icon);
                    return <Icon size={16} strokeWidth={2.5} aria-hidden />;
                }}
                onSetStatus={setStatus}
                onDelete={remove}
                onReorder={reorder}
                busyId={busyId}
                onRetry={() => void load()}
            />
        </div>
    );
}
