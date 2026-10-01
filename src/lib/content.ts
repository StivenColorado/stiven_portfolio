import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PublicContent } from "../types/content";

export type { PublicContent, PublicProject, PublicService, PublicExperience } from "../types/content";

const cache = new Map<string, Promise<PublicContent>>();

function load(lang: string): Promise<PublicContent> {
    let p = cache.get(lang);
    if (!p) {
        p = fetch(`/api/content?lang=${encodeURIComponent(lang)}`).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<PublicContent>;
        });
        p.catch(() => cache.delete(lang));
        cache.set(lang, p);
    }
    return p;
}

interface State {
    lang: string;
    data: PublicContent | null;
    error: Error | null;
}

export function useContent() {
    const lang = useTranslation().i18n.resolvedLanguage ?? "es";
    const [state, setState] = useState<State>({ lang, data: null, error: null });

    useEffect(() => {
        let cancelled = false;
        load(lang).then(
            (data) => !cancelled && setState({ lang, data, error: null }),
            (error: Error) => !cancelled && setState({ lang, data: null, error }),
        );
        return () => {
            cancelled = true;
        };
    }, [lang]);

    const current = state.lang === lang;
    const data = current ? state.data : null;
    const error = current ? state.error : null;
    return { data, loading: !data && !error, error };
}
