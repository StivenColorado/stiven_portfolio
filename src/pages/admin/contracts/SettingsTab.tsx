import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PhoneInput } from "../../../components/admin/ui/CountryPhone";
import Field from "../../../components/admin/ui/Field";
import { useToast } from "../../../components/admin/ui/toastContext";
import Select from "../../../components/ui/Select";
import SignaturePad from "../../../components/contracts/SignaturePad";
import SignatureView from "../../../components/contracts/SignatureView";
import { isUnauthorized, isValidation } from "../../../lib/adminApi";
import { contractsSettingsApi } from "../../../lib/contractsApi";
import { DOC_TYPES } from "../../../types/contracts";
import type { DocType, OwnerProfile, Strokes } from "../../../types/contracts";

const EMPTY: OwnerProfile = { name: "", docType: "CC", docNumber: "", email: "", phone: "", address: "", city: "" };

export default function SettingsTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [profile, setProfile] = useState<OwnerProfile>(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState<Strokes | null>(null);
    const [drawn, setDrawn] = useState<Strokes | null>(null);
    const [padKey, setPadKey] = useState(0);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        contractsSettingsApi.getProfile().then((p) => setProfile({ ...EMPTY, ...p })).catch(() => undefined);
        contractsSettingsApi.getSignature().then(setSaved).catch(() => undefined);
    }, []);

    const fail = (e: unknown) => { if (!isUnauthorized(e)) toast(t("adminContracts.common.actionFailed"), "error"); };

    const saveProfile = async () => {
        setBusy(true);
        setErrors({});
        try {
            setProfile(await contractsSettingsApi.setProfile(profile));
            toast(t("adminContracts.common.saved"));
        } catch (e) {
            if (isValidation(e)) setErrors(e.fields);
            fail(e);
        } finally {
            setBusy(false);
        }
    };

    const saveSignature = async () => {
        if (!drawn) return;
        setBusy(true);
        try {
            setSaved(await contractsSettingsApi.setSignature(drawn) ?? drawn);
            setDrawn(null);
            setPadKey((k) => k + 1);
            toast(t("adminContracts.settings.signatureSaved"));
        } catch (e) { fail(e); } finally { setBusy(false); }
    };

    const set = (key: keyof OwnerProfile) => (v: string) => setProfile((p) => ({ ...p, [key]: v }));
    const docTypeOptions = DOC_TYPES.map((v) => ({ value: v, label: t(`adminContracts.docType.${v}`) }));

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <form noValidate onSubmit={(e) => { e.preventDefault(); void saveProfile(); }} className="window window-body space-y-4 !shadow-none">
                <div>
                    <h2 className="eyebrow">{t("adminContracts.settings.profile")}</h2>
                    <p className="text-xs text-muted">{t("adminContracts.settings.profileHint")}</p>
                </div>
                <Field label={t("adminContracts.settings.name")} value={profile.name} onChange={set("name")} maxLength={120} required error={errors.name} />
                <div className="grid gap-4 sm:grid-cols-2 labels-aligned">
                    <Select label={t("adminContracts.clients.docType")} options={docTypeOptions} value={profile.docType} onChange={(v: string) => setProfile((p) => ({ ...p, docType: (v || p.docType) as DocType }))} searchable={false} />
                    <Field label={t("adminContracts.clients.docNumber")} value={profile.docNumber} onChange={set("docNumber")} maxLength={30} error={errors.docNumber} />
                    <Field label={t("adminContracts.clients.email")} type="email" value={profile.email} onChange={set("email")} maxLength={254} error={errors.email} />
                    <PhoneInput label={t("adminContracts.clients.phone")} value={profile.phone} onChange={set("phone")} error={errors.phone} />
                    <Field label={t("adminContracts.clients.address")} value={profile.address} onChange={set("address")} maxLength={200} error={errors.address} />
                    <Field label={t("adminContracts.clients.city")} value={profile.city} onChange={set("city")} maxLength={80} error={errors.city} />
                </div>
                <div className="flex justify-end"><button type="submit" className="btn btn-primary" disabled={busy}>{t("adminContracts.common.save")}</button></div>
            </form>

            <section className="window window-body space-y-4 !shadow-none">
                <div>
                    <h2 className="eyebrow">{t("adminContracts.settings.signature")}</h2>
                    <p className="text-xs text-muted">{t("adminContracts.settings.signatureHint")}</p>
                </div>
                {saved && (
                    <div className="space-y-1">
                        <p className="eyebrow">{t("adminContracts.settings.current")}</p>
                        <div className="border-2 border-ink p-2"><SignatureView strokes={saved} label={t("adminContracts.settings.current")} className="max-h-32" /></div>
                    </div>
                )}
                <SignaturePad key={padKey} onChange={setDrawn} />
                <div className="flex justify-end"><button type="button" className="btn btn-primary disabled:opacity-50" disabled={!drawn || busy} onClick={() => void saveSignature()}>{t("adminContracts.settings.saveSignature")}</button></div>
            </section>
        </div>
    );
}
