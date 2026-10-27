import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import Field from "../../../components/admin/ui/Field";
import { useToast } from "../../../components/admin/ui/toastContext";
import { fmtShort } from "../../../components/admin/format";
import Select from "../../../components/ui/Select";
import { isUnauthorized } from "../../../lib/adminApi";
import { prospectsApi } from "../../../lib/prospectsApi";
import { PROSPECT_STATUSES } from "../../../types/prospects";
import type { ProspectNote, ProspectStatus } from "../../../types/prospects";

export default function ProspectTracking({ id, initialStatus }: { id: number; initialStatus: ProspectStatus }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [status, setStatus] = useState(initialStatus);
    const [notes, setNotes] = useState<ProspectNote[]>([]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        prospectsApi.detail(id).then((d) => alive && setNotes(d.notes)).catch(() => undefined);
        return () => { alive = false; };
    }, [id]);

    const fail = useCallback((e: unknown) => {
        if (!isUnauthorized(e)) toast(t("adminProspects.actionFailed"), "error");
    }, [toast, t]);

    const move = async (next: ProspectStatus) => {
        if (next === status) return;
        try {
            setStatus((await prospectsApi.setStatus(id, next)).status);
            toast(t("adminProspects.statusChanged"));
        } catch (e) { fail(e); }
    };

    const add = async () => {
        if (!draft.trim() || busy) return;
        setBusy(true);
        try {
            const note = await prospectsApi.addNote(id, draft.trim());
            setNotes((prev) => [note, ...prev]);
            setDraft("");
        } catch (e) { fail(e); } finally { setBusy(false); }
    };

    const drop = async (noteId: number) => {
        try {
            await prospectsApi.removeNote(id, noteId);
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch (e) { fail(e); }
    };

    const options = PROSPECT_STATUSES.map((v) => ({ value: v, label: t(`adminProspects.status.${v}`) }));

    return (
        <section className="window window-body space-y-4 !shadow-none">
            <h2 className="eyebrow">{t("adminProspects.tracking")}</h2>
            <div className="max-w-xs">
                <Select label={t("adminProspects.changeStatus")} options={options} value={status} onChange={(v: string) => void move((v || status) as ProspectStatus)} searchable={false} />
            </div>
            <div className="space-y-2">
                <Field label={t("adminProspects.noteLabel")} as="textarea" rows={3} maxLength={2000} value={draft} onChange={setDraft} placeholder={t("adminProspects.notePlaceholder")} />
                <button type="button" className="btn btn-primary !min-h-10 !px-3 !py-1" disabled={busy || !draft.trim()} onClick={() => void add()}>{t("adminProspects.addNote")}</button>
            </div>
            {notes.length === 0 ? (
                <p className="text-sm text-muted">{t("adminProspects.noNotes")}</p>
            ) : (
                <ul className="space-y-2">
                    {notes.map((n) => (
                        <li key={n.id} className="flex items-start gap-2 border-2 border-ink p-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted">{fmtShort.format(n.ts)}</p>
                                <p className="whitespace-pre-wrap break-words text-sm">{n.text}</p>
                            </div>
                            <button type="button" aria-label={t("adminProspects.deleteNote")} onClick={() => void drop(n.id)} className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper">
                                <Trash2 size={14} strokeWidth={2.5} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
