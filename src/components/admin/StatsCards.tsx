import { useTranslation } from "react-i18next";
import type { Count, Stats } from "../../lib/api";
import { countryName } from "./country";
import Flag from "./Flag";
import { deviceLabel, osLabel } from "./format";
import { RANGES } from "./ranges";

const OS_KEYS = ["windows", "macos", "android", "ios", "linux", "other"];
const DEVICE_KEYS = ["mobile", "tablet", "desktop", "bot"];

function BarList({ title, items, label, total, flags }: { title: string; items: Count[]; label?: (key: string) => string; total: number; flags?: boolean }) {
    const { t } = useTranslation();
    return (
        <section className="window">
            <div className="window-bar"><span className="window-dot" aria-hidden="true" /><h3 className="flex-1 truncate">{title}</h3></div>
            <div className="window-body">
            {items.length === 0 ? (
                <p className="text-sm text-muted">{t("admin.stats.noData")}</p>
            ) : (
                <ul className="space-y-2">
                    {items.map((it) => (
                        <li key={it.key} className="text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-2" title={flags ? countryName(it.key) : label ? label(it.key) : it.key}>
                                    {flags && <Flag code={it.key} />}
                                    <span className="truncate">{flags ? countryName(it.key) : label ? label(it.key) : it.key}</span>
                                </span>
                                <span className="font-mono text-muted">{it.n}</span>
                            </div>
                            <div className="mt-1 h-2 border-2 border-ink dither">
                                <div className="h-full bg-ink" style={{ width: `${total ? (it.n / total) * 100 : 0}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            </div>
        </section>
    );
}

function fill(keys: string[], items: Count[]): Count[] {
    return keys.map((key) => ({ key, n: items.find((i) => i.key === key)?.n ?? 0 }));
}

export default function StatsCards({ stats, days, onDays }: { stats: Stats | null; days: number; onDays: (d: number) => void }) {
    const { t } = useTranslation();
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label={t("admin.stats.range")} className="flex">
                    {RANGES.map((r) => (
                        <button
                            key={r.days}
                            type="button"
                            aria-pressed={days === r.days}
                            onClick={() => onDays(r.days)}
                            className={`border-2 border-ink px-3 py-1.5 font-mono text-sm ${days === r.days ? "bg-ink text-paper" : "bg-paper text-ink"}`}
                        >
                            {t(r.key)}
                        </button>
                    ))}
                </div>
            </div>
            {!stats ? (
                <p className="text-sm text-muted">{t("admin.common.loading")}</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <section className="window">
                        <div className="window-bar"><span className="window-dot" aria-hidden="true" /><h3 className="flex-1 truncate">{t("admin.stats.visits")}</h3></div>
                        <p className="window-body font-mono text-4xl text-ink">{stats.total}</p>
                    </section>
                    <BarList title={t("admin.stats.os")} items={fill(OS_KEYS, stats.os)} label={osLabel} total={stats.total} />
                    <BarList title={t("admin.stats.devices")} items={fill(DEVICE_KEYS, stats.devices)} label={deviceLabel} total={stats.total} />
                    <BarList title={t("admin.stats.countries")} items={stats.countries} total={stats.total} flags />
                    <BarList title={t("admin.stats.paths")} items={stats.paths} total={stats.total} />
                    <BarList title={t("admin.stats.referrers")} items={stats.referrers} total={stats.total} />
                </div>
            )}
        </div>
    );
}
