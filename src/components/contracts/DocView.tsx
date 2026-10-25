import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CoverInfo, DocBlock, Strokes } from "../../types/contracts";
import SignatureView from "./SignatureView";

export interface PartySig { name: string; strokes?: Strokes | null; date?: string }

interface Props {
    blocks: DocBlock[];
    title: string;
    cover?: Partial<CoverInfo>;
    owner?: PartySig;
    client?: PartySig;
    className?: string;
}

type Item = { kind: "h2"; text: string; n: number } | { kind: "p"; text: string; num?: string } | { kind: "h1"; text: string } | { kind: "li"; text: string } | { kind: "table"; rows: string[][] };

const SERIF = "font-['Cormorant_Garamond',Georgia,'Times_New_Roman',serif]";
const SMALL_CAPS = "[font-variant:small-caps]";
const SHEET_BUDGET = 2600;
const PAGE_W = 794;

const weight = (i: Item) => (i.kind === "table" ? 140 + i.rows.length * 90 : i.kind === "h2" ? 160 : i.kind === "h1" ? 160 : 60 + i.text.length);

function toItems(blocks: DocBlock[], skipFirstH1: boolean): Item[] {
    const out: Item[] = [];
    let section = 0;
    let clause = 0;
    let skipped = !skipFirstH1;
    for (const b of blocks) {
        if (b.type === "h1") {
            if (!skipped) { skipped = true; continue; }
            out.push({ kind: "h1", text: b.text });
        } else if (b.type === "h2") {
            section += 1;
            clause = 0;
            out.push({ kind: "h2", text: b.text, n: section });
        } else if (b.type === "p") {
            clause += 1;
            out.push({ kind: "p", text: b.text, num: section ? `${section}.${clause}` : undefined });
        } else if (b.type === "li") out.push({ kind: "li", text: b.text });
        else out.push({ kind: "table", rows: b.rows });
    }
    return out;
}

function paginate(items: Item[]): Item[][] {
    const sheets: Item[][] = [[]];
    let used = 0;
    for (const it of items) {
        const w = weight(it);
        if (used + w > SHEET_BUDGET && sheets[sheets.length - 1].length) { sheets.push([]); used = 0; }
        sheets[sheets.length - 1].push(it);
        used += w;
    }
    return sheets;
}

