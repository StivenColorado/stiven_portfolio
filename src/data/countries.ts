const DIAL: Record<string, string> = {
    CO: "57", US: "1", CA: "1", MX: "52", ES: "34", AR: "54", BO: "591", BR: "55", CL: "56", CR: "506", CU: "53", DO: "1",
    EC: "593", SV: "503", GT: "502", HN: "504", NI: "505", PA: "507", PY: "595", PE: "51", PR: "1", UY: "598", VE: "58",
    BZ: "501", GY: "592", SR: "597", HT: "509", JM: "1", TT: "1", BS: "1", GB: "44", IE: "353", FR: "33", DE: "49", IT: "39",
    PT: "351", NL: "31", BE: "32", CH: "41", AT: "43", SE: "46", NO: "47", DK: "45", FI: "358", PL: "48", CZ: "420", GR: "30",
    RO: "40", HU: "36", UA: "380", RU: "7", TR: "90", IL: "972", AE: "971", SA: "966", QA: "974", EG: "20", MA: "212",
    ZA: "27", NG: "234", KE: "254", IN: "91", PK: "92", CN: "86", JP: "81", KR: "82", SG: "65", MY: "60", TH: "66", ID: "62",
    PH: "63", VN: "84", AU: "61", NZ: "64",
};

export interface Country { iso: string; dial: string; name: string; flag: string }

const flagOf = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

const names = new Intl.DisplayNames(["es"], { type: "region" });

export const COUNTRIES: Country[] = Object.entries(DIAL)
    .map(([iso, dial]) => ({ iso, dial: `+${dial}`, name: names.of(iso) ?? iso, flag: flagOf(iso) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

export const DEFAULT_ISO = "CO";

export const countryByIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso);
export const countryByName = (name: string) => COUNTRIES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

export function splitPhone(phone: string, fallbackIso: string): { iso: string; number: string } {
    const digits = phone.trim();
    if (digits.startsWith("+")) {
        const match = COUNTRIES.filter((c) => digits.startsWith(c.dial) && /^[\s\d-]*$/.test(digits.slice(c.dial.length)))
            .sort((a, b) => b.dial.length - a.dial.length || Number(b.iso === fallbackIso) - Number(a.iso === fallbackIso))[0];
        if (match) return { iso: match.iso, number: digits.slice(match.dial.length).trim() };
    }
    return { iso: fallbackIso, number: digits };
}

export const joinPhone = (iso: string, number: string) => (number.trim() ? `${countryByIso(iso)?.dial ?? ""} ${number.trim()}` : "");
