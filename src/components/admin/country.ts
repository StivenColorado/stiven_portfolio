import i18n from "../../i18n";

const cache = new Map<string, Intl.DisplayNames>();

function names(): Intl.DisplayNames {
    const lang = i18n.resolvedLanguage ?? "es";
    let n = cache.get(lang);
    if (!n) cache.set(lang, (n = new Intl.DisplayNames([lang], { type: "region" })));
    return n;
}

const isIso2 = (code: string) => /^[A-Za-z]{2}$/.test(code);

export function countryName(code: string): string {
    if (!isIso2(code)) return code;
    try {
        return names().of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

export function flagEmoji(code: string): string | null {
    if (!isIso2(code)) return null;
    return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
