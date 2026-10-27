import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import EmptyState from "../../../components/admin/ui/EmptyState";
import Field from "../../../components/admin/ui/Field";
import ListEditor from "../../../components/admin/ui/ListEditor";
import { prospectsApi } from "../../../lib/prospectsApi";
import type { Prospect, ProspectInput } from "../../../types/prospects";
import { EditorFrame } from "../services/editorKit";
import { parseId, useEditor } from "../services/useEditor";
import ProspectTracking from "./ProspectTracking";

const EMPTY: ProspectInput = { business: "", owner: "", phones: [], emails: [], websites: [], source: "" };

const toForm = (p: Prospect): ProspectInput => ({ business: p.business, owner: p.owner, phones: p.phones, emails: p.emails, websites: p.websites, source: p.source });
const toInput = (f: ProspectInput): ProspectInput => ({ ...f, business: f.business.trim(), owner: f.owner.trim(), source: f.source.trim() });
const api = { get: prospectsApi.get, create: prospectsApi.create, update: prospectsApi.update };

export default function ProspectEditor() {
    const { t } = useTranslation();
    const params = useParams();
    const id = parseId(params.id);
    const isNew = params.id === undefined;

    const { item, form, patch, loading, loadError, retry, saving, err, dirty, save } = useEditor<Prospect, ProspectInput, ProspectInput>({
        api, id: isNew ? null : id, basePath: "/admin/prospectos", empty: EMPTY, toForm, toInput,
    });

    const back = (
        <Link to="/admin/prospectos" className="btn">{t("adminProspects.backToList")}</Link>
    );
    if (!isNew && loadError === "notFound") return <EmptyState title={t("adminProspects.notFound")} action={back} />;
    if (!isNew && loadError === "failed") return <EmptyState title={t("adminProspects.loadFailed")} action={<button type="button" className="btn" onClick={retry}>{t("adminProspects.retry")}</button>} />;
    if (!isNew && loading) return <p className="text-sm text-muted" role="status">{t("adminProspects.loading")}</p>;

    return (
        <EditorFrame
            eyebrow={t("adminProspects.eyebrow")}
            heading={isNew ? t("adminProspects.newTitle") : form.business || t("adminProspects.editTitle")}
            backTo="/admin/prospectos"
            backLabel={t("adminProspects.backToList")}
            saving={saving}
            dirty={dirty}
            publishLabel={false}
            onSave={() => void save(false)}
        >
            <div className="space-y-6">
                <section className="window window-body space-y-4 !shadow-none">
                    <h2 className="eyebrow">{t("adminProspects.sectionData")}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 labels-aligned">
                        <Field label={t("adminProspects.business")} required maxLength={120} value={form.business} onChange={(v) => patch({ business: v })} error={err("business")} />
                        <Field label={t("adminProspects.owner")} maxLength={120} value={form.owner} onChange={(v) => patch({ owner: v })} error={err("owner")} />
                        <Field label={t("adminProspects.source")} maxLength={120} placeholder={t("adminProspects.sourcePlaceholder")} value={form.source} onChange={(v) => patch({ source: v })} error={err("source")} />
                    </div>
                </section>
                <section className="window window-body space-y-4 !shadow-none">
                    <h2 className="eyebrow">{t("adminProspects.sectionContact")}</h2>
                    <div className="max-w-2xl space-y-6">
                        <ListEditor label={t("adminProspects.phones")} itemLabel={t("adminProspects.phone")} items={form.phones} onChange={(phones) => patch({ phones })} max={5} maxLength={30} placeholder="+57 300 123 4567" error={err("phones")} />
                        <ListEditor label={t("adminProspects.emails")} itemLabel={t("adminProspects.email")} items={form.emails} onChange={(emails) => patch({ emails })} max={5} maxLength={254} placeholder="correo@negocio.com" error={err("emails")} />
                        <ListEditor label={t("adminProspects.websites")} itemLabel={t("adminProspects.website")} items={form.websites} onChange={(websites) => patch({ websites })} max={5} maxLength={300} placeholder="negocio.com" error={err("websites")} />
                    </div>
                </section>
                {item && <ProspectTracking id={item.id} initialStatus={item.status} />}
            </div>
        </EditorFrame>
    );
}
