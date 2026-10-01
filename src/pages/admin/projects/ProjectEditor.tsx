import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ExternalLink, Save, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../../../lib/seo";
import { projectsApi, ApiError, isUnauthorized, isValidation } from "../../../lib/adminApi";
import { TAGS } from "../../../data/tags";
import Select from "../../../components/ui/Select";
import Field from "../../../components/admin/ui/Field";
import ListEditor from "../../../components/admin/ui/ListEditor";
import ImageManager from "../../../components/admin/ui/ImageManager";
import ConfirmDialog from "../../../components/admin/ui/ConfirmDialog";
import EmptyState from "../../../components/admin/ui/EmptyState";
import StatusBadge from "../../../components/admin/ui/StatusBadge";
import { useToast } from "../../../components/admin/ui/toastContext";
import Check from "../../../components/admin/Check";
import type { Kind, Status } from "../../../types/content";
import GithubSection from "./GithubSection";
import ProjectPreview from "./ProjectPreview";
import Section from "./Section";
import { EMPTY_FORM, formFromProject, inputFromForm, serialize, slugify } from "./projectForm";
import type { FullProject, ProjectForm } from "./projectForm";

type Lang = "es" | "en";
const KINDS: Kind[] = ["demo", "oss", "case-study"];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TAG_OPTIONS = Object.entries(TAGS)
    .map(([value, tag]) => ({ value, label: tag.name, icon: tag.icon }))
    .sort((a, b) => a.label.localeCompare(b.label));

function LangTabs({ lang, onChange, label, names }: { lang: Lang; onChange: (l: Lang) => void; label: string; names: Record<Lang, string> }) {
    const order: Lang[] = ["es", "en"];
    const refs = useRef<Record<Lang, HTMLButtonElement | null>>({ es: null, en: null });
    const onKey = (e: KeyboardEvent) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === "Home" ? "es" : e.key === "End" ? "en" : order[(order.indexOf(lang) + (e.key === "ArrowRight" ? 1 : -1) + 2) % 2];
        onChange(next);
        refs.current[next]?.focus();
    };
    return (
        <div role="tablist" aria-label={label} onKeyDown={onKey} className="flex gap-2">
            {order.map((l) => (
                <button
                    key={l}
                    ref={(el) => { refs.current[l] = el; }}
                    type="button"
                    role="tab"
                    id={`lang-tab-${l}`}
                    aria-selected={lang === l}
                    aria-controls="lang-panel"
                    tabIndex={lang === l ? 0 : -1}
                    onClick={() => onChange(l)}
                    className={`btn !min-h-9 !px-4 !py-1 !text-sm ${lang === l ? "btn-primary" : ""}`}
                >
                    {names[l]}
                </button>
            ))}
        </div>
    );
}

