import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type Option = { value: string; label: string; group?: string; icon?: ComponentType<{ className?: string }> };

type Props = {
    label: string;
    options: Option[];
    value: string | string[];
    onChange: ((v: string) => void) | ((v: string[]) => void);
    multiple?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
    searchable?: boolean;
    clearable?: boolean;
    className?: string;
    id?: string;
};

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Select con buscador (combobox + listbox WAI-ARIA); el panel es absolute dentro del contenedor relativo. */
export default function Select({
    label, options, value, onChange, multiple = false, placeholder = "Todos", searchPlaceholder = "Buscar…",
    searchable, clearable, className = "", id,
}: Props) {
    const emit = onChange as (v: string | string[]) => void;
    const uid = useId();
    const baseId = id ?? uid;
    const listId = `${baseId}-list`;
    const showSearch = searchable ?? options.length > 6;
    const selected = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [up, setUp] = useState(false);

    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const q = fold(query.trim());
        return q ? options.filter((o) => fold(o.label).includes(q)) : options;
    }, [options, query]);

    const rows = useMemo(() => {
        const out: ({ kind: "group"; name: string } | { kind: "opt"; opt: Option; index: number })[] = [];
        let last: string | undefined;
        filtered.forEach((opt, index) => {
            if (opt.group && opt.group !== last) out.push({ kind: "group", name: opt.group });
            last = opt.group;
            out.push({ kind: "opt", opt, index });
        });
        return out;
    }, [filtered]);

    const close = useCallback((refocus: boolean) => {
        setOpen(false);
        setQuery("");
        if (refocus) triggerRef.current?.focus();
    }, []);

    const openPanel = () => {
        const first = options.findIndex((o) => selected.includes(o.value));
        setActive(Math.max(first, 0));
        setOpen(true);
    };

    useLayoutEffect(() => {
        if (!open || !rootRef.current) return;
        const r = rootRef.current.getBoundingClientRect();
        const need = Math.min(window.innerHeight * 0.6, 420) + 16;
        setUp(window.innerHeight - r.bottom < need && r.top > window.innerHeight - r.bottom);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        (showSearch ? inputRef.current : panelRef.current)?.focus({ preventScroll: true });
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open, showSearch, close]);

    useEffect(() => {
        if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    const pick = (opt: Option) => {
        if (multiple) {
            emit(selected.includes(opt.value) ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]);
        } else {
            emit(opt.value === value ? "" : opt.value);
            close(true);
        }
    };

    const clear = () => emit(multiple ? [] : "");

    const onKeyDown = (e: KeyboardEvent) => {
        const last = filtered.length - 1;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setActive((a) => Math.min(a + 1, last)); break;
            case "ArrowUp": e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); break;
            case "Home": e.preventDefault(); setActive(0); break;
            case "End": e.preventDefault(); setActive(Math.max(last, 0)); break;
            case "Enter": e.preventDefault(); if (filtered[active]) pick(filtered[active]); break;
            case " ":
                if (!showSearch || !query) { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
                break;
            case "Escape": e.preventDefault(); e.stopPropagation(); close(true); break;
            case "Tab": close(false); break;
        }
    };

    const onTriggerKey = (e: KeyboardEvent) => {
        if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); openPanel(); }
    };

    const chosen = selected.map((v) => options.find((o) => o.value === v)).filter((o): o is Option => !!o);
    const fileName = `${fold(label).replace(/\s+/g, "-")}.list`;

    let summary: React.ReactNode = <span className="text-muted">{placeholder}</span>;
    if (chosen.length === 1) {
        const Icon = chosen[0].icon;
        summary = <span className="flex min-w-0 items-center gap-2">{Icon && <Icon className="size-4 shrink-0" />}<span className="truncate">{chosen[0].label}</span></span>;
    }
    else if (chosen.length > 1 && !multiple) summary = <span className="truncate">{chosen[0].label}</span>;
    else if (chosen.length > 1) summary = <span className="truncate">{chosen.length} seleccionados</span>;

    const motion = "motion-safe:animate-[select-in_120ms_ease-out]";

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <span id={`${baseId}-label`} className="eyebrow mb-1 block">{label}</span>
            <button
                ref={triggerRef}
                id={baseId}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-labelledby={`${baseId}-label ${baseId}`}
                onClick={() => (open ? close(false) : openPanel())}
                onKeyDown={onTriggerKey}
                className="flex min-h-11 w-full items-center justify-between gap-2 border-[length:var(--line)] border-ink bg-paper px-3 py-2 text-left text-sm font-bold text-ink shadow-hard-sm focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-lens"
            >
                <span className="flex min-w-0 flex-1 items-center">{summary}</span>
                <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div
                    ref={panelRef}
                    tabIndex={-1}
                    onKeyDown={onKeyDown}
                    className={`window absolute inset-x-0 z-50 max-h-[60vh] outline-none ${up ? "bottom-full mb-3" : "top-full mt-3"} ${motion}`}
                >
                    <div className="window-bar">
                        <span className="window-dot" aria-hidden="true" />
                        <span className="flex-1 truncate">{fileName}</span>
                    </div>
                    {showSearch && (
                        <div className="relative shrink-0 border-b-[length:var(--line)] border-ink">
                            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                            <input
                                ref={inputRef}
                                type="text"
                                role="combobox"
                                aria-label={`Buscar en ${label}`}
                                aria-expanded="true"
                                aria-controls={listId}
                                aria-autocomplete="list"
                                aria-activedescendant={filtered[active] ? `${baseId}-opt-${active}` : undefined}
                                value={query}
                                placeholder={searchPlaceholder}
                                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                                className="w-full bg-paper py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:bg-grey"
                            />
                        </div>
                    )}
                    <ul
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        aria-label={label}
                        aria-multiselectable={multiple || undefined}
                        aria-activedescendant={!showSearch && filtered[active] ? `${baseId}-opt-${active}` : undefined}
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
                    >
                        {rows.length === 0 && <li role="presentation" className="px-3 py-4 text-center text-sm text-muted">Sin resultados</li>}
                        {rows.map((r) => {
                            if (r.kind === "group") {
                                return <li key={`g-${r.name}`} role="presentation" className="eyebrow px-3 pb-1 pt-3">{r.name}</li>;
                            }
                            const { opt, index } = r;
                            const on = selected.includes(opt.value);
                            const Icon = opt.icon;
                            return (
                                <li
                                    key={opt.value}
                                    id={`${baseId}-opt-${index}`}
                                    data-index={index}
                                    role="option"
                                    aria-selected={on}
                                    onMouseMove={() => setActive(index)}
                                    onClick={() => pick(opt)}
                                    className={`mx-1 flex cursor-pointer items-center gap-2 px-2 py-2 text-sm font-bold ${on ? "bg-ink text-paper" : "text-ink"} ${active === index ? (on ? "outline-2 -outline-offset-4 outline-paper" : "bg-grey-2") : ""}`}
                                >
                                    {multiple && (
                                        <span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center border-2 ${on ? "border-paper bg-paper text-ink" : "border-ink bg-paper"}`}>
                                            {on && <Check className="size-3" strokeWidth={4} />}
                                        </span>
                                    )}
                                    {Icon && <Icon className="size-4 shrink-0" />}
                                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                                    {!multiple && on && <Check aria-hidden="true" className="size-4 shrink-0" />}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex shrink-0 items-center justify-between gap-2 border-t-[length:var(--line)] border-ink bg-grey p-2">
                        {clearable ? (
                            <button type="button" onClick={clear} disabled={!selected.length} className="btn !min-h-8 !px-3 !py-1 text-xs disabled:opacity-40">Limpiar</button>
                        ) : <span />}
                        <button type="button" onClick={() => close(true)} className="btn btn-primary !min-h-8 !px-3 !py-1 text-xs">Listo</button>
                    </div>
                </div>
            )}
        </div>
    );
}
