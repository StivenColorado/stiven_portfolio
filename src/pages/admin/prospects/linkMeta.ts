import { Facebook, Globe, Instagram, Link2, Linkedin, MapPin, MessageCircle, Music2, Twitter, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const KNOWN: { test: RegExp; label: string; icon: LucideIcon }[] = [
    { test: /(^|\.)instagram\.com$/, label: "Instagram", icon: Instagram },
    { test: /(^|\.)(facebook|fb)\.com$|^fb\.me$/, label: "Facebook", icon: Facebook },
    { test: /(^|\.)linkedin\.com$/, label: "LinkedIn", icon: Linkedin },
    { test: /(^|\.)(youtube\.com|youtu\.be)$/, label: "YouTube", icon: Youtube },
    { test: /(^|\.)(twitter|x)\.com$/, label: "X", icon: Twitter },
    { test: /(^|\.)tiktok\.com$/, label: "TikTok", icon: Music2 },
    { test: /(^|\.)(wa\.me|whatsapp\.com)$/, label: "WhatsApp", icon: MessageCircle },
    { test: /(^|\.)(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+)$/, label: "Google Maps", icon: MapPin },
];

export function linkMeta(url: string): { label: string; icon: LucideIcon; host: string } {
    let host = url;
    let path = "";
    try {
        const u = new URL(url);
        host = u.hostname.replace(/^www\./, "");
        path = u.pathname;
    } catch { /* se muestra tal cual */ }
    const maps = /(^|\.)google\.[a-z.]+$/.test(host) && path.startsWith("/maps");
    if (maps) return { label: "Google Maps", icon: MapPin, host };
    const hit = KNOWN.find((k) => k.test.test(host));
    return hit ? { label: hit.label, icon: hit.icon, host } : { label: host, icon: url === host ? Link2 : Globe, host };
}
