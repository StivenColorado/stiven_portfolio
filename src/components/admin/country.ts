const names = new Intl.DisplayNames(["es"], { type: "region" });

const isIso2 = (code: string) => /^[A-Za-z]{2}$/.test(code);

export function countryName(code: string): string {
    if (!isIso2(code)) return code;
    try {
        return names.of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

export function flagEmoji(code: string): string | null {
    if (!isIso2(code)) return null;
    return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
