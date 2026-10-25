import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import Field from "../../../components/admin/ui/Field";
import MoneyField from "../../../components/admin/ui/MoneyField";
import PlazoField from "../../../components/admin/ui/PlazoField";
import GarantiaField from "../../../components/admin/ui/GarantiaField";
import TableField from "../../../components/admin/ui/TableField";
import VarHelp from "../../../components/admin/ui/VarHelp";
import DuracionField from "../../../components/admin/ui/DuracionField";
import Select from "../../../components/ui/Select";
import { isTable } from "../../../lib/mdTable";
import { CLIENT_AUTO_KEYS } from "../../../lib/contractText";
import { varLabel, varType } from "../../../lib/contractVars";
import type { ContractLang, TemplateVar } from "../../../types/contracts";

const DURATIONS: Record<string, "day" | "month"> = { vigencia_dias: "day", vigencia_meses: "month", preaviso_dias: "day" };

type Group = "content" | "tables" | "money" | "timing" | "other" | "auto";
const ORDER: Group[] = ["content", "tables", "money", "timing", "other"];

interface Props {
    kind?: string;
    clientId?: number | null;
    keys: string[];
    defs: TemplateVar[];
    values: Record<string, string>;
    lang: ContractLang;
    err: (path: string) => string | undefined;
    onVar: (key: string, value: string) => void;
    onVars: (changes: Record<string, string>) => void;
}

const Heading = ({ children }: { children: string }) => <h3 className="eyebrow border-b-2 border-ink pb-1">{children}</h3>;

