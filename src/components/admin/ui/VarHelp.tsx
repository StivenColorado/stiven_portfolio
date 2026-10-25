import { useTranslation } from "react-i18next";

interface Props { kind?: string; name: string; onUse?: (example: string) => void }

/** Explica para qué se pide un dato y da un ejemplo; la versión por tipo de documento tiene prioridad. */
export default function VarHelp({ kind = "", name, onUse }: Props) {
    const { t, i18n } = useTranslation();
    const root = "adminContracts.varHelp";
    const path = [`${root}.${kind}.${name}`, `${root}.${name}`].find((p) => i18n.exists(`${p}.why`));
    if (!path) return null;
    const example = t(`${path}.example`);

    return (
        <details className="text-xs">
            <summary className="cursor-pointer py-3 font-extrabold text-ink">{t(`${root}.summary`)}</summary>
            <div className="mt-2 space-y-2 border-l-2 border-ink pl-3">
                <p className="text-muted">{t(`${path}.why`)}</p>
                <p><span className="font-extrabold text-ink">{t(`${root}.example`)}</span> {example}</p>
                {onUse && <button type="button" className="btn !min-h-10 !px-2.5 !py-0.5 !text-xs" onClick={() => onUse(example)}>{t(`${root}.useExample`)}</button>}
            </div>
        </details>
    );
}
