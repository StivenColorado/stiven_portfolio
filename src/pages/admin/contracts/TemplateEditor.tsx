import { useMemo, useRef } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import DocView from "../../../components/contracts/DocView";
import EmptyState from "../../../components/admin/ui/EmptyState";
import Field from "../../../components/admin/ui/Field";
import Select from "../../../components/ui/Select";
import { extractVars } from "../../../lib/contractText";
import { previewBlocks } from "../../../lib/contractVars";
import { templatesApi } from "../../../lib/contractsApi";
import { DOC_KINDS } from "../../../types/contracts";
import type { ContractLang, ContractTemplate, DocKind, TemplateInput, TemplateVar, VarType } from "../../../types/contracts";
import { EditorFrame } from "../services/editorKit";
import { parseId, useEditor } from "../services/useEditor";

const VAR_TYPES: VarType[] = ["text", "textarea", "number", "money", "date"];
const EMPTY: TemplateInput = { kind: "services", lang: "es", name: "", body: "", variables: [] };
const api = { get: templatesApi.get, create: templatesApi.create, update: templatesApi.update };

const toForm = (x: ContractTemplate): TemplateInput => ({ kind: x.kind, lang: x.lang, name: x.name, body: x.body, variables: x.variables });
const toInput = (f: TemplateInput): TemplateInput => ({ ...f, name: f.name.trim(), variables: f.variables.map((v) => ({ ...v, key: v.key.trim(), label: v.label.trim() })) });

const SAMPLE: Record<VarType, string> = { text: "", textarea: "", number: "10", money: "1500000", date: "2026-01-15" };

