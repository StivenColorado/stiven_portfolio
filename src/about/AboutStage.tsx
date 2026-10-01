import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import NowWorking from "../components/NowWorking"
import GithubIcon from "../components/icons/Github"
import LinkedinIcon from "../components/icons/Linkedin"
import {
    CHAPTER_COUNT,
    MODEL_URL,
    STACK_ENTER,
    STACK_OPEN,
    activeChapter,
    chapterFrame,
    chapterStops,
    clamp01,
    groupStop,
    ramp,
    splitChunks,
    stackGroup,
    stackLocal,
    type StackGroup,
} from "./content"
import type { MacbookScene } from "./macbookScene"
import StackScreen from "./StackScreen"

const MacbookStage = lazy(() => import("./MacbookStage"))

export interface AboutData {
    paragraphs: string[]
    backend: { name: string; note: string }[]
    groups: { title: string; items: string[] }[]
    stack: StackGroup[]
    nav: string[]
}

interface Props {
    data: AboutData
    webgl: boolean
}

const vars = (o: Record<string, string | number>) => o as CSSProperties
const GITHUB = "https://github.com/StivenColorado"
const LINKEDIN = "https://www.linkedin.com/in/stiven-colorado-370028220/"

export const SocialLinks: React.FC<{ talk: string }> = ({ talk }) => (
    <div className="flex flex-wrap gap-3 md:gap-4">
        <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="btn">
            <GithubIcon className="h-5 w-5" /> GitHub
        </a>
        <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" className="btn">
            <LinkedinIcon className="h-5 w-5" /> LinkedIn
        </a>
        <Link to="/contact" className="btn btn-primary">
            {talk}
        </Link>
    </div>
)

