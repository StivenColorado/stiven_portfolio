import React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useTranslation } from "react-i18next"
import ContactForm from "../components/ContactForm"
import { useDocumentMeta } from "../lib/seo"

const PHONE = "573218956487"

const ContactPage: React.FC = () => {
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  useDocumentMeta({ title: t("seo.contact.title"), description: t("seo.contact.description") })
  const whatsapp = `https://wa.me/${PHONE}?text=${encodeURIComponent(t("contact.whatsappMessage"))}`

  return (
    <div className="section text-ink">
      <motion.div
        {...(reduce ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } })}
        className="mx-auto max-w-2xl"
      >
        <h1 className="text-5xl md:text-7xl">{t("home.contact.title")}</h1>
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
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div>
            <h2 className="text-xl">{t("contact.whatsappPromo.title")}</h2>
            <p className="text-muted">{t("contact.whatsappPromo.text")}</p>
          </div>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn">
            WhatsApp <span aria-hidden="true">↗</span>
          </a>
        </div>
      </motion.div>
    </div>
  )
}

export default ContactPage