function Table({ rows }: { rows: string[][] }) {
    const [head, ...body] = rows;
    const cols = Math.max(...rows.map((r) => r.length));
    const cell = (r: string[], i: number) => (r[i] ?? "");
    const align = (i: number) => (i === cols - 1 && cols > 1 ? "text-right" : "text-left");
    const last = body[body.length - 1];
    const hasTotal = body.length > 1 && /total/i.test(last?.[0] ?? "");
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px] text-[#2B2A24]">
                <thead>
                    <tr className="border-b border-[#4A4636]/60">
                        {Array.from({ length: cols }, (_, i) => <th key={i} scope="col" className={`px-2 py-2 font-extrabold ${align(i)}`}>{cell(head, i)}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {body.map((r, ri) => (
                        <tr key={ri} className={`border-b border-[#4A4636]/25 ${hasTotal && ri === body.length - 1 ? "font-extrabold" : ""}`}>
                            {Array.from({ length: cols }, (_, i) => <td key={i} className={`px-2 py-2 align-top ${align(i)}`}>{cell(r, i)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** La hoja se maqueta siempre a ancho de papel y se reduce en pantallas angostas, como un visor de PDF (el zoom del navegador la amplía). */
function Scaled({ children }: { children: ReactNode }) {
    const outer = useRef<HTMLDivElement>(null);
    const inner = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState<number>();

    useLayoutEffect(() => {
        const measure = () => {
            const s = Math.min(1, (outer.current?.clientWidth ?? PAGE_W) / PAGE_W);
            setScale(s);
            setHeight((inner.current?.offsetHeight ?? 0) * s || undefined);
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (outer.current) ro.observe(outer.current);
        if (inner.current) ro.observe(inner.current);
        return () => ro.disconnect();
    }, []);

    return (
        <div ref={outer} className="mx-auto w-full max-w-[794px] overflow-hidden" style={{ height }}>
            <div ref={inner} style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
        </div>
    );
}

function Party({ label, sig }: { label: string; sig?: PartySig }) {
    const { t } = useTranslation();
    return (
        <div className="min-w-0 space-y-1">
            <div className="flex h-20 items-end border-b border-[#2B2A24]">
                {sig?.strokes && <SignatureView strokes={sig.strokes} label={t("sign.signatureOf", { name: sig.name })} className="max-h-20 !text-[#2B2A24]" />}
            </div>
            <p className={`text-xs uppercase tracking-widest text-[#4A4636] ${SMALL_CAPS}`}>{label}</p>
            <p className="break-words text-sm font-extrabold">{sig?.name || " "}</p>
            <p className="text-xs text-[#4A4636]">{sig?.date || " "}</p>
        </div>
    );
}

export default function DocView({ blocks, title, cover, owner, client, className = "" }: Props) {
    const { t } = useTranslation();
    const firstH1 = blocks.find((b) => b.type === "h1");
    const heading = firstH1?.text || title;
    const sheets = paginate(toItems(blocks, !!firstH1));
    const ref = cover?.ref ?? "";
    const sheet = "relative flex w-[794px] aspect-[8.5/11] flex-col bg-[#FDFCF8] font-normal text-[#2B2A24] shadow-[0_2px_14px_rgba(43,42,36,0.18)]";
    const contact = [cover?.ownerName, cover?.ownerEmail, cover?.ownerPhone, cover?.ownerCity].filter(Boolean);

    const render = (it: Item, i: number) => {
        if (it.kind === "h1") return <h2 key={i} className={`${SERIF} pt-2 text-2xl font-bold`}>{it.text}</h2>;
        if (it.kind === "h2") return <h3 key={i} className={`break-words mt-2 border-b border-[#4A4636]/25 pb-1 pt-3 text-base font-extrabold tracking-wide text-[#4A4636] ${SMALL_CAPS}`}>{it.n}. {it.text}</h3>;
        if (it.kind === "li") return <p key={i} className="flex gap-2 pl-8"><span aria-hidden="true">•</span><span className="min-w-0 break-words">{it.text}</span></p>;
        if (it.kind === "table") return <Table key={i} rows={it.rows} />;
        return <p key={i} className="break-words text-left"><span className="mr-2 font-extrabold tabular-nums text-[#4A4636]">{it.num}</span>{it.text}</p>;
    };

    return (
        <article aria-label={heading} className={`dither space-y-6 border-2 border-ink p-2 sm:p-6 ${className}`}>
            <Scaled><section className={`${sheet} justify-between bg-[#EDEBDD] px-14 py-12`}>
                <p className="text-right text-sm text-[#4A4636]">{cover?.date}</p>
                <div className="space-y-5 py-10 text-center">
                    <h1 className={`${SERIF} break-words text-5xl font-semibold leading-tight`}>{heading}</h1>
                    {cover?.subtitle && <p className="text-xs uppercase tracking-[0.3em] text-[#4A4636]">{cover.subtitle}</p>}
                    <hr className="mx-auto w-24 border-t border-[#4A4636]" />
                    {cover?.clientName && <p className="text-base">{t("sign.doc.client")}: <strong>{cover.clientName}</strong></p>}
                </div>
                <div className="space-y-0.5 text-sm text-[#4A4636]">
                    {contact.map((c, i) => <p key={i} className={`break-words ${i === 0 ? "font-extrabold text-[#2B2A24]" : ""}`}>{c}</p>)}
                </div>
            </section></Scaled>

            {sheets.map((items, si) => (
                <Scaled key={si}><section className={`${sheet} px-14 py-12`}>
                    <header className="mb-6 flex items-baseline justify-between gap-4 border-b border-[#4A4636]/40 pb-2">
                        <span className={`${SERIF} text-xl font-semibold`}>{t("sign.doc.contract")}</span>
                        <span className={`truncate text-sm text-[#4A4636] ${SMALL_CAPS}`}>{cover?.subtitle || heading}</span>
                    </header>
                    <div className="flex-1 space-y-4 text-[15px] leading-[1.75]">
                        {items.map(render)}
                        {si === sheets.length - 1 && (
                            <div className="space-y-4 pt-8">
                                <h3 className={`text-base font-extrabold uppercase tracking-widest text-[#4A4636]`}>{t("sign.doc.signatures")}</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <Party label={t("sign.provider")} sig={owner} />
                                    <Party label={t("sign.client")} sig={client} />
                                </div>
                            </div>
                        )}
                    </div>
                    <footer className="mt-6 flex justify-between gap-4 border-t border-[#4A4636]/40 pt-2 text-xs text-[#4A4636]">
                        <span className="truncate">{ref}</span>
                        <span>{t("sign.doc.sheet", { n: si + 1 })}</span>
                    </footer>
                </section></Scaled>
            ))}
        </article>
    );
}
