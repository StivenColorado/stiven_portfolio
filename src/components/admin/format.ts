import i18n from "../../i18n";

const lang = () => i18n.resolvedLanguage ?? "es";

const formatter = (options: Intl.DateTimeFormatOptions) => {
    const cache = new Map<string, Intl.DateTimeFormat>();
    return {
        format(date: number | Date) {
            const l = lang();
            let f = cache.get(l);
            if (!f) cache.set(l, (f = new Intl.DateTimeFormat(l, options)));
            return f.format(date);
        },
    };
};

export const fmtDateTime = formatter({ dateStyle: "medium", timeStyle: "medium" });
export const fmtShort = formatter({ dateStyle: "short", timeStyle: "short" });

export const timesLabel = (count: number) => i18n.t("admin.visitors.times", { count });

export const osLabel = (key: string) => i18n.t(`admin.os.${key}`, { defaultValue: key });
export const deviceLabel = (key: string) => i18n.t(`admin.devices.${key}`, { defaultValue: key });