export default function ProjectEditor() {
    const { t } = useTranslation();
    const { id: idParam } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const id = idParam ? Number(idParam) : null;
    const isNew = id === null;
    useDocumentMeta({ title: t("adminProjects.meta.editor"), noindex: true });

    const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
    const [baseline, setBaseline] = useState(() => serialize(EMPTY_FORM));
    const [item, setItem] = useState<FullProject | null>(null);
    const [loadState, setLoadState] = useState<"loading" | "ok" | "notfound" | "error">(isNew ? "ok" : "loading");
    const [slugTouched, setSlugTouched] = useState(!isNew);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [lang, setLang] = useState<Lang>("es");
    const [discardOpen, setDiscardOpen] = useState(false);

    const dirty = useMemo(() => serialize(form) !== baseline, [form, baseline]);

    const load = useCallback(async () => {
        if (id === null) return;
        setLoadState("loading");
        try {
            const p = (await projectsApi.get(id)) as FullProject;
            const f = formFromProject(p);
            setItem(p);
            setForm(f);
            setBaseline(serialize(f));
            setLoadState("ok");
        } catch (err) {
            if (isUnauthorized(err)) return;
            setLoadState(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
        }
    }, [id]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        if (!dirty) return;
        const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", onUnload);
        return () => window.removeEventListener("beforeunload", onUnload);
    }, [dirty]);

    const set = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
    };
    const setEn = <K extends keyof ProjectForm["en"]>(key: K, value: ProjectForm["en"][K]) =>
        setForm((f) => ({ ...f, en: { ...f.en, [key]: value } }));

    const onTitle = (v: string) => setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) }));

    const clientErrors = (): Record<string, string> => {
        const out: Record<string, string> = {};
        if (!form.title.trim()) out.title = t("adminProjects.errors.titleRequired");
        if (!form.slug.trim()) out.slug = t("adminProjects.errors.slugRequired");
        else if (!SLUG_RE.test(form.slug.trim())) out.slug = t("adminProjects.errors.slugFormat");
        return out;
    };

    const save = async (publish: boolean) => {
        if (saving) return;
        const local = clientErrors();
        setErrors(local);
        if (Object.keys(local).length) {
            toast(t("adminProjects.toast.invalid"), "error");
            return;
        }
        setSaving(true);
        try {
            const input = inputFromForm(form, item?.featured ?? false);
            let saved = (isNew ? await projectsApi.create(input) : await projectsApi.update(id, input)) as FullProject;
            if (publish && saved.status !== "published") saved = (await projectsApi.setStatus(saved.id, "published")) as FullProject;
            const f = formFromProject(saved);
            setItem(saved);
            setForm(f);
            setBaseline(serialize(f));
            toast(t(publish ? "adminProjects.toast.published" : isNew ? "adminProjects.toast.created" : "adminProjects.toast.saved"));
            if (isNew) navigate(`/admin/proyectos/${saved.id}`, { replace: true });
        } catch (err) {
            if (isUnauthorized(err)) return;
            if (isValidation(err)) {
                setErrors(err.fields);
                toast(t("adminProjects.toast.invalid"), "error");
            } else if (err instanceof ApiError && err.status === 409 && err.code === "slug_taken") {
                setErrors({ slug: t("adminProjects.errors.slugTaken") });
                toast(t("adminProjects.toast.slugTaken"), "error");
            } else if (err instanceof ApiError && err.status === 429) {
                toast(t("adminProjects.toast.tooMany"), "error");
            } else {
                toast(t("adminProjects.toast.failed"), "error");
            }
        } finally {
            setSaving(false);
        }
    };

    const saveRef = useRef(save);
    saveRef.current = save;
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                void saveRef.current(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const leave = () => (dirty ? setDiscardOpen(true) : navigate("/admin/proyectos"));

    const err = (key: string) => errors[key] || undefined;
    const enErr = (key: string) => errors[`i18n.en.${key}`] || errors[`i18n.${key}`] || undefined;
    const known = new Set(["title", "slug", "summary", "description", "kind", "year", "client", "links", "private", "nda", "highlights", "images", "videos", "tags", "githubRepo", "workingOn"]);
    const unmatched = Object.entries(errors).filter(([k, v]) => v && !known.has(k) && !k.startsWith("i18n.en."));
    const linkError = err("links");

    if (loadState === "loading") return <p className="text-sm text-muted" role="status">{t("adminProjects.editor.loading")}</p>;
    if (loadState !== "ok") {
        const nf = loadState === "notfound";
        return (
            <EmptyState
                title={t(nf ? "adminProjects.editor.notFound" : "adminProjects.editor.loadError")}
                action={nf
                    ? <Link to="/admin/proyectos" className="btn"><ArrowLeft size={16} strokeWidth={2.5} aria-hidden /> {t("adminProjects.editor.backToList")}</Link>
                    : <button type="button" className="btn" onClick={() => void load()}>{t("adminProjects.editor.retry")}</button>}
            >
                {nf ? t("adminProjects.editor.notFoundBody") : undefined}
            </EmptyState>
        );
    }

    const en = lang === "en";
    const status: Status | undefined = item?.status;
    const optional = ` (${t("adminProjects.content.optional")})`;
    const onSelectTags = (v: string[]) => set("tags", v);
    const toggleTagRemove = (key: string) => set("tags", form.tags.filter((x) => x !== key));

    return (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void save(false); }} noValidate>
            <header className="space-y-2">
                <button type="button" onClick={leave} className="eyebrow inline-flex items-center gap-1.5 hover:underline">
                    <ArrowLeft size={14} strokeWidth={2.5} aria-hidden /> {t("adminProjects.editor.backToList")}
                </button>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl tracking-tight text-ink">{t(isNew ? "adminProjects.editor.newTitle" : "adminProjects.editor.editTitle")}</h1>
                    {status && <StatusBadge status={status} />}
                    {dirty && <span className="tag dither" role="status">{t("adminProjects.editor.unsaved")}</span>}
                </div>
                <p className="text-xs text-muted">{t("adminProjects.editor.requiredHint")}</p>
                {unmatched.length > 0 && (
                    <p role="alert" className="text-sm font-extrabold text-ink">
                        {t("adminProjects.editor.genericErrors", { fields: unmatched.map(([k, v]) => `${k} (${v})`).join(", ") })}
                    </p>
                )}
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="space-y-6">
                    <Section id="sec-basic" title={t("adminProjects.sections.basic")}>
                        <Field
                            label={t("adminProjects.basic.slug")}
                            value={form.slug}
                            onChange={(v) => { setSlugTouched(true); set("slug", v.toLowerCase()); }}
                            required
                            maxLength={60}
                            error={err("slug")}
                            hint={slugTouched ? t("adminProjects.basic.slugHint") : t("adminProjects.basic.slugAuto")}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Select
                                    label={t("adminProjects.basic.kind")}
                                    value={form.kind}
                                    onChange={(v: string) => set("kind", v as Kind)}
                                    options={KINDS.map((k) => ({ value: k, label: t(`adminProjects.kinds.${k}`) }))}
                                    searchable={false}
                                />
                                {err("kind") && <p role="alert" className="text-sm font-extrabold text-ink">{err("kind")}</p>}
                            </div>
                            <Field label={t("adminProjects.basic.year")} type="number" min={1990} max={2100} value={form.year} onChange={(v) => set("year", v.replace(/\D/g, "").slice(0, 4))} error={err("year")} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-start gap-3">
                                <Check checked={form.private} onChange={(v) => set("private", v)} label={t("adminProjects.basic.private")} />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-extrabold text-ink">{t("adminProjects.basic.private")}</p>
                                    <p className="text-xs text-muted">{t("adminProjects.basic.privateHint")}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check checked={form.nda} onChange={(v) => set("nda", v)} label={t("adminProjects.basic.nda")} />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-extrabold text-ink">{t("adminProjects.basic.nda")}</p>
                                    <p className="text-xs text-muted">{t("adminProjects.basic.ndaHint")}</p>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section id="sec-content" title={t("adminProjects.sections.content")}>
                        <LangTabs lang={lang} onChange={setLang} label={t("adminProjects.content.tabsLabel")} names={{ es: t("adminProjects.content.es"), en: t("adminProjects.content.en") }} />
                        <div role="tabpanel" id="lang-panel" aria-labelledby={`lang-tab-${lang}`} className="space-y-4">
                            {en && <p className="text-xs text-muted">{t("adminProjects.content.enHint")}</p>}
                            <Field
                                label={t("adminProjects.content.title") + (en ? optional : "")}
                                value={en ? form.en.title : form.title}
                                onChange={en ? (v) => setEn("title", v) : onTitle}
                                placeholder={en ? form.title : undefined}
                                required={!en}
                                maxLength={120}
                                error={en ? enErr("title") : err("title")}
                            />
                            <Field
                                label={t("adminProjects.content.summary") + (en ? optional : "")}
                                as="textarea"
                                rows={3}
                                value={en ? form.en.summary : form.summary}
                                onChange={(v) => (en ? setEn("summary", v) : set("summary", v))}
                                placeholder={en ? form.summary : undefined}
                                required={!en}
                                maxLength={300}
                                error={en ? enErr("summary") : err("summary")}
                            />
                            <Field
                                label={t("adminProjects.content.description") + (en ? optional : "")}
                                as="textarea"
                                rows={8}
                                value={en ? form.en.description : form.description}
                                onChange={(v) => (en ? setEn("description", v) : set("description", v))}
                                placeholder={en ? form.description : undefined}
                                maxLength={5000}
                                error={en ? enErr("description") : err("description")}
                            />
                            <Field
                                label={t("adminProjects.content.client") + (en ? optional : "")}
                                value={en ? form.en.client : form.client}
                                onChange={(v) => (en ? setEn("client", v) : set("client", v))}
                                placeholder={en ? form.client : undefined}
                                maxLength={120}
                                error={en ? enErr("client") : err("client")}
                            />
                            <ListEditor
                                key={lang}
                                label={t("adminProjects.content.highlights") + (en ? optional : "")}
                                items={en ? form.en.highlights : form.highlights}
                                onChange={(v) => (en ? setEn("highlights", v) : set("highlights", v))}
                                max={8}
                                maxLength={300}
                                itemLabel={t("adminProjects.content.highlightsItem")}
                                placeholder={(en && form.highlights[0]) || t("adminProjects.content.highlightsPlaceholder")}
                                hint={t("adminProjects.content.highlightsHint")}
                                error={en ? enErr("highlights") : err("highlights")}
                            />
                        </div>
                    </Section>

                    <Section id="sec-links" title={t("adminProjects.sections.links")}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t("adminProjects.links.demo")} type="url" value={form.demo} onChange={(v) => set("demo", v)} placeholder="https://" />
                            <Field label={t("adminProjects.links.repo")} type="url" value={form.repo} onChange={(v) => set("repo", v)} placeholder="https://" />
                            <Field label={t("adminProjects.links.gist")} type="url" value={form.gist} onChange={(v) => set("gist", v)} placeholder="https://" />
                        </div>
                        <p className="text-xs text-muted">{t("adminProjects.links.hint")}</p>
                        {linkError && <p role="alert" className="text-sm font-extrabold text-ink">{linkError}</p>}
                    </Section>

                    <Section id="sec-tech" title={t("adminProjects.sections.tech")}>
                        <Select
                            label={t("adminProjects.tech.label")}
                            options={TAG_OPTIONS}
                            value={form.tags}
                            onChange={onSelectTags}
                            multiple
                            clearable
                            searchable
                            placeholder={t("adminProjects.tech.placeholder")}
                            searchPlaceholder={t("adminProjects.tech.search")}
                        />
                        <p className="text-xs text-muted">{t("adminProjects.tech.hint")}</p>
                        {err("tags") && <p role="alert" className="text-sm font-extrabold text-ink">{err("tags")}</p>}
                        {form.tags.length === 0 ? (
                            <p className="text-sm text-muted">{t("adminProjects.tech.none")}</p>
                        ) : (
                            <ul className="flex flex-wrap gap-1.5" aria-label={t("adminProjects.tech.selected")}>
                                {form.tags.map((key) => {
                                    const Icon = TAGS[key]?.icon;
                                    const name = TAGS[key]?.name ?? key;
                                    return (
                                        <li key={key} className="tag !pr-1">
                                            {Icon && <Icon className="h-3.5 w-3.5 brightness-0 dark:invert" aria-hidden="true" />}
                                            {name}
                                            <button type="button" onClick={() => toggleTagRemove(key)} aria-label={t("adminProjects.tech.remove", { name })} className="ml-1 flex size-5 items-center justify-center hover:bg-ink hover:text-paper">
                                                <X size={12} strokeWidth={3} aria-hidden />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Section>

                    <Section id="sec-media" title={t("adminProjects.sections.media")}>
                        <ImageManager label={t("adminProjects.media.images")} kind="image" sensitive={form.nda || form.private} value={form.images} onChange={(v) => set("images", v)} max={12} hint={t("adminProjects.media.imagesHint")} error={err("images")} />
                        <ImageManager label={t("adminProjects.media.videos")} kind="video" value={form.videos} onChange={(v) => set("videos", v)} max={3} hint={t("adminProjects.media.videosHint")} error={err("videos")} />
                    </Section>

                    <Section id="sec-github" title={t("adminProjects.sections.github")}>
                        <GithubSection repo={form.githubRepo} workingOn={form.workingOn} error={err("githubRepo")} onRepo={(v) => set("githubRepo", v)} onWorkingOn={(v) => set("workingOn", v)} />
                    </Section>
                </div>

                <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain [&_.window-bar]:sticky [&_.window-bar]:top-0 [&_.window-bar]:z-10">
                    <Section id="sec-preview" title={t("adminProjects.sections.preview")}>
                        <p className="text-xs text-muted">{t("adminProjects.preview.hint")}</p>
                        <ProjectPreview form={form} lang={lang} />
                    </Section>
                </aside>
            </div>

            <div role="group" aria-label={t("adminProjects.actions.barLabel")} className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-t-[length:var(--line)] border-ink bg-paper px-4 py-3 sm:mx-0 sm:border-[length:var(--line)]">
                <button type="submit" className="btn btn-primary" disabled={saving} title={t("adminProjects.actions.shortcut")}>
                    <Save size={16} strokeWidth={2.5} aria-hidden /> {t(saving ? "adminProjects.actions.saving" : "adminProjects.actions.save")}
                </button>
                {status !== "published" && (
                    <button type="button" className="btn" disabled={saving} onClick={() => void save(true)}>
                        <Send size={16} strokeWidth={2.5} aria-hidden /> {t("adminProjects.actions.saveAndPublish")}
                    </button>
                )}
                <button type="button" className="btn" disabled={saving} onClick={leave}>{t("adminProjects.actions.cancel")}</button>
                {status === "published" && (
                    <a href="/projects" target="_blank" rel="noopener noreferrer" className="btn sm:ml-auto">
                        <ExternalLink size={16} strokeWidth={2.5} aria-hidden /> {t("adminProjects.actions.viewOnSite")}
                    </a>
                )}
            </div>

            <ConfirmDialog
                open={discardOpen}
                title={t("adminProjects.discard.title")}
                destructive
                confirmLabel={t("adminProjects.discard.confirm")}
                cancelLabel={t("adminProjects.discard.keep")}
                onConfirm={() => { setDiscardOpen(false); navigate("/admin/proyectos"); }}
                onCancel={() => setDiscardOpen(false)}
            >
                {t("adminProjects.discard.body")}
            </ConfirmDialog>
        </form>
    );
}
