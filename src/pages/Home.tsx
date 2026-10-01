import React from "react"
import { Link } from "react-router"
import { motion, useReducedMotion } from "framer-motion"
import { useTranslation } from "react-i18next"
import EmblaCarousel from "../components/EmblaCarousel"
import NowWorking from "../components/NowWorking"
import { useDocumentMeta } from "../lib/seo"

const Home: React.FC = () => {
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  useDocumentMeta({ title: t("seo.home.title"), description: t("seo.home.description") })

  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 },
      }

  return (
    <div className="text-ink">
      <section
        data-scene="hero"
        className="section flex flex-col justify-center pb-10 pt-0 md:min-h-[88svh] md:py-16"
      >
        <div data-slot="k" className="h-[26svh] md:hidden" aria-hidden="true" />
        <motion.div {...reveal} className="md:w-1/2">
          <h1 className="text-[clamp(3rem,9vw,5.5rem)]">
            {t("home.hero.greeting")}
            <br />
            {t("home.hero.name")}
          </h1>
          <p className="mt-4 max-w-md text-lg leading-snug">
            {t("home.hero.tagline")}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/services" className="btn">
              {t("home.hero.cta")}
            </Link>
          </div>
        </motion.div>

        <div className="mt-10 hidden md:mt-14 md:block">
          <h2 className="mb-3 text-lg leading-none">{t("home.quickLinksTitle")}</h2>
          <nav aria-label={t("home.quickLinksAria")} className="quicklinks">
            <Link to="/services" className="quicklink">{t("home.quick.services")}</Link>
            <Link to="/projects" className="quicklink">{t("home.quick.projects")}</Link>
            <Link to="/experience" className="quicklink">{t("home.quick.experience")}</Link>
            <Link to="/contact" className="quicklink">{t("home.quick.contact")}</Link>
          </nav>
        </div>
        <NowWorking />
      </section>

      <div className="divider" />
      <section data-scene="projects" className="section">
        <motion.div {...reveal}>
          <h2 className="text-4xl md:text-5xl">{t("home.projects.title")}</h2>
          <p className="mt-3 max-w-xl text-muted">{t("home.projects.intro")}</p>
          <div className="mt-6">
            <EmblaCarousel />
          </div>
          <div data-slot="k" className="h-36 md:hidden" aria-hidden="true" />
          <div className="mt-8 text-center">
            <Link to="/projects" className="btn">
              {t("home.projects.all")} <span className="font-mono">→</span>
            </Link>
          </div>
        </motion.div>
      </section>

      <div className="divider" />
      <section className="section">
        <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl md:text-5xl">{t("home.cta.title")}</h2>
          <p className="mt-3 text-muted">{t("home.cta.text")}</p>
          <div className="mt-6">
            <Link to="/contact" className="btn btn-primary">
              {t("home.cta.button")} <span className="font-mono">→</span>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

export default Home
