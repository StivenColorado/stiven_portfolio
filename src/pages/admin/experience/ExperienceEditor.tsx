import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import Field from "../../../components/admin/ui/Field";
import ListEditor from "../../../components/admin/ui/ListEditor";
import EmptyState from "../../../components/admin/ui/EmptyState";
import { experienceApi } from "../../../lib/adminApi";
import type { AdminExperience, ExperienceInput } from "../../../types/content";
import { EditorFrame, LangTabs } from "../services/editorKit";
import { orNull, parseId, useEditor } from "../services/useEditor";
import type { Lang } from "../services/useEditor";

interface Texts { date: string; title: string; role: string; summary: string; description: string }
interface Form { company: string; stack: string[]; link: string; contact: string; es: Texts; en: Texts }

const emptyTexts = (): Texts => ({ date: "", title: "", role: "", summary: "", description: "" });
const EMPTY: Form = { company: "", stack: [], link: "", contact: "", es: emptyTexts(), en: emptyTexts() };
const TEXT_KEYS = ["date", "title", "role", "summary", "description"] as const;

const toForm = (x: AdminExperience): Form => ({
    company: x.company ?? "",
    stack: x.stack,
    link: x.link ?? "",
    contact: x.contact ?? "",
    es: { date: x.date, title: x.title, role: x.role ?? "", summary: x.summary ?? "", description: x.description },
    en: {
        date: x.i18n?.en?.date ?? "", title: x.i18n?.en?.title ?? "", role: x.i18n?.en?.role ?? "",
        summary: x.i18n?.en?.summary ?? "", description: x.i18n?.en?.description ?? "",
    },
});

function toInput(f: Form, item: AdminExperience | null): ExperienceInput {
    const en: NonNullable<NonNullable<ExperienceInput["i18n"]>["en"]> = {};
    for (const k of TEXT_KEYS) if (f.en[k].trim()) en[k] = f.en[k].trim();
    const base: ExperienceInput = {
        date: f.es.date.trim(), title: f.es.title.trim(), role: orNull(f.es.role), company: orNull(f.company),
        summary: orNull(f.es.summary), stack: f.stack, description: f.es.description.trim(), link: orNull(f.link), contact: orNull(f.contact),
    };
    if (Object.keys(en).length) return { ...base, i18n: { en } };
    return item?.i18n && Object.keys(item.i18n).length ? { ...base, i18n: {} } : base;
}

export default function ExperienceEditor() {
    const { t } = useTranslation();
    const uid = useId();
    const params = useParams();
    const id = parseId(params.id);
    const isNew = params.id === undefined;
    const [lang, setLang] = useState<Lang>("es");

    const { item, form, patch, loading, loadError, retry, saving, err, dirty, save } = useEditor<AdminExperience, Form, ExperienceInput>({
        api: experienceApi, id: isNew ? null : id, basePath: "/admin/experiencia", empty: EMPTY, toForm, toInput,
    });

    if (!isNew && loadError === "notFound") {
        return <EmptyState title={t("adminContent.experience.notFound")} action={<Link to="/admin/experiencia" className="btn">{t("adminContent.experience.backToList")}</Link>} />;
    }
    if (!isNew && loadError === "failed") {
        return <EmptyState title={t("adminContent.common.loadFailed")} action={<button type="button" className="btn" onClick={retry}>{t("adminContent.common.retry")}</button>} />;
    }
    if (!isNew && loading) return <p className="text-sm text-muted" role="status">{t("adminContent.common.loading")}</p>;

    const cur = lang === "es" ? form.es : form.en;
    const prefix = lang === "es" ? "" : "i18n.en.";
    const set = (changes: Partial<Texts>) => patch(lang === "es" ? { es: { ...form.es, ...changes } } : { en: { ...form.en, ...changes } });
    const ph = (k: keyof Texts) => (lang === "en" ? form.es[k] : undefined);
    const es = lang === "es";

    return (
        <EditorFrame
            eyebrow={t("adminContent.experience.eyebrow")}
            heading={isNew ? t("adminContent.experience.newTitle") : t("adminContent.experience.editTitle")}
            backTo="/admin/experiencia"
            backLabel={t("adminContent.experience.backToList")}
            status={item?.status}
            saving={saving}
            dirty={dirty}
            onSave={(publish) => void save(publish)}
        >
            <div className="grid gap-6 lg:grid-cols-2">
                <section className="window window-body space-y-4 !shadow-none">
                    <LangTabs lang={lang} onChange={setLang} idPrefix={uid} />
                    <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${lang}`} className="space-y-4">
                        {!es && <p className="text-xs text-muted">{t("adminContent.common.fallbackHint")}</p>}
                        <Field label={t("adminContent.experience.date")} value={cur.date} onChange={(v) => set({ date: v })} maxLength={60}
                            required={es} placeholder={ph("date") ?? t("adminContent.experience.datePlaceholder")} error={err(`${prefix}date`)} />
                        <Field label={t("adminContent.experience.titleField")} value={cur.title} onChange={(v) => set({ title: v })} maxLength={120}
                            required={es} placeholder={ph("title")} error={err(`${prefix}title`)} />
                        <Field label={t("adminContent.experience.role")} value={cur.role} onChange={(v) => set({ role: v })} maxLength={120}
                            placeholder={ph("role")} error={err(`${prefix}role`)} />
                        <Field label={t("adminContent.experience.summary")} value={cur.summary} onChange={(v) => set({ summary: v })} as="textarea" rows={3}
                            maxLength={300} placeholder={ph("summary")} error={err(`${prefix}summary`)} />
                        <Field label={t("adminContent.experience.description")} value={cur.description} onChange={(v) => set({ description: v })} as="textarea"
                            rows={8} maxLength={5000} required={es} placeholder={ph("description")} error={err(`${prefix}description`)} />
                    </div>
                </section>

                <section className="window window-body h-fit space-y-4 !shadow-none">
                    <p className="eyebrow">{t("adminContent.experience.shared")}</p>
                    <Field label={t("adminContent.experience.company")} value={form.company} onChange={(v) => patch({ company: v })} maxLength={120} error={err("company")} />
                    <ListEditor
                        label={t("adminContent.experience.stack")}
                        items={form.stack}
                        onChange={(stack) => patch({ stack })}
                        max={12}
                        maxLength={40}
                        itemLabel={t("adminContent.experience.stackItem")}
                        hint={t("adminContent.experience.stackHint")}
                        error={err("stack")}
                    />
                    <Field label={t("adminContent.experience.link")} value={form.link} onChange={(v) => patch({ link: v })} type="url" maxLength={500}
                        placeholder="https://" hint={t("adminContent.experience.linkHint")} error={err("link")} />
                    <Field label={t("adminContent.experience.contact")} value={form.contact} onChange={(v) => patch({ contact: v })} maxLength={60}
                        hint={t("adminContent.experience.contactHint")} error={err("contact")} />
                </section>
            </div>
        </EditorFrame>
    );
}
