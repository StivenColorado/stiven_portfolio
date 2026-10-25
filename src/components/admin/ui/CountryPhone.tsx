import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Select from "../../ui/Select";
import Field from "./Field";
import { COUNTRIES, DEFAULT_ISO, countryByName, joinPhone, splitPhone } from "../../../data/countries";

const options = COUNTRIES.map((c) => ({ value: c.iso, label: `${c.flag} ${c.name}` }));
const dialOptions = COUNTRIES.map((c) => ({ value: c.iso, label: `${c.flag} ${c.dial} ${c.name}` }));

export function CountrySelect({ label, value, onChange }: { label: string; value: string; onChange: (name: string) => void }) {
    const known = countryByName(value);
    return (
        <Select
            label={label}
            options={known || !value ? options : [{ value: "__custom", label: value }, ...options]}
            value={known?.iso ?? (value ? "__custom" : "")}
            onChange={(iso: string) => { const c = COUNTRIES.find((x) => x.iso === iso); if (c) onChange(c.name); }}
            placeholder="—"
        />
    );
}

interface PhoneProps { label: string; value: string; onChange: (v: string) => void; countryName?: string; error?: string }

/** El indicativo acompaña al país elegido arriba mientras el número esté vacío o no lo haya cambiado el usuario. */
export function PhoneInput({ label, value, onChange, countryName = "", error }: PhoneProps) {
    const { t } = useTranslation();
    const fallback = countryByName(countryName)?.iso ?? DEFAULT_ISO;
    const [iso, setIso] = useState(() => splitPhone(value, fallback).iso);
    const number = splitPhone(value, iso).number;
    const first = useRef(true);

    useEffect(() => {
        if (first.current) { first.current = false; return; }
        setIso(fallback);
        if (number) onChange(joinPhone(fallback, number));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fallback]);

    return (
        <div className="grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] items-start gap-2">
            <Select label={t("adminContracts.common.dialCode")} options={dialOptions} value={iso} onChange={(v: string) => { setIso(v || iso); if (number) onChange(joinPhone(v || iso, number)); }} />
            <Field label={label} type="text" value={number} maxLength={20} autoComplete="tel-national" placeholder="300 123 4567" error={error} onChange={(v) => onChange(joinPhone(iso, v.replace(/[^\d\s-]/g, "")))} />
        </div>
    );
}
