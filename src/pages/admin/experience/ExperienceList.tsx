import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import EntityList from "../../../components/admin/ui/EntityList";
import { useToast } from "../../../components/admin/ui/toastContext";
import { experienceApi, isConflict, isUnauthorized } from "../../../lib/adminApi";
import type { AdminExperience, Status } from "../../../types/content";

export default function ExperienceList() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [items, setItems] = useState<AdminExperience[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            setItems(await experienceApi.list());
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

    const setStatus = (item: AdminExperience, status: Status) =>
        run(item.id, async () => {
            const updated = await experienceApi.setStatus(item.id, status);
            setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
            toast(t(`adminContent.common.status.${status}`));
        }, "adminContent.common.actionFailed");

    const remove = (item: AdminExperience) =>
        run(item.id, async () => {
            await experienceApi.remove(item.id);
            setItems((prev) => prev.filter((x) => x.id !== item.id));
            toast(t("adminContent.common.deleted"));
        }, "adminContent.common.actionFailed");

    const reorder = (ids: number[]) =>
        run(null, async () => {
            const before = items;
            setItems(ids.map((id) => before.find((x) => x.id === id)).filter((x): x is AdminExperience => !!x));
            try { await experienceApi.reorder(ids); } catch (e) { setItems(before); throw e; }
        }, "adminContent.common.reorderFailed");

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <p className="eyebrow">{t("adminContent.experience.eyebrow")}</p>
                <h1 className="font-display text-3xl tracking-tight text-ink">{t("adminContent.experience.title")}</h1>
            </div>
            <EntityList<AdminExperience>
                items={items}
                loading={loading}
                error={error}
                noun={t("adminContent.experience.noun")}
                nounPlural={t("adminContent.experience.nounPlural")}
                newTo="/admin/experiencia/nuevo"
                editTo={(x) => `/admin/experiencia/${x.id}`}
                getTitle={(x) => x.title}
                getSubtitle={(x) => [x.date, x.company].filter(Boolean).join(" · ")}
                onSetStatus={setStatus}
                onDelete={remove}
                onReorder={reorder}
                busyId={busyId}
                onRetry={() => void load()}
            />
        </div>
    );
}
