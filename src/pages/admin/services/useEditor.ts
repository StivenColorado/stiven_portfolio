import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../components/admin/ui/toastContext";
import { isConflict, isUnauthorized, isValidation } from "../../../lib/adminApi";
import type { Status } from "../../../types/content";

export type Lang = "es" | "en";
export type FieldErrors = Record<string, string>;

interface EntityApi<Admin, Input> {
    get: (id: number) => Promise<Admin>;
    create: (input: Input) => Promise<Admin>;
    update: (id: number, input: Input) => Promise<Admin>;
    setStatus: (id: number, status: Status) => Promise<Admin>;
}

interface Options<Admin extends { id: number; status: Status }, Form, Input> {
    api: EntityApi<Admin, Input>;
    id: number | null;
    basePath: string;
    empty: Form;
    toForm: (item: Admin) => Form;
    toInput: (form: Form, item: Admin | null) => Input;
}

export function useEditor<Admin extends { id: number; status: Status }, Form, Input>({ api, id, basePath, empty, toForm, toInput }: Options<Admin, Form, Input>) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [item, setItem] = useState<Admin | null>(null);
    const [form, setForm] = useState<Form>(empty);
    const [baseline, setBaseline] = useState(() => JSON.stringify(empty));
    const [loading, setLoading] = useState(id !== null);
    const [loadError, setLoadError] = useState<"notFound" | "failed" | null>(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (id === null) return;
        let alive = true;
        setLoading(true);
        setLoadError(null);
        api.get(id)
            .then((loaded) => {
                if (!alive) return;
                const next = toForm(loaded);
                setItem(loaded);
                setForm(next);
                setBaseline(JSON.stringify(next));
            })
            .catch((err: unknown) => {
                if (!alive || isUnauthorized(err)) return;
                setLoadError((err as { status?: number }).status === 404 ? "notFound" : "failed");
            })
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, attempt]);

    const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);

    useEffect(() => {
        if (!dirty) return;
        const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", guard);
        return () => window.removeEventListener("beforeunload", guard);
    }, [dirty]);

    const patch = useCallback((changes: Partial<Form>) => {
        setForm((f) => ({ ...f, ...changes }));
        setErrors((prev) => {
            const keys = Object.keys(changes);
            if (!Object.keys(prev).some((k) => keys.some((c) => k === c || k.startsWith(`${c}.`) || k.startsWith(`${c}[`)))) return prev;
            return Object.fromEntries(Object.entries(prev).filter(([k]) => !keys.some((c) => k === c || k.startsWith(`${c}.`) || k.startsWith(`${c}[`))));
        });
    }, []);

    const save = useCallback(async (publish: boolean) => {
        if (saving) return;
        setSaving(true);
        setErrors({});
        try {
            const input = toInput(form, item);
            let saved = id === null ? await api.create(input) : await api.update(id, input);
            const snapshot = JSON.stringify(form);
            let publishFailed = false;
            if (publish && saved.status !== "published") {
                try { saved = await api.setStatus(saved.id, "published"); } catch { publishFailed = true; }
            }
            setItem(saved);
            setBaseline(snapshot);
            toast(publishFailed ? t("adminContent.common.savedNotPublished") : publish ? t("adminContent.common.savedPublished") : t("adminContent.common.saved"), publishFailed ? "error" : "ok");
            if (id === null) navigate(`${basePath}/${saved.id}`, { replace: true });
        } catch (err) {
            if (isUnauthorized(err)) return;
            if (isValidation(err)) {
                setErrors(err.fields);
                toast(t("adminContent.common.fixFields", { count: Object.keys(err.fields).length }), "error");
            } else if (isConflict(err)) {
                const slugTaken = err.code === "slug_taken";
                if (slugTaken) setErrors({ slug: t("adminContent.common.slugTaken") });
                toast(slugTaken ? t("adminContent.common.slugTaken") : t("adminContent.common.conflict"), "error");
            } else {
                toast(t("adminContent.common.saveFailed"), "error");
            }
        } finally {
            setSaving(false);
        }
    }, [saving, form, item, id, api, toInput, toast, t, navigate, basePath]);

    const saveRef = useRef(save);
    useEffect(() => { saveRef.current = save; }, [save]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                void saveRef.current(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const err = useCallback((...keys: string[]) => {
        for (const key of keys) {
            const hit = Object.keys(errors).find((k) => k === key || k.startsWith(`${key}.`) || k.startsWith(`${key}[`));
            if (hit) return errors[hit];
        }
        return undefined;
    }, [errors]);

    return { item, form, patch, setForm, loading, loadError, retry: () => setAttempt((n) => n + 1), saving, errors, err, dirty, save };
}

export const parseId = (raw: string | undefined): number | null => {
    const n = Number(raw);
    return raw !== undefined && Number.isInteger(n) && n > 0 ? n : null;
};

export const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);
