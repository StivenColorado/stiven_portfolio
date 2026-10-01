import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MODEL_URL, type StackGroup } from "./content"
import { createMacbookScene, type MacbookScene } from "./macbookScene"
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
