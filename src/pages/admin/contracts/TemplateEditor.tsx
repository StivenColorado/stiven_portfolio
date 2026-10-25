import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import PdfPreview from "../../../components/contracts/PdfPreview";
import EmptyState from "../../../components/admin/ui/EmptyState";
import Field from "../../../components/admin/ui/Field";
import TableField from "../../../components/admin/ui/TableField";
import { isTable } from "../../../lib/mdTable";
import Select from "../../../components/ui/Select";
import { extractVars } from "../../../lib/contractText";
import { templatesApi } from "../../../lib/contractsApi";
import { DOC_KINDS } from "../../../types/contracts";
import type { ContractLang, ContractTemplate, DocKind, TemplateInput, TemplateVar, VarType } from "../../../types/contracts";
import { EditorFrame } from "../services/editorKit";
import { parseId, useEditor } from "../services/useEditor";

const VAR_TYPES: VarType[] = ["text", "textarea", "number", "money", "date"];
const AUTO_KEYS = ["cliente", "cliente_tipo_doc", "cliente_documento", "cliente_representante", "cliente_email", "cliente_telefono", "cliente_direccion", "cliente_ciudad", "prestador", "prestador_tipo_doc", "prestador_documento", "prestador_email", "prestador_telefono", "prestador_ciudad", "fecha", "ciudad_firma", "contrato_ref"];
const AUTO = new Set(AUTO_KEYS);
const humanize = (k: string) => k.replace(/_/g, " ");
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

    const [newKey, setNewKey] = useState("");
    const detected = useMemo(() => extractVars(form.body), [form.body]);
    const keys = useMemo(() => [...new Set([...detected, ...form.variables.map((v) => v.key).filter(Boolean)])].filter((k) => !AUTO.has(k)), [detected, form.variables]);

    const sample = useMemo(() => {
        const values: Record<string, string> = {};
        const keys = new Set([...detected, ...form.variables.map((v) => v.key)]);
        keys.forEach((k) => {
            const def = form.variables.find((v) => v.key === k);
            values[k] = def?.default || SAMPLE[def?.type ?? "text"] || `‹${def?.label || k}›`;
        });
        return values;
    }, [form.variables, detected]);

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

    const defOf = (k: string): TemplateVar => form.variables.find((v) => v.key === k) ?? { key: k, label: humanize(k), type: "text" };
    const upsert = (k: string, changes: Partial<TemplateVar>) =>
        patch({ variables: form.variables.some((v) => v.key === k) ? form.variables.map((v) => (v.key === k ? { ...v, ...changes } : v)) : [...form.variables, { ...defOf(k), ...changes }] });
    const remove = (k: string) => patch({ variables: form.variables.filter((v) => v.key !== k) });
    const cleanKey = newKey.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/^[^a-z]+/, "");
    const addVar = () => {
        if (!cleanKey || keys.includes(cleanKey) || AUTO.has(cleanKey)) return;
        const text = `{{${cleanKey}}}`;
        const el = bodyRef.current;
        const at = el?.selectionStart ?? form.body.length;
        patch({ body: form.body.slice(0, at) + text + form.body.slice(at), variables: [...form.variables, { key: cleanKey, label: humanize(cleanKey), type: "text" }] });
        setNewKey("");
    };
    const typeOptions = VAR_TYPES.map((x) => ({ value: x, label: t(`adminContracts.varType.${x}`) }));
    const kindOptions = DOC_KINDS.map((v) => ({ value: v, label: t(`adminContracts.kind.${v}`) }));
    const langOptions = (["es", "en"] as const).map((v) => ({ value: v, label: t(`adminContracts.lang.${v}`) }));
    const chip = "border-2 border-ink bg-paper px-2 py-1 min-h-10 font-mono text-xs text-ink hover:bg-ink hover:text-paper";

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
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 space-y-6">
                    <section className="window window-body space-y-4 !shadow-none">
                        <Field label={t("adminContracts.templates.name")} value={form.name} onChange={(v) => patch({ name: v })} maxLength={120} required error={err("name")} />
                        <div className="grid gap-4 sm:grid-cols-2 labels-aligned">
                            <Select label={t("adminContracts.templates.kind")} options={kindOptions} value={form.kind} onChange={(v: string) => patch({ kind: (v || form.kind) as DocKind })} searchable={false} />
                            <Select label={t("adminContracts.templates.lang")} options={langOptions} value={form.lang} onChange={(v: string) => patch({ lang: (v || form.lang) as ContractLang })} searchable={false} />
                        </div>
                        <p className="border-2 border-dashed border-ink p-2 text-xs text-muted">{t("adminContracts.legal")}</p>
                    </section>

                    <section className="window window-body space-y-3 !shadow-none">
                        <h2 className="eyebrow">{t("adminContracts.docs.body")}</h2>
                        <div className="space-y-2">
                            <p className="text-xs text-muted">{t("adminContracts.templates.insertHint")}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {keys.map((k) => <button key={k} type="button" className={chip} onClick={() => insert(k)}>{`{{${k}}}`}</button>)}
                            </div>
                            <details>
                                <summary className="cursor-pointer py-3 text-xs font-extrabold text-ink">{t("adminContracts.templates.autoVars")}</summary>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {AUTO_KEYS.map((k) => <button key={k} type="button" className={`${chip} border-dashed`} onClick={() => insert(k)}>{`{{${k}}}`}</button>)}
                                </div>
                            </details>
                        </div>
                        <textarea ref={bodyRef} aria-label={t("adminContracts.docs.body")} value={form.body} onChange={(e) => patch({ body: e.target.value })} rows={24} maxLength={100000} className="field font-mono !text-sm" aria-invalid={err("body") ? true : undefined} />
                        <p className="text-xs text-muted">{t("adminContracts.markup")}</p>
                        {err("body") && <p role="alert" className="text-sm font-extrabold">{err("body")}</p>}
                    </section>
                    <section className="window window-body space-y-4 !shadow-none">
                        <div>
                            <h2 className="eyebrow">{t("adminContracts.templates.sectionVars")}</h2>
                            <p className="text-xs text-muted">{t("adminContracts.templates.varsHint")}</p>
                        </div>
                        {keys.length === 0 && <p className="text-sm text-muted">{t("adminContracts.templates.noVars")}</p>}
                        <div className="space-y-3">
                            {keys.map((k) => {
                                const d = defOf(k);
                                const used = detected.includes(k);
                                return (
                                    <details key={k} className="border-2 border-ink">
                                        <summary className="flex min-h-10 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-3">
                                            <code className="border-2 border-ink px-2 py-0.5 font-mono text-xs text-ink">{`{{${k}}}`}</code>
                                            <span className="min-w-0 flex-1 break-words font-extrabold text-ink">{d.label || humanize(k)}</span>
                                            <span className="tag">{t(`adminContracts.varType.${d.type}`)}</span>
                                            {d.required && <span className="tag">{t("adminContracts.templates.varRequired")}</span>}
                                            {!used && <span className="tag dither">{t("adminContracts.templates.unused")}</span>}
                                        </summary>
                                        <div className="space-y-5 border-t-2 border-ink p-4">
                                            <div className="grid gap-5 sm:grid-cols-2 labels-aligned">
                                                <Field label={t("adminContracts.templates.varLabel")} value={d.label} maxLength={80} onChange={(v) => upsert(k, { label: v })} />
                                                <Select label={t("adminContracts.templates.varType")} options={typeOptions} value={d.type} onChange={(v: string) => upsert(k, { type: (v || d.type) as VarType })} searchable={false} />
                                            </div>
                                            {isTable(d.default ?? "")
                                                ? <TableField label={t("adminContracts.templates.varDefault")} editStructure value={d.default ?? ""} onChange={(v) => upsert(k, { default: v })} />
                                                : <Field label={t("adminContracts.templates.varDefault")} as={d.type === "textarea" ? "textarea" : "input"} rows={3} type={d.type === "date" ? "date" : "text"} maxLength={5000} value={d.default ?? ""} onChange={(v) => upsert(k, { default: v })} hint={t("adminContracts.templates.varDefaultHint")} />}
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                                                    <input type="checkbox" checked={!!d.required} onChange={(e) => upsert(k, { required: e.target.checked })} className="size-4 accent-[var(--ink)]" />
                                                    {t("adminContracts.templates.varRequired")}
                                                </label>
                                                {!used && <button type="button" className="btn !min-h-10 !px-3 !py-1 !text-xs" onClick={() => remove(k)}><X size={13} strokeWidth={2.5} aria-hidden /> {t("adminContracts.common.remove")}</button>}
                                            </div>
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                        {err("variables") && <p role="alert" className="text-sm font-extrabold">{err("variables")}</p>}
                        <div className="flex flex-wrap items-end gap-3 border-t-2 border-dashed border-ink pt-4">
                            <div className="min-w-48 flex-1">
                                <Field label={t("adminContracts.templates.newVar")} value={newKey} onChange={setNewKey} maxLength={40} placeholder="garantia_extra" hint={t("adminContracts.templates.newVarHint")} />
                            </div>
                            <button type="button" className="btn !min-h-11 !px-4" disabled={!cleanKey || keys.includes(cleanKey) || AUTO.has(cleanKey)} onClick={addVar}>
                                <Plus size={16} strokeWidth={2.5} aria-hidden /> {t("adminContracts.templates.addVar")}
                            </button>
                        </div>
                    </section>
                </div>
                <aside aria-label={t("adminContracts.docs.preview")} className="mx-auto w-full max-w-[340px] min-w-0 space-y-2 xl:sticky xl:top-4 xl:self-start">
                    <p className="eyebrow">{t("adminContracts.templates.previewSample")}</p>
                    <PdfPreview payload={{ title: form.name || t(`adminContracts.kind.${form.kind}`), body: form.body, variables: sample, kind: form.kind, lang: form.lang }} />
                    <p className="text-center text-xs text-muted">{t("adminContracts.pdfPreview.footer")}</p>
                </aside>
            </div>
        </EditorFrame>
    );
}
