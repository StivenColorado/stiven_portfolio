import React from "react"
import { Link } from "react-router"
import { motion, useReducedMotion } from "framer-motion"
import { useTranslation } from "react-i18next"
import GithubIcon from "../components/icons/Github"
import LinkedinIcon from "../components/icons/Linkedin"
import { useDocumentMeta } from "../lib/seo"

const Chip: React.FC<{ children: string }> = ({ children }) => (
  <span className="tag !px-3 !py-1 !text-sm">{children}</span>
)

const About: React.FC = () => {
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  useDocumentMeta({ title: t("seo.about.title"), description: t("seo.about.description") })
  const paragraphs = t("about.paragraphs", { returnObjects: true }) as string[]
  const backend = t("about.backend", { returnObjects: true }) as { name: string; note: string }[]
  const groups = t("about.groups", { returnObjects: true }) as { title: string; items: string[] }[]

  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 },
      }

  return (
    <div className="section text-ink">
      <div data-slot="g" className="h-[40svh] md:hidden" aria-hidden="true" />
      <motion.div {...reveal}>
        <p className="eyebrow">{t("about.eyebrow")}</p>
        <h1 className="mt-2 text-balance text-5xl md:text-7xl">
          {t("about.title")}
        </h1>
      </motion.div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <motion.div {...reveal} className="space-y-4 lg:order-1">
          {paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
          <div className="flex flex-wrap gap-4 pt-4">
            <a
              href="https://github.com/StivenColorado"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              <GithubIcon className="h-5 w-5" /> GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/stiven-colorado-370028220/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              <LinkedinIcon className="h-5 w-5" /> LinkedIn
            </a>
            <Link to="/#contacto" className="btn btn-primary">
              {t("about.talk")}
            </Link>
          </div>
        </motion.div>

        <motion.div {...reveal} className="mx-auto w-full max-w-xs lg:order-2">
          <img
            src="/pic.webp"
            alt={t("about.photoAlt")}
            width={480}
            height={640}
            className="aspect-[3/4] w-full border-[length:var(--line)] border-ink object-cover object-top shadow-hard"
          />
        </motion.div>
      </div>

      <motion.div {...reveal} className="mt-16">
        <h2 className="text-3xl">{t("about.backendTitle")}</h2>
        <div className="window mt-6">
          <div className="window-bar">
            <span className="window-dot" aria-hidden="true" />
            <span className="window-dot" aria-hidden="true" />
            <span className="flex-1 truncate text-center">{t("about.backendWindow")}</span>
          </div>
        <dl className="window-body grid gap-x-8 gap-y-3 font-mono text-sm md:grid-cols-2">
          {backend.map(({ name, note }) => (
            <div key={name}>
              <dt className="font-black underline decoration-2 underline-offset-2">{name}</dt>
              <dd className="text-muted">{note}</dd>
            </div>
          ))}
        </dl>
        </div>
      </motion.div>

      {groups.map((group) => (
        <motion.div key={group.title} {...reveal} className="mt-12">
          <h2 className="text-3xl">{group.title}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {group.items.map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default About
