import React from "react"
import { Link } from "react-router"
import { motion, useReducedMotion } from "framer-motion"
import { useTranslation } from "react-i18next"
import EmblaCarousel from "../components/EmblaCarousel"
import ExperienceTimeline from "../components/ExperienceItemTimeline"
import ContactForm from "../components/ContactForm"
import Services from "../components/Services"
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
            <a href="#servicios" className="btn">
              {t("home.hero.cta")}
            </a>
          </div>
        </motion.div>

        <div className="mt-10 md:mt-14">
          <h2 className="mb-3 text-lg leading-none">{t("home.quickLinksTitle")}</h2>
          <nav aria-label={t("home.quickLinksAria")} className="quicklinks">
            <a href="#servicios" className="quicklink">{t("home.quick.services")}</a>
            <a href="#proyectos" className="quicklink">{t("home.quick.projects")}</a>
            <Link to="/about" className="quicklink">{t("home.quick.about")}</Link>
            <a href="#contacto" className="quicklink">{t("home.quick.contact")}</a>
          </nav>
        </div>
        <NowWorking />
      </section>

      <div className="divider" />
      <Services />
      <div className="divider" />

      <section id="proyectos" data-scene="projects" className="section scroll-mt-10">
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
      <section data-scene="experience" className="dither">
        <div data-slot="g" className="h-40 md:hidden" aria-hidden="true" />
        <ExperienceTimeline />
      </section>
      <div className="divider" />

      <section id="contacto" data-scene="contact" className="section scroll-mt-10">
        <motion.div {...reveal} className="mx-auto max-w-2xl">
          <h2 className="text-4xl md:text-5xl">{t("home.contact.title")}</h2>
          <p className="mt-3 text-muted">{t("home.contact.intro")}</p>
          <div data-slot="l" className="h-36 md:hidden" aria-hidden="true" />
          <div className="window mt-8">
            <div className="window-bar">
              <span className="window-dot" aria-hidden="true" />
              <span className="window-dot" aria-hidden="true" />
              <span className="flex-1 truncate text-center">{t("home.contact.windowTitle")}</span>
            </div>
            <div className="window-body">
              <ContactForm />
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

export default Home
