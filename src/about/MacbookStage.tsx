import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MODEL_URL, type StackGroup } from "./content"
import { createMacbookScene, type Inset, type MacbookScene } from "./macbookScene"
import StackScreen from "./StackScreen"

interface Props {
    handle: React.MutableRefObject<MacbookScene | null>
    groups: StackGroup[]
    active: number
    onSelect: (index: number) => void
    title: string
    tabsLabel: string
    staticOpen?: boolean
    onReady: () => void
    onFail: () => void
}

const NO_INSET: Inset = { left: 0, right: 0, top: 0, bottom: 0 }

function measureInset(host: HTMLElement, wide: boolean): Inset {
    const chapter = host.closest(".about-ch")
    const text = chapter?.querySelector(".about-stack-text")
    if (!chapter || !text) return NO_INSET
    const h = host.getBoundingClientRect()
    const t = text.getBoundingClientRect()
    const nav = document.querySelector(".about-nav")?.getBoundingClientRect()
    const foot = chapter.querySelector(".about-stack-foot")?.getBoundingClientRect()
    const bottomOf = (r?: DOMRect) => (r && r.height > 0 ? Math.max(0, h.bottom - r.top) : 0)
    const bottom = Math.max(bottomOf(nav), wide ? 0 : bottomOf(foot))
    if (wide) return { left: Math.max(0, t.right - h.left), right: 0, top: 0, bottom }
    return { left: 0, right: 0, top: Math.max(0, t.bottom - h.top), bottom }
}

const MacbookStage: React.FC<Props> = ({ handle, groups, active, onSelect, title, tabsLabel, staticOpen = false, onReady, onFail }) => {
    const hostRef = useRef<HTMLDivElement>(null)
    const [screenEl] = useState(() => {
        const el = document.createElement("div")
        el.className = "about-screen-host"
        return el
    })
    const callbacks = useRef({ onReady, onFail })
    callbacks.current = { onReady, onFail }

    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        let cancelled = false
        let scene: MacbookScene | null = null
        createMacbookScene(host, {
            url: MODEL_URL,
            screenEl,
            staticOpen,
            inset: staticOpen ? undefined : (wide) => measureInset(host, wide),
            onLost: () => callbacks.current.onFail(),
        })
            .then((s) => {
                if (cancelled) {
                    s.dispose()
                    return
                }
                scene = s
                handle.current = s
                callbacks.current.onReady()
            })
            .catch(() => {
                if (!cancelled) callbacks.current.onFail()
            })
        return () => {
            cancelled = true
            if (handle.current === scene) handle.current = null
            scene?.dispose()
        }
    }, [handle, screenEl, staticOpen])

    return (
        <>
            <div ref={hostRef} className="absolute inset-0" />
            {createPortal(
                <StackScreen groups={groups} active={active} onSelect={onSelect} title={title} tabsLabel={tabsLabel} />,
                screenEl,
            )}
        </>
    )
}

export default MacbookStage
