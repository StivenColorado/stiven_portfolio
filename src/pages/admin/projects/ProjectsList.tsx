import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../../../lib/seo";
import { projectsApi, isUnauthorized } from "../../../lib/adminApi";
import EntityList from "../../../components/admin/ui/EntityList";
import { useToast } from "../../../components/admin/ui/toastContext";
import type { Status } from "../../../types/content";
import type { FullProject } from "./projectForm";

export default function ProjectsList() {
    const { t } = useTranslation();
    useDocumentMeta({ title: t("adminProjects.meta.list"), noindex: true });
    const { toast } = useToast();
    const [items, setItems] = useState<FullProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setItems(await projectsApi.list());
        } catch (err) {
            if (!isUnauthorized(err)) setError(t("adminProjects.list.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { void load(); }, [load]);

    const guarded = async (id: number, run: () => Promise<void>, failMessage = t("adminProjects.list.actionError")) => {
        setBusyId(id);
        try {
            await run();
        } catch (err) {
            if (!isUnauthorized(err)) toast(failMessage, "error");
        } finally {
            setBusyId(null);
        }
    };

    const replace = (item: FullProject) => setItems((prev) => prev.map((p) => (p.id === item.id ? item : p)));

    const onSetStatus = (item: FullProject, status: Status) =>
        guarded(item.id, async () => {
            replace(await projectsApi.setStatus(item.id, status));
            toast(t(`adminProjects.list.statusDone.${status}`));
        });

    const onDelete = (item: FullProject) =>
        guarded(item.id, async () => {
            await projectsApi.remove(item.id);
            setItems((prev) => prev.filter((p) => p.id !== item.id));
            toast(t("adminProjects.list.deleted"));
        }, t("adminProjects.list.deleteError"));

    const onReorder = async (ids: number[]) => {
        const previous = items;
        setItems(ids.map((id) => previous.find((p) => p.id === id)).filter((p): p is FullProject => !!p));
        try {
            await projectsApi.reorder(ids);
        } catch (err) {
            setItems(previous);
            if (!isUnauthorized(err)) toast(t("adminProjects.list.actionError"), "error");
        }
    };

    const toggleFeatured = (item: FullProject) =>
        guarded(item.id, async () => {
            replace(await projectsApi.setFeatured(item.id, !item.featured));
            toast(t(item.featured ? "adminProjects.list.featuredOff" : "adminProjects.list.featuredOn"));
        });

    const subtitle = (p: FullProject) =>
        [t(`adminProjects.kinds.${p.kind}`), p.year, t("adminProjects.list.tagsCount", { count: p.tags.length })].filter(Boolean).join(" · ");

    return (
        <div className="space-y-6">
            <header>
                <p className="eyebrow">{t("adminProjects.list.eyebrow")}</p>
                <h1 className="font-display text-3xl tracking-tight text-ink">{t("adminProjects.list.title")}</h1>
            </header>
            <EntityList<FullProject>
                items={items}
                loading={loading}
                error={error}
                noun={t("adminProjects.list.noun")}
                nounPlural={t("adminProjects.list.nounPlural")}
                newTo="/admin/proyectos/nuevo"
                editTo={(p) => `/admin/proyectos/${p.id}`}
                getTitle={(p) => p.title}
                getSubtitle={subtitle}
                renderExtra={(p) => (
                    <>
                        {p.featured && <span className="tag"><Star size={13} strokeWidth={2.5} aria-hidden /> {t("adminProjects.list.featured")}</span>}
                        {p.workingOn && <span className="tag !bg-ink !text-paper">{t("adminProjects.list.workingOn")}</span>}
                    </>
                )}
                extraActions={(p) => (
                    <button
                        type="button"
                        className="btn !min-h-9 !gap-1.5 !px-3 !py-1 !text-sm disabled:opacity-40"
                        aria-pressed={p.featured}
                        aria-label={t(p.featured ? "adminProjects.list.unfeatureAria" : "adminProjects.list.featureAria", { title: p.title })}
                        disabled={busyId === p.id}
                        onClick={() => void toggleFeatured(p)}
                    >
                        <Star size={14} strokeWidth={2.5} fill={p.featured ? "currentColor" : "none"} aria-hidden />
                        {t(p.featured ? "adminProjects.list.unfeature" : "adminProjects.list.feature")}
                    </button>
                )}
                onSetStatus={onSetStatus}
                onDelete={onDelete}
                onReorder={onReorder}
                busyId={busyId}
                onRetry={() => void load()}
            />
        </div>
    );
}
