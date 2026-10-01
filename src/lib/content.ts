import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PublicContent } from "../types/content";

export type { PublicContent, PublicProject, PublicService, PublicExperience } from "../types/content";

interface Entry { data: PublicContent; fetchedAt: number }
type Listener = (data: PublicContent) => void;

const FOCUS_THROTTLE_MS = 15_000;
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<PublicContent>>();
const listeners = new Map<string, Set<Listener>>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
    if (channel || typeof BroadcastChannel === "undefined") return channel;
    try {
        channel = new BroadcastChannel("content");
        channel.onmessage = () => refetchSubscribed();
    } catch {
        channel = null;
    }
    return channel;
}

function fetchContent(lang: string): Promise<PublicContent> {
    const pending = inflight.get(lang);
    if (pending) return pending;
    const p = fetch(`/api/content?lang=${encodeURIComponent(lang)}`, { cache: "no-cache" })
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<PublicContent>;
        })
        .then((data) => {
            const prev = cache.get(lang);
            const changed = !prev || JSON.stringify(prev.data) !== JSON.stringify(data);
            const next = changed ? data : prev.data;
            cache.set(lang, { data: next, fetchedAt: Date.now() });
            if (changed) listeners.get(lang)?.forEach((fn) => fn(next));
            return next;
        })
        .finally(() => inflight.delete(lang));
    inflight.set(lang, p);
    return p;
}

function refetchSubscribed(): void {
    for (const [lang, subs] of listeners) if (subs.size) fetchContent(lang).catch(() => undefined);
}

export function invalidateContent(): void {
    cache.clear();
    refetchSubscribed();
    try {
        getChannel()?.postMessage("invalidate");
    } catch {
        channel = null;
    }
}

function revalidateIfStale(lang: string): void {
    const entry = cache.get(lang);
    if (entry && Date.now() - entry.fetchedAt < FOCUS_THROTTLE_MS) return;
    fetchContent(lang).catch(() => undefined);
}

interface State {
    lang: string;
    data: PublicContent | null;
    error: Error | null;
}

export function useContent() {
    const lang = useTranslation().i18n.resolvedLanguage ?? "es";
    const [state, setState] = useState<State>(() => ({ lang, data: cache.get(lang)?.data ?? null, error: null }));

    useEffect(() => {
        let cancelled = false;
        getChannel();
        const cached = cache.get(lang)?.data ?? null;
        if (cached) setState((s) => (s.lang === lang && s.data === cached ? s : { lang, data: cached, error: null }));

        const onData: Listener = (data) => !cancelled && setState({ lang, data, error: null });
        let subs = listeners.get(lang);
        if (!subs) listeners.set(lang, (subs = new Set()));
        subs.add(onData);

        fetchContent(lang).then(onData, (error: Error) => {
            if (!cancelled && !cache.has(lang)) setState({ lang, data: null, error });
        });

        const onVisible = () => document.visibilityState === "visible" && revalidateIfStale(lang);
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);
        return () => {
            cancelled = true;
            subs.delete(onData);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
        };
    }, [lang]);

    const refresh = useCallback(() => fetchContent(lang).then(() => undefined, () => undefined), [lang]);
    const current = state.lang === lang;
    const data = current ? state.data : null;
    const error = current ? state.error : null;
    return { data, loading: !data && !error, error, refresh };
}