export default function VariablesForm({ kind, clientId, keys, defs, values, lang, err, onVar, onVars }: Props) {
    const { t } = useTranslation();
    const def = (k: string) => defs.find((d) => d.key === k);
    const typeOf = (k: string) => varType(k, defs);
    const isTableVar = (k: string) => isTable(values[k] ?? "") || isTable(def(k)?.default ?? "") || /\((tabla|table)\)/i.test(def(k)?.label ?? "");
    const groupOf = (k: string): Group => {
        if (def(k)?.auto) return "auto";
        if (isTableVar(k)) return "tables";
        if (k === "penalidad") return "content";
        if (k === "moneda" || typeOf(k) === "money") return "money";
        if (k === "plazo" || k in DURATIONS || k.startsWith("garantia") || k.startsWith("vigencia") || typeOf(k) === "date") return "timing";
        return typeOf(k) === "textarea" ? "content" : "other";
    };
    const grouped = (g: Group) => keys.filter((k) => groupOf(k) === g);
    const currencyOptions = [{ value: "COP", label: t("adminContracts.currency.COP") }, { value: "USD", label: t("adminContracts.currency.USD") }];
    const currency = values.moneda || "COP";
    const label = (k: string) => varLabel(k, defs).replace(/\s*\((tabla|table)[^)]*\)/i, "");

    const help = (k: string, usable = false) => <VarHelp kind={kind} name={k} onUse={usable ? (ex) => onVar(k, ex) : undefined} />;

    const simple = (k: string) => (
        <div key={k} className="min-w-0 space-y-2">
        <Field label={label(k)} type={typeOf(k) === "date" ? "date" : typeOf(k) === "number" ? "number" : "text"} maxLength={5000} value={values[k] ?? ""} onChange={(v) => onVar(k, v)} error={err(`variables.${k}`)} />
        {help(k, typeOf(k) === "text")}
        </div>
    );

    const timing = grouped("timing");
    const hasStart = timing.includes("fecha_inicio");
    const startField = hasStart ? simple("fecha_inicio") : undefined;

    const section = (g: Group) => {
        const list = grouped(g);
        if (g === "money" && list.length === 0) return null;
        if (list.length === 0) return null;
        return (
            <div key={g} className="space-y-4">
                <Heading>{t(`adminContracts.docs.group.${g}`)}</Heading>
                {g === "content" && list.map((k) => (
                    <div key={k} className="space-y-2">
                        <Field label={label(k)} as="textarea" rows={k === "penalidad" ? 3 : 5} maxLength={5000} value={values[k] ?? ""} onChange={(v) => onVar(k, v)} error={err(`variables.${k}`)} />
                        {help(k, true)}
                    </div>
                ))}
                {g === "tables" && list.map((k) => (
                    <div key={k} className="space-y-2">
                        <TableField label={label(k)} value={values[k] ?? ""} fallback={def(k)?.default} onChange={(v) => onVar(k, v)} error={err(`variables.${k}`)} />
                        {help(k)}
                    </div>
                ))}
                {g === "money" && (
                    <div className="grid items-start gap-5 sm:grid-cols-2 labels-aligned">
                        <Select label={t("adminContracts.vars.moneda")} options={currencyOptions} value={currency} onChange={(v: string) => onVar("moneda", v || currency)} searchable={false} />
                        {list.filter((k) => k !== "moneda").map((k) => <div key={k} className="min-w-0 space-y-2"><MoneyField label={label(k)} currency={currency} value={values[k] ?? ""} onChange={(v) => onVar(k, v)} error={err(`variables.${k}`)} />{help(k)}</div>)}
                    </div>
                )}
                {g === "timing" && (
                    <div className="space-y-5">
                        {list.includes("plazo")
                            ? <PlazoField lead={startField} label={label("plazo")} value={values.plazo ?? ""} start={values.fecha_inicio ?? ""} lang={lang} error={err("variables.plazo")} onChange={(v) => onVar("plazo", v)} />
                            : startField && <div className="grid gap-5 sm:grid-cols-2 labels-aligned">{startField}</div>}
                        {list.includes("plazo") && help("plazo")}
                        {(list.includes("garantia_dias") || list.includes("garantia")) && (
                            <GarantiaField label={varLabel("garantia_dias", defs)} text={values.garantia ?? ""} days={values.garantia_dias ?? ""} lang={lang} error={err("variables.garantia_dias")} onChange={onVars} />
                        )}
                        {(list.includes("garantia_dias") || list.includes("garantia")) && help("garantia_dias")}
                        {list.filter((k) => k in DURATIONS).map((k) => (
                            <div key={k} className="max-w-xl space-y-2">
                                <DuracionField label={label(k)} value={values[k] ?? ""} lang={lang} legacyUnit={DURATIONS[k]} error={err(`variables.${k}`)} onChange={(v) => onVar(k, v)} />
                                {help(k)}
                            </div>
                        ))}
                        <div className="grid gap-5 sm:grid-cols-2 labels-aligned">
                            {list.filter((k) => !["plazo", "fecha_inicio", "garantia", "garantia_dias"].includes(k) && !(k in DURATIONS)).map(simple)}
                        </div>
                    </div>
                )}
                {g === "other" && <div className="grid gap-5 sm:grid-cols-2 labels-aligned">{list.map(simple)}</div>}
            </div>
        );
    };

    const auto = grouped("auto");
    const clientAuto = auto.filter((k) => CLIENT_AUTO_KEYS.includes(k));
    const ownAuto = auto.filter((k) => !CLIENT_AUTO_KEYS.includes(k));
    const missingOwn = ownAuto.filter((k) => !(values[k] ?? "").trim());
    const pendingClient = clientAuto.filter((k) => !(values[k] ?? "").trim()).length;
    const list = (ks: string[], pending: string) => (
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm xl:grid-cols-2">
            {ks.map((k) => (
                <div key={k} className="min-w-0">
                    <dt className="eyebrow">{label(k)}</dt>
                    <dd className={`break-words ${values[k] ? "text-ink" : "font-extrabold text-ink underline decoration-dashed"}`}>{values[k] || pending}</dd>
                </div>
            ))}
        </dl>
    );

    return (
        <div className="space-y-8">
            {ORDER.map(section)}
            {ownAuto.length > 0 && (
                <details open={missingOwn.length > 0} className="border-2 border-dashed border-ink p-3">
                    <summary className="cursor-pointer py-2.5 text-sm font-extrabold text-ink">{t("adminContracts.docs.group.own")}{missingOwn.length > 0 ? ` · ${t("adminContracts.docs.autoMissing", { count: missingOwn.length })}` : ""}</summary>
                    <p className="mt-2 text-xs text-muted">{t("adminContracts.docs.ownHint")}</p>
                    {list(ownAuto, t("adminContracts.docs.autoEmpty"))}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Link to="/admin/contratos?tab=ajustes" className="btn !min-h-10 !px-3 !py-1 !text-xs">{t("adminContracts.docs.editMyData")}</Link>
                    </div>
                </details>
            )}
            {clientAuto.length > 0 && (
                <details className="border-2 border-dashed border-ink p-3">
                    <summary className="cursor-pointer py-2.5 text-sm font-extrabold text-ink">{t("adminContracts.docs.group.client")}{pendingClient > 0 ? ` · ${t("adminContracts.docs.clientPending", { count: pendingClient })}` : ""}</summary>
                    <p className="mt-2 text-xs text-muted">{t("adminContracts.docs.clientHint")}</p>
                    {list(clientAuto, t("adminContracts.docs.clientEmpty"))}
                    {clientId != null && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link to={`/admin/contratos/${clientId}/editar`} className="btn !min-h-10 !px-3 !py-1 !text-xs">{t("adminContracts.docs.editClientData")}</Link>
                        </div>
                    )}
                </details>
            )}
        </div>
    );
}
