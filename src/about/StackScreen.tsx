import React, { useLayoutEffect, useRef, useState } from "react"
import type { StackGroup } from "./content"
import { iconFor } from "./icons"

interface Props {
    groups: StackGroup[]
    active: number
    onSelect: (index: number) => void
    title: string
    tabsLabel: string
}

const MIN_EFFECTIVE_PX = 10.5
const STEP = 0.03

const GroupPanel: React.FC<{ group: StackGroup }> = ({ group }) => {
    const panelRef = useRef<HTMLDivElement>(null)
    const chipsRef = useRef<HTMLUListElement>(null)
    const [pages, setPages] = useState(1)
    const [page, setPage] = useState(0)
    const per = Math.ceil(group.items.length / pages)
    const items = group.items.slice(page * per, page * per + per)

    useLayoutEffect(() => {
        const panel = panelRef.current
        const chips = chipsRef.current
        if (!panel || !chips) return
        const fit = () => {
            panel.style.setProperty("--fit", "1")
            const css = getComputedStyle(panel)
            const base = parseFloat(css.fontSize) || 12
            const eff = parseFloat(css.getPropertyValue("--eff")) || 1
            const floor = Math.min(1, MIN_EFFECTIVE_PX / (base * eff))
            const pad = parseFloat(css.paddingBottom) || 0
            const overflows = () => {
                const last = chips.lastElementChild as HTMLElement | null
                const bottom = last ? last.offsetTop + last.offsetHeight : 0
                const tail = panel.lastElementChild === chips ? 0 : (panel.lastElementChild as HTMLElement).offsetHeight
                return bottom + tail + pad > panel.clientHeight + 0.5
            }
            let scale = 1
            panel.style.setProperty("--fit", String(scale))
            while (overflows() && scale - STEP >= floor) {
                scale -= STEP
                panel.style.setProperty("--fit", scale.toFixed(3))
            }
            if (overflows() && pages === 1 && group.items.length > 4) setPages(2)
        }
        fit()
        const observer = new ResizeObserver(fit)
        observer.observe(panel)
        return () => observer.disconnect()
    }, [group, pages, page])

    return (
        <div ref={panelRef} id="stack-panel" role="tabpanel" aria-labelledby={`stack-tab-${group.id}`} className="about-screen-panel">
            <p className="about-screen-cmd">
                <span aria-hidden="true">$ </span>
                {group.cmd}
                <span className="about-caret" aria-hidden="true" />
            </p>
            <h3 className="about-screen-title">{group.title}</h3>
            <p className="about-screen-desc">{group.desc}</p>
            <ul ref={chipsRef} className="about-screen-chips">
                {items.map((item, i) => {
                    const Icon = iconFor(item, group.id)
                    return (
                        <li key={item} className="about-chip" style={{ "--i": i } as React.CSSProperties}>
                            <Icon className="about-chip-icon" aria-hidden="true" />
                            {item}
                        </li>
                    )
                })}
            </ul>
            {pages > 1 && (
                <button type="button" className="about-screen-page" onClick={() => setPage((page + 1) % pages)}>
                    {page + 1}/{pages} ›
                </button>
            )}
        </div>
    )
}

const StackScreen: React.FC<Props> = ({ groups, active, onSelect, title, tabsLabel }) => {
    const group = groups[active]
    const tabs = useRef<(HTMLButtonElement | null)[]>([])

    const onKeyDown = (e: React.KeyboardEvent) => {
        const last = groups.length - 1
        let next = -1
        if (e.key === "ArrowRight") next = active === last ? 0 : active + 1
        else if (e.key === "ArrowLeft") next = active === 0 ? last : active - 1
        else if (e.key === "Home") next = 0
        else if (e.key === "End") next = last
        if (next < 0) return
        e.preventDefault()
        e.stopPropagation()
        onSelect(next)
        tabs.current[next]?.focus()
    }

    return (
        <div className="about-screen">
            <div className="window about-screen-window">
                <div className="window-bar">
                    <span className="window-dot" aria-hidden="true" />
                    <span className="window-dot" aria-hidden="true" />
                    <span className="flex-1 truncate text-center">
                        {title} · {active + 1}/{groups.length}
                    </span>
                </div>
                <div role="tablist" aria-label={tabsLabel} className="about-screen-tabs" onKeyDown={onKeyDown}>
                    {groups.map((g, i) => (
                        <button
                            key={g.id}
                            ref={(el) => {
                                tabs.current[i] = el
                            }}
                            type="button"
                            role="tab"
                            id={`stack-tab-${g.id}`}
                            aria-selected={i === active}
                            aria-controls="stack-panel"
                            tabIndex={i === active ? 0 : -1}
                            onClick={() => onSelect(i)}
                            className="about-screen-tab"
                        >
                            {g.short}
                        </button>
                    ))}
                </div>
                <GroupPanel key={group.id} group={group} />
            </div>
        </div>
    )
}

export default StackScreen
