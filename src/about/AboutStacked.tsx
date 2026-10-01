import React, { lazy, Suspense, useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { AboutData } from "./AboutStage"
import { SocialLinks } from "./AboutStage"
import type { MacbookScene } from "./macbookScene"
import StackScreen from "./StackScreen"
import { iconFor } from "./icons"

const MacbookStage = lazy(() => import("./MacbookStage"))

interface Props {
    data: AboutData
    webgl: boolean
}

const Window: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="window">
        <div className="window-bar">
            <span className="window-dot" aria-hidden="true" />
            <span className="window-dot" aria-hidden="true" />
            <span className="flex-1 truncate text-center">{title}</span>
        </div>
        <div className="window-body">{children}</div>
    </div>
)

const Chips: React.FC<{ items: string[] }> = ({ items }) => (
    <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
            <li key={item} className="tag !px-3 !py-1 !text-sm">
                {item}
            </li>
        ))}
    </ul>
)

const AboutStacked: React.FC<Props> = ({ data, webgl }) => {
    const { t } = useTranslation()
    const handle = useRef<MacbookScene | null>(null)
    const [group, setGroup] = useState(0)
    const [ready, setReady] = useState(false)
    const [failed, setFailed] = useState(!webgl)
    const onReady = useCallback(() => setReady(true), [])
    const onFail = useCallback(() => setFailed(true), [])
    const screen = (
        <StackScreen
            groups={data.stack}
            active={group}
            onSelect={setGroup}
            title={t("about.stackWindow")}
            tabsLabel={t("about.stackTabs")}
        />
    )

    return (
        <div className="section text-ink">
            <p className="eyebrow">{t("about.eyebrow")}</p>
            <div className="mt-2 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
                <div>
                    <h1 className="text-balance text-5xl md:text-7xl">{t("about.title")}</h1>
                    <div className="mt-8 space-y-4">
                        {data.paragraphs.map((text) => (
                            <p key={text}>{text}</p>
                        ))}
                    </div>
                </div>
                <img
                    src="/pic.webp"
                    alt={t("about.photoAlt")}
                    width={480}
                    height={640}
                    className="mx-auto aspect-[3/4] w-full max-w-xs border-[length:var(--line)] border-ink object-cover object-top shadow-hard"
                />
            </div>

            <h2 className="mt-16 text-3xl">{t("about.howTitle")}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Window title={t("about.archWindow")}>
                    <h3 className="mb-3 text-xl">{data.groups[1].title}</h3>
                    <Chips items={data.groups[1].items} />
                </Window>
                <Window title={t("about.softWindow")}>
                    <h3 className="mb-3 text-xl">{data.groups[2].title}</h3>
                    <Chips items={data.groups[2].items} />
                </Window>
            </div>
            <div className="mt-6">
                <Window title={t("about.backendWindow")}>
                    <dl className="grid gap-x-8 gap-y-3 font-mono text-sm md:grid-cols-2">
                        {data.backend.map(({ name, note }) => (
                            <div key={name}>
                                <dt className="font-black underline decoration-2 underline-offset-2">{name}</dt>
                                <dd className="text-muted">{note}</dd>
                            </div>
                        ))}
                    </dl>
                </Window>
            </div>

            <p className="eyebrow mt-16">{t("about.stackEyebrow")}</p>
            <h2 className="mt-1 text-3xl">{t("about.stackTitle")}</h2>
            <div className="relative mx-auto mt-6 aspect-[4/3] w-full max-w-3xl md:aspect-[16/10]">
                {!failed && (
                    <Suspense fallback={null}>
                        <MacbookStage
                            handle={handle}
                            groups={data.stack}
                            active={group}
                            onSelect={setGroup}
                            title={t("about.stackWindow")}
                            tabsLabel={t("about.stackTabs")}
                            staticOpen
                            onReady={onReady}
                            onFail={onFail}
                        />
                    </Suspense>
                )}
                {!ready && <div className="about-fallback-flow">{screen}</div>}
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
                {data.stack.map((g) => (
                    <Window key={g.id} title={g.cmd}>
                        <h3 className="mb-1 text-xl">{g.title}</h3>
                        <p className="mb-3 font-mono text-sm text-muted">{g.desc}</p>
                        <ul className="flex flex-wrap gap-2">
                            {g.items.map((item) => {
                                const Icon = iconFor(item, g.id)
                                return (
                                    <li key={item} className="tag !px-3 !py-1 !text-sm">
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        {item}
                                    </li>
                                )
                            })}
                        </ul>
                    </Window>
                ))}
            </div>

            <h2 className="mt-16 text-3xl">{t("about.closeTitle")}</h2>
            <p className="mt-3">{t("about.closeLead")}</p>
            <div className="mt-6">
                <SocialLinks talk={t("about.talk")} />
            </div>
        </div>
    )
}

export default AboutStacked
