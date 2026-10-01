import { useTranslation } from "react-i18next";
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

interface Props {
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
    max?: number;
    maxLength?: number;
    placeholder?: string;
    hint?: string;
    error?: string;
    itemLabel?: string;
}

const iconBtn = "flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink";

export default function ListEditor({ label, items, onChange, max, maxLength, placeholder, hint, error, itemLabel }: Props) {
    const { t } = useTranslation();
    const itemName = itemLabel ?? t("admin.list.item");
    const uid = useId();
    const [draft, setDraft] = useState("");
    const full = max !== undefined && items.length >= max;
    const describedBy = [hint ? `${uid}-hint` : "", error ? `${uid}-err` : ""].filter(Boolean).join(" ") || undefined;

    const move = (i: number, d: -1 | 1) => {
        const next = [...items];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        onChange(next);
    };
    const add = () => {
        const v = draft.trim();
        if (!v || full) return;
        onChange([...items, v]);
        setDraft("");
    };

    return (
        <fieldset className="min-w-0 space-y-2" aria-describedby={describedBy}>
            <legend className="eyebrow flex w-full justify-between gap-3">
                <span>{label}</span>
                {max !== undefined && <span className="font-mono text-muted">{items.length}/{max}</span>}
            </legend>
            {items.length > 0 && (
                <ul className="space-y-2">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                            <input
                                value={item}
                                maxLength={maxLength}
                                aria-label={t("admin.list.itemN", { item: itemName, n: i + 1 })}
                                onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
                                className="field min-w-0 flex-1 !py-1.5"
                            />
                            <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("admin.list.up", { item: itemName, n: i + 1 })}>
                                <ArrowUp size={16} strokeWidth={2.5} aria-hidden />
                            </button>
                            <button type="button" className={iconBtn} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t("admin.list.down", { item: itemName, n: i + 1 })}>
                                <ArrowDown size={16} strokeWidth={2.5} aria-hidden />
                            </button>
                            <button type="button" className={iconBtn} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("admin.list.remove", { item: itemName, n: i + 1 })}>
                                <X size={16} strokeWidth={2.5} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex gap-2">
                <input
                    value={draft}
                    maxLength={maxLength}
                    disabled={full}
                    placeholder={full ? t("admin.list.limit") : placeholder ?? t("admin.list.add")}
                    aria-label={t("admin.list.newItem", { item: itemName })}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    className="field min-w-0 flex-1 !py-1.5"
                />
                <button type="button" className="btn !min-h-9 !px-3 !py-1" onClick={add} disabled={full || !draft.trim()}>
                    <Plus size={16} strokeWidth={2.5} aria-hidden /> {t("admin.list.addButton")}
                </button>
            </div>
            {hint && <p id={`${uid}-hint`} className="text-xs text-muted">{hint}</p>}
            {error && <p id={`${uid}-err`} role="alert" className="text-sm font-extrabold text-ink">{error}</p>}
        </fieldset>
    );
}
