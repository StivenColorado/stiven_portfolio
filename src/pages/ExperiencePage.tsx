import React from "react"
import { useTranslation } from "react-i18next"
import ExperienceTimeline from "../components/ExperienceItemTimeline"
import { useDocumentMeta } from "../lib/seo"

const ExperiencePage: React.FC = () => {
  const { t } = useTranslation()
  useDocumentMeta({ title: t("seo.experience.title"), description: t("seo.experience.description") })
  return (
    <div className="dither">
      <div data-slot="g" className="mx-auto h-40 max-w-3xl md:hidden" aria-hidden="true" />
      <ExperienceTimeline />
    </div>
  )
}

export default ExperiencePage
