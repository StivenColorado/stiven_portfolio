import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import Field from "../../../components/admin/ui/Field";
import ListEditor from "../../../components/admin/ui/ListEditor";
import EmptyState from "../../../components/admin/ui/EmptyState";
import Select from "../../../components/ui/Select";
import MoneyField from "../../../components/admin/ui/MoneyField";
import { CountrySelect, PhoneInput } from "../../../components/admin/ui/CountryPhone";
import { clientsApi } from "../../../lib/contractsApi";
import { DOC_TYPES } from "../../../types/contracts";
import type { AdminClient, ClientInput, ContractLang, DocType } from "../../../types/contracts";
import { EditorFrame } from "../services/editorKit";
import { parseId, useEditor } from "../services/useEditor";

interface Extra { key: string; value: string }
interface Form {
    name: string; legalName: string; docType: DocType; docNumber: string; contactName: string; email: string;
    phone: string; address: string; city: string; country: string; lang: ContractLang; notes: string;
    monto: string; moneda: string; plazo: string; fecha_inicio: string; garantia_dias: string; hitos: string[]; alcance: string;
    extras: Extra[];
}

const KNOWN = ["monto", "moneda", "plazo", "fecha_inicio", "garantia_dias", "alcance"] as const;
const HITOS_SEP = "; ";

const EMPTY: Form = {
    name: "", legalName: "", docType: "CC", docNumber: "", contactName: "", email: "", phone: "", address: "", city: "",
    country: "Colombia", lang: "es", notes: "", monto: "", moneda: "COP", plazo: "", fecha_inicio: "", garantia_dias: "",
    hitos: [], alcance: "", extras: [],
};

const toForm = (c: AdminClient): Form => {
    const d = c.defaults ?? {};
    return {
        name: c.name, legalName: c.legalName ?? "", docType: c.docType, docNumber: c.docNumber, contactName: c.contactName,
        email: c.email, phone: c.phone, address: c.address, city: c.city, country: c.country, lang: c.lang, notes: c.notes,
        monto: d.monto ?? "", moneda: d.moneda || "COP", plazo: d.plazo ?? "", fecha_inicio: d.fecha_inicio ?? "",
        garantia_dias: d.garantia_dias ?? "", hitos: d.hitos ? d.hitos.split(HITOS_SEP).filter(Boolean) : [], alcance: d.alcance ?? "",
        extras: Object.entries(d)
            .filter(([k]) => !(KNOWN as readonly string[]).includes(k) && k !== "hitos")
            .map(([key, value]) => ({ key, value })),
    };
};

function toInput(f: Form): ClientInput {
    const defaults: Record<string, string> = {};
    for (const k of KNOWN) if (f[k].trim()) defaults[k] = f[k].trim();
    if (f.hitos.length) defaults.hitos = f.hitos.join(HITOS_SEP);
    for (const { key, value } of f.extras) if (key.trim() && value.trim()) defaults[key.trim()] = value.trim();
    return {
        name: f.name.trim(), legalName: f.legalName.trim(), docType: f.docType, docNumber: f.docNumber.trim(),
        contactName: f.contactName.trim(), email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim(),
        city: f.city.trim(), country: f.country.trim(), lang: f.lang, notes: f.notes.trim(), defaults,
    };
}

const api = { get: clientsApi.get, create: clientsApi.create, update: clientsApi.update };

