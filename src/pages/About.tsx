import React, { useEffect, useMemo } from "react"
import { useReducedMotion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { useDocumentMeta } from "../lib/seo"
import AboutStacked from "../about/AboutStacked"
import AboutStage, { type AboutData } from "../about/AboutStage"

function hasWebGL(): boolean {
    try {
        const canvas = document.createElement("canvas")
        const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
        if (!gl) return false
        gl.getExtension("WEBGL_lose_context")?.loseContext()
        return true
    } catch {
        return false
    }
}

const About: React.FC = () => {
    const reduce = useReducedMotion()
    const { t } = useTranslation()
    useDocumentMeta({ title: t("seo.about.title"), description: t("seo.about.description") })
    const webgl = useMemo(hasWebGL, [])

    useEffect(() => {
        const root = document.documentElement
        root.classList.add("about-scroll")
        return () => root.classList.remove("about-scroll")
    }, [])

    const data: AboutData = {
        paragraphs: t("about.paragraphs", { returnObjects: true }) as string[],
        backend: t("about.backend", { returnObjects: true }) as AboutData["backend"],
        groups: t("about.groups", { returnObjects: true }) as AboutData["groups"],
        stack: t("about.stack", { returnObjects: true }) as AboutData["stack"],
        nav: t("about.nav", { returnObjects: true }) as string[],
    }

    return reduce ? <AboutStacked data={data} webgl={webgl} /> : <AboutStage data={data} webgl={webgl} />
}

export default About
