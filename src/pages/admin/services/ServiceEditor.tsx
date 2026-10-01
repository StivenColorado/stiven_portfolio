import { useEffect, useId, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import Field from "../../../components/admin/ui/Field";
import ListEditor from "../../../components/admin/ui/ListEditor";
import EmptyState from "../../../components/admin/ui/EmptyState";
import Select from "../../../components/ui/Select";
import { projectsApi, servicesApi } from "../../../lib/adminApi";
import { SERVICE_ICON_NAMES, getServiceIcon } from "../../../lib/serviceIcons";
import type { AdminService, ServiceInput } from "../../../types/content";
import { EditorFrame, LangTabs } from "./editorKit";
import { parseId, useEditor } from "./useEditor";
import type { Lang } from "./useEditor";

interface Texts { title: string; tagline: string; bullets: string[] }
interface Form { slug: string; icon: string; proof: string[]; es: Texts; en: Texts }

const emptyTexts = (): Texts => ({ title: "", tagline: "", bullets: [] });
const EMPTY: Form = { slug: "", icon: "Code2", proof: [], es: emptyTexts(), en: emptyTexts() };

const toForm = (s: AdminService): Form => ({
    slug: s.slug,
    icon: s.icon,
    proof: s.proof,
    es: { title: s.title, tagline: s.tagline, bullets: s.bullets },
    en: { title: s.i18n?.en?.title ?? "", tagline: s.i18n?.en?.tagline ?? "", bullets: s.i18n?.en?.bullets ?? [] },
});

function toInput(f: Form, item: AdminService | null): ServiceInput {
    const en: NonNullable<NonNullable<ServiceInput["i18n"]>["en"]> = {};
    if (f.en.title.trim()) en.title = f.en.title.trim();
    if (f.en.tagline.trim()) en.tagline = f.en.tagline.trim();
    if (f.en.bullets.length) en.bullets = f.en.bullets;
    const hasEn = Object.keys(en).length > 0;
    const base: ServiceInput = {
        slug: f.slug.trim(), title: f.es.title.trim(), tagline: f.es.tagline.trim(), bullets: f.es.bullets, icon: f.icon, proof: f.proof,
    };
    if (hasEn) return { ...base, i18n: { en } };
    return item?.i18n && Object.keys(item.i18n).length ? { ...base, i18n: {} } : base;
}

const slugify = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export default function ServiceEditor() {
    const { t } = useTranslation();
    const uid = useId();
    const params = useParams();
    const id = parseId(params.id);
    const isNew = params.id === undefined;
    const [lang, setLang] = useState<Lang>("es");
    const [slugTouched, setSlugTouched] = useState(false);
    const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);

    const { item, form, patch, loading, loadError, retry, saving, err, dirty, save } = useEditor<AdminService, Form, ServiceInput>({
        api: servicesApi, id: isNew ? null : id, basePath: "/admin/servicios", empty: EMPTY, toForm, toInput,
    });

    useEffect(() => {
        let alive = true;
        projectsApi.list({ status: "all" })
            .then((list) => alive && setProjects(list.map((p) => ({ value: p.slug, label: p.title }))))
            .catch(() => undefined);
        return () => { alive = false; };
    }, []);

    const proofOptions = useMemo(() => {
        const known = new Set(projects.map((p) => p.value));
        return [...projects, ...form.proof.filter((s) => !known.has(s)).map((s) => ({ value: s, label: s }))];
    }, [projects, form.proof]);

    const setTexts = (l: Lang, changes: Partial<Texts>) => {
        const key = l === "es" ? "es" : "en";
        const next = { ...form[key], ...changes };
        patch(l === "es" ? { es: next } : { en: next });
    };

    if (!isNew && loadError === "notFound") {
        return <EmptyState title={t("adminContent.services.notFound")} action={<Link to="/admin/servicios" className="btn">{t("adminContent.services.backToList")}</Link>} />;
    }
    if (!isNew && loadError === "failed") {
        return <EmptyState title={t("adminContent.common.loadFailed")} action={<button type="button" className="btn" onClick={retry}>{t("adminContent.common.retry")}</button>} />;
    }
    if (!isNew && loading) return <p className="text-sm text-muted" role="status">{t("adminContent.common.loading")}</p>;

    const cur = lang === "es" ? form.es : form.en;
    const prefix = lang === "es" ? "" : "i18n.en.";
    const fb = (k: "title" | "tagline") => (lang === "en" ? form.es[k] : undefined);
    const shown = {
        title: form.en.title.trim() || form.es.title,
        tagline: form.en.tagline.trim() || form.es.tagline,
        bullets: form.en.bullets.length ? form.en.bullets : form.es.bullets,
    };
    const preview = lang === "en" ? shown : form.es;
    const Icon = getServiceIcon(form.icon);

    return (
        <EditorFrame
            eyebrow={t("adminContent.services.eyebrow")}
            heading={isNew ? t("adminContent.services.newTitle") : t("adminContent.services.editTitle")}
            backTo="/admin/servicios"
            backLabel={t("adminContent.services.backToList")}
            status={item?.status}
            saving={saving}
            dirty={dirty}
            onSave={(publish) => void save(publish)}
        >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <section className="window window-body space-y-4 !shadow-none">
                        <Field
                            label={t("adminContent.services.slug")}
                            value={form.slug}
                            onChange={(v) => { setSlugTouched(true); patch({ slug: v }); }}
                            maxLength={60}
                            required
                            error={err("slug")}
                            hint={t("adminContent.services.slugHint")}
                        />
                        <div className="space-y-3">
                            <LangTabs lang={lang} onChange={setLang} idPrefix={uid} />
                            <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${lang}`} className="space-y-4">
                                {lang === "en" && <p className="text-xs text-muted">{t("adminContent.common.fallbackHint")}</p>}
                                <Field
                                    label={t("adminContent.services.titleField")}
                                    value={cur.title}
                                    onChange={(v) => {
                                        setTexts(lang, { title: v });
                                        if (isNew && lang === "es" && !slugTouched) patch({ slug: slugify(v) });
                                    }}
                                    maxLength={120}
                                    required={lang === "es"}
                                    placeholder={fb("title")}
                                    error={err(`${prefix}title`)}
                                />
                                <Field
                                    label={t("adminContent.services.tagline")}
                                    value={cur.tagline}
                                    onChange={(v) => setTexts(lang, { tagline: v })}
                                    as="textarea"
                                    rows={2}
                                    maxLength={300}
                                    required={lang === "es"}
                                    placeholder={fb("tagline")}
                                    error={err(`${prefix}tagline`)}
                                />
                                <ListEditor
                                    label={t("adminContent.services.bullets")}
                                    items={cur.bullets}
                                    onChange={(bullets) => setTexts(lang, { bullets })}
                                    max={6}
                                    maxLength={160}
                                    itemLabel={t("adminContent.services.bulletItem")}
                                    hint={lang === "es" ? t("adminContent.services.bulletsHint") : t("adminContent.services.bulletsHintEn")}
                                    error={err(`${prefix}bullets`)}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="window window-body space-y-4 !shadow-none">
                        <fieldset className="space-y-2">
                            <legend className="eyebrow">{t("adminContent.services.icon")}</legend>
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
                                {SERVICE_ICON_NAMES.map((name) => {
                                    const I = getServiceIcon(name);
                                    const on = form.icon === name;
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            aria-pressed={on}
                                            aria-label={name}
                                            title={name}
                                            onClick={() => patch({ icon: name })}
                                            className={`flex h-11 items-center justify-center border-2 border-ink ${on ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-grey-2"}`}
                                        >
                                            <I size={20} strokeWidth={2.5} aria-hidden />
                                        </button>
                                    );
                                })}
                            </div>
                            {err("icon") && <p role="alert" className="text-sm font-extrabold text-ink">{err("icon")}</p>}
                        </fieldset>

                        <div className="space-y-1">
                            <Select
                                label={t("adminContent.services.proof")}
                                options={proofOptions}
                                value={form.proof}
                                onChange={(v: string[]) => patch({ proof: v })}
                                multiple
                                clearable
                                placeholder={t("adminContent.services.proofPlaceholder")}
                                searchPlaceholder={t("adminContent.services.proofSearch")}
                            />
                            <p className="text-xs text-muted">{t("adminContent.services.proofHint")}</p>
                            {err("proof") && <p role="alert" className="text-sm font-extrabold text-ink">{err("proof")}</p>}
                        </div>
                    </section>
                </div>

                <aside aria-label={t("adminContent.services.preview")} className="space-y-2 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain [&_.window-bar]:sticky [&_.window-bar]:top-0 [&_.window-bar]:z-10">
                    <p className="eyebrow">{t("adminContent.services.preview")}</p>
                    <div className="window">
                        <div className="window-bar">
                            <span className="window-dot" aria-hidden="true" />
                            <span className="window-dot" aria-hidden="true" />
                            <span className="flex-1 truncate text-center">{`${new Date().getFullYear()}-${form.slug || "slug"}.svc`}</span>
                        </div>
                        <div className="window-body flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm" aria-hidden="true">01</span>
                                <Icon size={20} strokeWidth={2.5} className="shrink-0" aria-hidden />
                                <h3 className="break-words text-xl leading-tight text-ink">{preview.title || t("adminContent.services.previewTitle")}</h3>
                            </div>
                            <p className="break-words text-muted">{preview.tagline || t("adminContent.services.previewTagline")}</p>
                            <ul className="space-y-1.5 text-sm text-ink">
                                {preview.bullets.map((b, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-ink" aria-hidden="true" />
                                        <span className="min-w-0 break-words">{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>
        </EditorFrame>
    );
}