export default function ClientEditor() {
    const { t } = useTranslation();
    const params = useParams();
    const id = parseId(params.clientId);
    const isNew = params.clientId === undefined;
    const back = isNew ? "/admin/contratos" : `/admin/contratos/${id}`;

    const { form, patch, loading, loadError, retry, saving, err, dirty, save } = useEditor<AdminClient, Form, ClientInput>({
        api, id: isNew ? null : id, basePath: "/admin/contratos", empty: EMPTY, toForm, toInput,
    });

    if (!isNew && loadError === "notFound") {
        return <EmptyState title={t("adminContracts.clients.notFound")} action={<Link to="/admin/contratos" className="btn">{t("adminContracts.common.backToList")}</Link>} />;
    }
    if (!isNew && loadError === "failed") {
        return <EmptyState title={t("adminContracts.common.loadFailed")} action={<button type="button" className="btn" onClick={retry}>{t("adminContracts.common.retry")}</button>} />;
    }
    if (!isNew && loading) return <p className="text-sm text-muted" role="status">{t("adminContracts.common.loading")}</p>;

    const docTypeOptions = DOC_TYPES.map((v) => ({ value: v, label: t(`adminContracts.docType.${v}`) }));
    const langOptions = (["es", "en"] as const).map((v) => ({ value: v, label: t(`adminContracts.lang.${v}`) }));
    const currencyOptions = [{ value: "COP", label: t("adminContracts.currency.COP") }, { value: "USD", label: t("adminContracts.currency.USD") }];
    const setExtra = (i: number, changes: Partial<Extra>) => patch({ extras: form.extras.map((x, j) => (j === i ? { ...x, ...changes } : x)) });
    const f = (key: keyof Form, label: string, extra: { maxLength?: number; required?: boolean; type?: "email" | "text" } = {}) => (
        <Field label={label} value={form[key] as string} onChange={(v) => patch({ [key]: v } as Partial<Form>)} error={err(key)} {...extra} />
    );

    return (
        <EditorFrame
            eyebrow={t("adminContracts.title")}
            heading={isNew ? t("adminContracts.clients.newTitle") : t("adminContracts.clients.editTitle")}
            backTo={back}
            backLabel={isNew ? t("adminContracts.common.backToList") : t("adminContracts.clients.backToFolder")}
            saving={saving}
            dirty={dirty}
            publishLabel={false}
            onSave={() => void save(false)}
        >
            <div className="space-y-6">
                <section className="window window-body space-y-4 !shadow-none">
                    <h2 className="eyebrow">{t("adminContracts.clients.sectionData")}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {f("name", t("adminContracts.clients.name"), { maxLength: 120, required: true })}
                        {f("legalName", t("adminContracts.clients.legalName"), { maxLength: 120 })}
                        <Select label={t("adminContracts.clients.docType")} options={docTypeOptions} value={form.docType} onChange={(v: string) => patch({ docType: (v || form.docType) as DocType })} searchable={false} />
                        {f("docNumber", t("adminContracts.clients.docNumber"), { maxLength: 30 })}
                        {f("contactName", t("adminContracts.clients.contactName"), { maxLength: 120 })}
                        {f("email", t("adminContracts.clients.email"), { maxLength: 254, type: "email" })}
                        <PhoneInput label={t("adminContracts.clients.phone")} value={form.phone} onChange={(v) => patch({ phone: v })} countryName={form.country} error={err("phone")} />
                        {f("address", t("adminContracts.clients.address"), { maxLength: 200 })}
                        {f("city", t("adminContracts.clients.city"), { maxLength: 80 })}
                        <CountrySelect label={t("adminContracts.clients.country")} value={form.country} onChange={(v) => patch({ country: v })} />
                        <Select label={t("adminContracts.clients.lang")} options={langOptions} value={form.lang} onChange={(v: string) => patch({ lang: (v || form.lang) as ContractLang })} searchable={false} />
                    </div>
                    <Field label={t("adminContracts.clients.notes")} as="textarea" rows={3} maxLength={2000} value={form.notes} onChange={(v) => patch({ notes: v })} error={err("notes")} />
                </section>

                <section className="window window-body space-y-4 !shadow-none">
                    <div>
                        <h2 className="eyebrow">{t("adminContracts.clients.sectionDefaults")}</h2>
                        <p className="text-xs text-muted">{t("adminContracts.clients.defaultsHint")}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select label={t("adminContracts.vars.moneda")} options={currencyOptions} value={form.moneda} onChange={(v: string) => patch({ moneda: v || form.moneda })} searchable={false} />
                        <MoneyField label={t("adminContracts.vars.monto")} currency={form.moneda || "COP"} value={form.monto} onChange={(v) => patch({ monto: v })} error={err("defaults.monto", "defaults")} />
                        <Field label={t("adminContracts.vars.plazo")} value={form.plazo} onChange={(v) => patch({ plazo: v })} maxLength={200} placeholder={t("adminContracts.vars.plazoPlaceholder")} hint={t("adminContracts.vars.plazoHint")} error={err("defaults.plazo")} />
                        <Field label={t("adminContracts.vars.fecha_inicio")} type="date" value={form.fecha_inicio} onChange={(v) => patch({ fecha_inicio: v })} error={err("defaults.fecha_inicio")} />
                        <Field label={t("adminContracts.vars.garantia_dias")} hint={t("adminContracts.vars.garantiaHint")} type="number" min={0} value={form.garantia_dias} onChange={(v) => patch({ garantia_dias: v })} error={err("defaults.garantia_dias")} />
                    </div>
                    <ListEditor label={t("adminContracts.vars.hitos")} items={form.hitos} onChange={(hitos) => patch({ hitos })} max={12} maxLength={200} itemLabel={t("adminContracts.clients.milestone")} hint={t("adminContracts.clients.hitosHint")} error={err("defaults.hitos")} />
                    <Field label={t("adminContracts.vars.alcance")} as="textarea" rows={4} maxLength={5000} value={form.alcance} onChange={(v) => patch({ alcance: v })} error={err("defaults.alcance")} />

                    <fieldset className="min-w-0 space-y-2">
                        <legend className="eyebrow">{t("adminContracts.clients.extras")}</legend>
                        {form.extras.map((x, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <input aria-label={t("adminContracts.clients.extraKey")} value={x.key} maxLength={40} placeholder={t("adminContracts.clients.extraKey")} onChange={(e) => setExtra(i, { key: e.target.value.toLowerCase() })} className="field w-2/5 min-w-0 font-mono !py-1.5" />
                                <input aria-label={t("adminContracts.clients.extraValue")} value={x.value} maxLength={5000} placeholder={t("adminContracts.clients.extraValue")} onChange={(e) => setExtra(i, { value: e.target.value })} className="field min-w-0 flex-1 !py-1.5" />
                                <button type="button" aria-label={t("adminContracts.common.remove")} onClick={() => patch({ extras: form.extras.filter((_, j) => j !== i) })} className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper">
                                    <X size={16} strokeWidth={2.5} aria-hidden />
                                </button>
                            </div>
                        ))}
                        {err("defaults") && <p role="alert" className="text-sm font-extrabold text-ink">{err("defaults")}</p>}
                        {form.extras.length < 20 && (
                            <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={() => patch({ extras: [...form.extras, { key: "", value: "" }] })}>
                                <Plus size={16} strokeWidth={2.5} aria-hidden /> {t("adminContracts.clients.addExtra")}
                            </button>
                        )}
                    </fieldset>
                </section>
            </div>
        </EditorFrame>
    );
}
