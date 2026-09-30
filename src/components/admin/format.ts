export const fmtDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });

export const timesLabel = (n: number) => (n === 1 ? "Ingresó 1 vez" : `Ingresó ${n} veces`);
export const fmtShort = new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" });
