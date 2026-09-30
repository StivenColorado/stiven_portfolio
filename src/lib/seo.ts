import { useEffect } from "react";

interface MetaOptions {
    title: string;
    description?: string;
    noindex?: boolean;
}

function setMeta(name: string, content: string) {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
    }
    el.content = content;
}

export function useDocumentMeta({ title, description, noindex }: MetaOptions) {
    useEffect(() => {
        document.title = title;
        if (description) setMeta("description", description);
        setMeta("robots", noindex ? "noindex,nofollow" : "index,follow");
    }, [title, description, noindex]);
}
