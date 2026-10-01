import React from "react"
import type { StackGroup } from "./content"
import { iconFor } from "./icons"

interface Props {
    groups: StackGroup[]
    active: number
    onSelect: (index: number) => void
    title: string
    tabsLabel: string
}

const StackScreen: React.FC<Props> = ({ groups, active, onSelect, title, tabsLabel }) => {
    const group = groups[active]
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
                <div role="tablist" aria-label={tabsLabel} className="about-screen-tabs">
                    {groups.map((g, i) => (
                        <button
                            key={g.id}
                            type="button"
                            role="tab"
                            id={`stack-tab-${g.id}`}
                            aria-selected={i === active}
                            aria-controls="stack-panel"
                            onClick={() => onSelect(i)}
                            className="about-screen-tab"
                        >
                            {g.short}
                        </button>
                    ))}
                </div>
                <div id="stack-panel" role="tabpanel" aria-labelledby={`stack-tab-${group.id}`} className="about-screen-panel" key={group.id}>
                    <p className="about-screen-cmd">
                        <span aria-hidden="true">$ </span>
                        {group.cmd}
                        <span className="about-caret" aria-hidden="true" />
                    </p>
                    <h3 className="about-screen-title">{group.title}</h3>
                    <p className="about-screen-desc">{group.desc}</p>
                    <ul className="about-screen-chips">
                        {group.items.map((item, i) => {
                            const Icon = iconFor(item, group.id)
                            return (
                                <li key={item} className="about-chip" style={{ "--i": i } as React.CSSProperties}>
                                    <Icon className="about-chip-icon" aria-hidden="true" />
                                    {item}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default StackScreen