export default function TemplateEditor() {
    const { t } = useTranslation();
    const params = useParams();
    const id = parseId(params.id);
    const isNew = params.id === undefined;
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const { form, patch, loading, loadError, retry, saving, err, dirty, save } = useEditor<ContractTemplate, TemplateInput, TemplateInput>({
        api, id: isNew ? null : id, basePath: "/admin/contratos/plantillas", empty: EMPTY, toForm, toInput,
    });

    const detected = useMemo(() => extractVars(form.body), [form.body]);
    const declared = new Set(form.variables.map((v) => v.key));
    const undeclared = detected.filter((k) => !declared.has(k));

    const preview = useMemo(() => {
        const values: Record<string, string> = {};
        const keys = new Set([...detected, ...form.variables.map((v) => v.key)]);
        keys.forEach((k) => {
            const def = form.variables.find((v) => v.key === k);
            values[k] = def?.default || SAMPLE[def?.type ?? "text"] || `‹${def?.label || k}›`;
        });
        return previewBlocks(form.body, values, form.variables, form.lang);
    }, [form.body, form.variables, form.lang, detected]);

    if (!isNew && loadError === "notFound") return <EmptyState title={t("adminContracts.templates.notFound")} action={<Link to="/admin/contratos?tab=plantillas" className="btn">{t("adminContracts.common.backToList")}</Link>} />;
    if (!isNew && loadError === "failed") return <EmptyState title={t("adminContracts.common.loadFailed")} action={<button type="button" className="btn" onClick={retry}>{t("adminContracts.common.retry")}</button>} />;
    if (!isNew && loading) return <p className="text-sm text-muted" role="status">{t("adminContracts.common.loading")}</p>;

    const insert = (key: string) => {
        const el = bodyRef.current;
        const text = `{{${key}}}`;
        const start = el?.selectionStart ?? form.body.length;
        const end = el?.selectionEnd ?? start;
        patch({ body: form.body.slice(0, start) + text + form.body.slice(end) });
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(start + text.length, start + text.length);
        });
    };

    const setVar = (i: number, changes: Partial<TemplateVar>) => patch({ variables: form.variables.map((v, j) => (j === i ? { ...v, ...changes } : v)) });
    const declare = (key: string) => patch({ variables: [...form.variables, { key, label: key.replace(/_/g, " "), type: "text" }] });
    const kindOptions = DOC_KINDS.map((v) => ({ value: v, label: t(`adminContracts.kind.${v}`) }));
    const langOptions = (["es", "en"] as const).map((v) => ({ value: v, label: t(`adminContracts.lang.${v}`) }));
    const chip = "border-2 border-ink bg-paper px-2 py-0.5 font-mono text-xs text-ink hover:bg-ink hover:text-paper";

    return (
        <EditorFrame
            eyebrow={t("adminContracts.tabs.templates")}
            heading={isNew ? t("adminContracts.templates.newTitle") : t("adminContracts.templates.editTitle")}
            backTo="/admin/contratos?tab=plantillas"
            backLabel={t("adminContracts.common.backToList")}
            saving={saving}
            dirty={dirty}
            publishLabel={false}
            onSave={() => void save(false)}
        >
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
                <div className="min-w-0 space-y-6">
                    <section className="window window-body space-y-4 !shadow-none">
                        <Field label={t("adminContracts.templates.name")} value={form.name} onChange={(v) => patch({ name: v })} maxLength={120} required error={err("name")} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label={t("adminContracts.templates.kind")} options={kindOptions} value={form.kind} onChange={(v: string) => patch({ kind: (v || form.kind) as DocKind })} searchable={false} />
                            <Select label={t("adminContracts.templates.lang")} options={langOptions} value={form.lang} onChange={(v: string) => patch({ lang: (v || form.lang) as ContractLang })} searchable={false} />
                        </div>
                        <p className="border-2 border-dashed border-ink p-2 text-xs text-muted">{t("adminContracts.legal")}</p>
                    </section>

                    <section className="window window-body space-y-3 !shadow-none">
                        <h2 className="eyebrow">{t("adminContracts.templates.sectionVars")}</h2>
                        {form.variables.map((v, i) => (
                            <div key={i} className="grid grid-cols-2 gap-2 border-2 border-ink p-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
                                <input aria-label={t("adminContracts.templates.varKey")} placeholder={t("adminContracts.templates.varKey")} value={v.key} maxLength={40} onChange={(e) => setVar(i, { key: e.target.value.toLowerCase() })} className="field min-w-0 font-mono !py-1.5" />
                                <input aria-label={t("adminContracts.templates.varLabel")} placeholder={t("adminContracts.templates.varLabel")} value={v.label} maxLength={80} onChange={(e) => setVar(i, { label: e.target.value })} className="field min-w-0 !py-1.5" />
                                <select aria-label={t("adminContracts.templates.varType")} value={v.type} onChange={(e) => setVar(i, { type: e.target.value as VarType })} className="field !py-1.5">
                                    {VAR_TYPES.map((x) => <option key={x} value={x}>{t(`adminContracts.varType.${x}`)}</option>)}
                                </select>
                                <button type="button" aria-label={t("adminContracts.common.remove")} onClick={() => patch({ variables: form.variables.filter((_, j) => j !== i) })} className="flex h-9 w-9 items-center justify-center justify-self-end border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper">
                                    <X size={16} strokeWidth={2.5} aria-hidden />
                                </button>
                                <input aria-label={t("adminContracts.templates.varDefault")} placeholder={t("adminContracts.templates.varDefault")} value={v.default ?? ""} maxLength={5000} onChange={(e) => setVar(i, { default: e.target.value })} className="field col-span-2 min-w-0 !py-1.5 sm:col-span-3" />
                                <label className="flex items-center gap-2 text-sm font-bold">
                                    <input type="checkbox" checked={!!v.required} onChange={(e) => setVar(i, { required: e.target.checked })} className="size-4 accent-[var(--ink)]" />
                                    {t("adminContracts.templates.varRequired")}
                                </label>
                            </div>
                        ))}
                        {err("variables") && <p role="alert" className="text-sm font-extrabold">{err("variables")}</p>}
                        <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={() => patch({ variables: [...form.variables, { key: "", label: "", type: "text" }] })}>
                            <Plus size={16} strokeWidth={2.5} aria-hidden /> {t("adminContracts.templates.addVar")}
                        </button>
                    </section>

                    <section className="window window-body space-y-3 !shadow-none">
                        <h2 className="eyebrow">{t("adminContracts.docs.body")}</h2>
                        {(form.variables.length > 0 || undeclared.length > 0) && (
                            <div className="space-y-2">
                                <p className="text-xs text-muted">{t("adminContracts.templates.insertHint")}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {form.variables.filter((v) => v.key).map((v) => <button key={v.key} type="button" className={chip} onClick={() => insert(v.key)}>{`{{${v.key}}}`}</button>)}
                                </div>
                                {undeclared.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-extrabold">{t("adminContracts.templates.undeclared")}</span>
                                        {undeclared.map((k) => <button key={k} type="button" className={`${chip} border-dashed`} onClick={() => declare(k)} title={t("adminContracts.templates.declare")}>{k} +</button>)}
                                    </div>
                                )}
                            </div>
                        )}
                        <textarea ref={bodyRef} aria-label={t("adminContracts.docs.body")} value={form.body} onChange={(e) => patch({ body: e.target.value })} rows={22} maxLength={100000} className="field font-mono !text-sm" aria-invalid={err("body") ? true : undefined} />
                        <p className="text-xs text-muted">{t("adminContracts.markup")}</p>
                        {err("body") && <p role="alert" className="text-sm font-extrabold">{err("body")}</p>}
                    </section>
                </div>
                <aside aria-label={t("adminContracts.docs.preview")} className="min-w-0 space-y-2 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
                    <p className="eyebrow">{t("adminContracts.templates.previewSample")}</p>
                    <DocView blocks={preview} title={form.name || t(`adminContracts.kind.${form.kind}`)} />
                </aside>
            </div>
        </EditorFrame>
    );
}