const AboutStage: React.FC<Props> = ({ data, webgl }) => {
    const { t } = useTranslation()
    const trackRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)
    const chapters = useRef<(HTMLElement | null)[]>([])
    const logRef = useRef<HTMLDivElement>(null)
    const handle = useRef<MacbookScene | null>(null)
    const latest = useRef({ enter: 0, open: 0, vis: 0 })
    const api = useRef<{ goTo: (p: number) => void }>({ goTo: () => undefined })
    const [active, setActive] = useState(0)
    const [group, setGroup] = useState(0)
    const [wantScene, setWantScene] = useState(false)
    const [ready, setReady] = useState(false)
    const [failed, setFailed] = useState(!webgl)

    const chunks = useMemo(() => data.paragraphs.map(splitChunks), [data.paragraphs])
    const total = useMemo(() => chunks.reduce((n, c) => n + c.length, 0), [chunks])
    const count = data.stack.length

    useEffect(() => {
        const track = trackRef.current
        const stage = stageRef.current
        if (!track || !stage) return
        let trackTop = 0
        let travel = 1
        let target = 0
        let shown = -1
        let last = 0
        let raf = 0
        let warmed = false
        let lastGroup = -1
        let lastActive = -1
        const on: number[] = Array(CHAPTER_COUNT).fill(-1)

        const measure = () => {
            trackTop = track.getBoundingClientRect().top + window.scrollY
            travel = Math.max(1, track.offsetHeight - stage.offsetHeight)
            const log = logRef.current
            if (log) {
                const inner = log.firstElementChild as HTMLElement | null
                if (inner) log.style.setProperty("--over", String(Math.max(0, inner.scrollHeight - log.clientHeight)))
            }
        }

        const apply = (p: number) => {
            for (let i = 0; i < CHAPTER_COUNT; i++) {
                const el = chapters.current[i]
                if (!el) continue
                const f = chapterFrame(p, i)
                el.style.setProperty("--v", f.vis.toFixed(4))
                el.style.setProperty("--in", f.enter.toFixed(4))
                el.style.setProperty("--out", f.exit.toFixed(4))
                el.style.setProperty("--l", f.local.toFixed(4))
                const flag = f.vis > 0.01 ? 1 : 0
                if (on[i] !== flag) {
                    el.dataset.on = String(flag)
                    on[i] = flag
                }
            }
            const g = stackGroup(p, count)
            if (g !== lastGroup) {
                lastGroup = g
                setGroup(g)
            }
            const a = activeChapter(p)
            if (a !== lastActive) {
                lastActive = a
                setActive(a)
            }
            const s = stackLocal(p)
            latest.current = {
                enter: ramp(s, 0, STACK_ENTER),
                open: ramp(s, STACK_OPEN[0], STACK_OPEN[1]),
                vis: chapterFrame(p, 3).vis,
            }
            handle.current?.update(latest.current)
            if (!warmed && p > 0.05) {
                warmed = true
                fetch(MODEL_URL).catch(() => undefined)
                setWantScene(true)
            }
        }

        const tick = (now: number) => {
            raf = 0
            target = clamp01((window.scrollY - trackTop) / travel)
            const dt = last ? Math.min(64, now - last) : 16
            last = now
            shown = shown < 0 ? target : shown + (target - shown) * (1 - Math.exp(-dt / 70))
            if (Math.abs(target - shown) < 0.0002) shown = target
            apply(shown)
            if (shown !== target) raf = requestAnimationFrame(tick)
            else last = 0
        }
        const schedule = () => {
            if (!raf && !document.hidden) raf = requestAnimationFrame(tick)
        }
        const onResize = () => {
            measure()
            schedule()
        }
        const goTo = (p: number) => {
            const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
            window.scrollTo({ top: trackTop + clamp01(p) * travel, behavior: calm ? "auto" : "smooth" })
        }
        api.current = { goTo }

        const onKey = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
            if (document.body.style.overflow === "hidden") return
            const el = e.target as HTMLElement | null
            if (el?.closest("input,textarea,select,[contenteditable='true']")) return
            const space = e.key === " "
            if ((space || e.key === "Enter") && el?.closest("a,button")) return
            let dir = 0
            if (e.key === "ArrowDown" || e.key === "PageDown" || (space && !e.shiftKey)) dir = 1
            else if (e.key === "ArrowUp" || e.key === "PageUp" || (space && e.shiftKey)) dir = -1
            else return
            const stops = chapterStops(count)
            const now = clamp01((window.scrollY - trackTop) / travel)
            if (dir > 0) {
                const next = stops.find((s) => s.p > now + 0.006)
                e.preventDefault()
                if (next) goTo(next.p)
                else window.scrollBy({ top: window.innerHeight * 0.9, behavior: "smooth" })
            } else {
                const prev = [...stops].reverse().find((s) => s.p < now - 0.006)
                if (prev && now > 0.001) {
                    e.preventDefault()
                    goTo(prev.p)
                }
            }
        }

        document.addEventListener("visibilitychange", schedule)
        window.addEventListener("scroll", schedule, { passive: true })
        window.addEventListener("resize", onResize)
        const observer = new ResizeObserver(onResize)
        observer.observe(stage)
        window.addEventListener("keydown", onKey)
        measure()
        schedule()
        const settle = window.setTimeout(onResize, 400)
        return () => {
            cancelAnimationFrame(raf)
            window.clearTimeout(settle)
            observer.disconnect()
            document.removeEventListener("visibilitychange", schedule)
            window.removeEventListener("scroll", schedule)
            window.removeEventListener("resize", onResize)
            window.removeEventListener("keydown", onKey)
        }
    }, [count, handle])

    const selectGroup = useCallback((i: number) => api.current.goTo(groupStop(i, count)), [count])
    const goChapter = (i: number) => {
        const stop = chapterStops(count).find((s) => s.chapter === i)
        if (stop) api.current.goTo(stop.p)
    }
    const onListKey = (e: React.KeyboardEvent<HTMLElement>) => {
        const last = count - 1
        let next = -1
        if (e.key === "ArrowDown") next = group === last ? 0 : group + 1
        else if (e.key === "ArrowUp") next = group === 0 ? last : group - 1
        else if (e.key === "Home") next = 0
        else if (e.key === "End") next = last
        if (next < 0) return
        e.preventDefault()
        e.stopPropagation()
        selectGroup(next)
        ;(e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus()
    }
    const setRef = (i: number) => (el: HTMLElement | null) => {
        chapters.current[i] = el
    }
    const onReady = useCallback(() => {
        setReady(true)
        handle.current?.update(latest.current)
    }, [handle])
    const onFail = useCallback(() => setFailed(true), [])

    const arch = data.groups[1]
    const soft = data.groups[2]
    const screen = (
        <StackScreen
            groups={data.stack}
            active={group}
            onSelect={selectGroup}
            title={t("about.stackWindow")}
            tabsLabel={t("about.stackTabs")}
        />
    )
    let chunkIndex = 0

    return (
        <div ref={trackRef} className="about-track">
            <div ref={stageRef} className="about-stage">
                <section ref={setRef(0)} data-ch="0" className="about-ch" aria-label={data.nav[0]}>
                    <div className="about-intro">
                        <div className="about-intro-title">
                            <p className="eyebrow">{t("about.eyebrow")}</p>
                            <h1 className="about-h1 mt-2">{t("about.title")}</h1>
                        </div>
                        <figure className="about-photo dither">
                            <img src="/pic.webp" alt={t("about.photoAlt")} width={480} height={640} decoding="async" />
                        </figure>
                        <div className="about-intro-now">
                            <NowWorking compact />
                        </div>
                    </div>
                    <p className="about-hint" aria-hidden="true">
                        {t("about.scroll")} <span className="about-hint-arrow">↓</span>
                    </p>
                </section>

                <section ref={setRef(1)} data-ch="1" className="about-ch" aria-label={data.nav[1]}>
                    <div className="mx-auto w-full max-w-3xl md:max-w-4xl">
                        <p className="eyebrow">{t("about.eyebrow")}</p>
                        <div className="about-bio mt-3">
                            {chunks.map((paragraph, pi) => (
                                <p key={pi}>
                                    {paragraph.map((chunk) => {
                                        const i = chunkIndex++
                                        return (
                                            <span key={chunk} className="about-dim" style={vars({ "--i": i, "--n": total })}>
                                                {chunk}{" "}
                                            </span>
                                        )
                                    })}
                                </p>
                            ))}
                        </div>
                    </div>
                </section>

                <section ref={setRef(2)} data-ch="2" className="about-ch about-how" aria-label={data.nav[2]}>
                    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 md:gap-4">
                        <div className="about-how-head shrink-0">
                            <p className="eyebrow">{t("about.howEyebrow")}</p>
                            <h2 className="mt-1 text-[clamp(1.6rem,7vw,2.75rem)]">{t("about.howTitle")}</h2>
                        </div>
                        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 md:gap-4 md:[grid-template-rows:auto_1fr]">
                            <div className="window about-card shrink-0" style={vars({ "--a": 0.02, "--b": 0.22 })}>
                                <div className="window-bar">
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="flex-1 truncate text-center">{t("about.archWindow")}</span>
                                </div>
                                <div className="window-body !p-2.5 md:!p-4">
                                    <h3 className="mb-1.5 text-sm md:mb-2 md:text-xl">{arch.title}</h3>
                                    <ul className="flex flex-wrap gap-1 md:gap-1.5">
                                        {arch.items.map((item) => (
                                            <li key={item} className="tag !px-1.5 !py-0 !text-[11px] md:!px-2 md:!py-0.5 md:!text-xs">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div
                                className="window about-card min-h-[7rem] md:row-span-2 md:col-start-2 md:row-start-1"
                                style={vars({ "--a": 0.16, "--b": 0.36 })}
                            >
                                <div className="window-bar">
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="flex-1 truncate text-center">{t("about.backendWindow")}</span>
                                </div>
                                <div ref={logRef} className="about-log min-h-0 flex-1">
                                    <dl className="about-log-inner window-body !p-3 font-mono text-[12.5px] leading-snug md:!p-4 md:text-sm">
                                        {data.backend.map(({ name, note }) => (
                                            <div key={name} className="mb-2.5">
                                                <dt className="font-black underline decoration-2 underline-offset-2">{name}</dt>
                                                <dd className="text-muted">{note}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </div>
                            <div className="window about-card shrink-0 md:col-start-1 md:row-start-2" style={vars({ "--a": 0.3, "--b": 0.5 })}>
                                <div className="window-bar">
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="window-dot" aria-hidden="true" />
                                    <span className="flex-1 truncate text-center">{t("about.softWindow")}</span>
                                </div>
                                <div className="window-body !p-2.5 md:!p-4">
                                    <h3 className="mb-1.5 text-sm md:mb-2 md:text-xl">{soft.title}</h3>
                                    <ul className="flex flex-wrap gap-1 md:gap-1.5">
                                        {soft.items.map((item) => (
                                            <li key={item} className="tag !px-1.5 !py-0 !text-[11px] md:!px-2 md:!py-0.5 md:!text-xs">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section ref={setRef(3)} data-ch="3" className="about-ch about-ch-stack" aria-label={data.nav[3]}>
                    <div className="absolute inset-0">
                        {wantScene && !failed && (
                            <Suspense fallback={null}>
                                <MacbookStage
                                    handle={handle}
                                    groups={data.stack}
                                    active={group}
                                    onSelect={selectGroup}
                                    title={t("about.stackWindow")}
                                    tabsLabel={t("about.stackTabs")}
                                    onReady={onReady}
                                    onFail={onFail}
                                />
                            </Suspense>
                        )}
                    </div>
                    {!ready && (
                        <div className="about-fallback" style={{ fontSize: 13 }}>
                            {screen}
                        </div>
                    )}
                    <div className="about-stack-caption">
                        <div className="about-stack-text">
                            <p className="eyebrow">{t("about.stackEyebrow")}</p>
                            <h2 className="mt-1 text-[clamp(1.6rem,8vw,3rem)] md:text-[clamp(2.2rem,3.6vw,3.75rem)]">{t("about.stackTitle")}</h2>
                            <p className="about-stack-lead mt-2 font-mono text-xs md:text-sm">{t("about.stackLead")}</p>
                            <div role="tablist" aria-label={t("about.stackTabs")} aria-orientation="vertical" className="about-stack-list">
                                {data.stack.map((g, i) => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={i === group}
                                        aria-controls="stack-panel"
                                        tabIndex={i === group ? 0 : -1}
                                        onClick={() => selectGroup(i)}
                                        onKeyDown={onListKey}
                                        className="about-stack-item"
                                    >
                                        <span aria-hidden="true">0{i + 1}</span> {g.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="about-stack-foot" aria-hidden="true">
                        <p className="eyebrow">
                            0{group + 1}/0{count}
                        </p>
                        <p className="text-xl font-black leading-tight">{data.stack[group].title}</p>
                        <p className="mt-1 font-mono text-xs text-muted">{data.stack[group].desc}</p>
                    </div>
                    <p className="about-hint about-hint-stack" aria-hidden="true">
                        {t("about.stackNext")} <span className="about-hint-arrow">↓</span>
                    </p>
                </section>

                <section ref={setRef(4)} data-ch="4" className="about-ch" aria-label={data.nav[4]}>
                    <div className="mx-auto w-full max-w-3xl">
                        <p className="eyebrow about-rise" style={vars({ "--a": 0, "--b": 0.3 })}>
                            {t("about.closeEyebrow")}
                        </p>
                        <h2 className="about-rise mt-2 text-[clamp(2.3rem,12vw,4.5rem)]" style={vars({ "--a": 0.05, "--b": 0.4 })}>
                            {t("about.closeTitle")}
                        </h2>
                        <p className="about-rise mt-4 text-base md:text-xl" style={vars({ "--a": 0.2, "--b": 0.55 })}>
                            {t("about.closeLead")}
                        </p>
                        <div className="about-rise mt-6" style={vars({ "--a": 0.35, "--b": 0.7 })}>
                            <SocialLinks talk={t("about.talk")} />
                        </div>
                    </div>
                </section>

                <nav className="about-nav" aria-label={t("about.navAria")}>
                    {data.nav.map((label, i) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => goChapter(i)}
                            aria-label={`${t("about.navGo")}: ${label}`}
                            aria-current={i === active ? "step" : undefined}
                            className="about-dot"
                        >
                            <span />
                        </button>
                    ))}
                    <span className="about-nav-label" aria-hidden="true">
                        0{active + 1} {data.nav[active]}
                    </span>
                </nav>
            </div>
        </div>
    )
}

export default AboutStage
