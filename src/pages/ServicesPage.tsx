import React from "react"
import { useTranslation } from "react-i18next"
import Services from "../components/Services"
import { useDocumentMeta } from "../lib/seo"

const ServicesPage: React.FC = () => {
  const { t } = useTranslation()
  useDocumentMeta({ title: t("seo.services.title"), description: t("seo.services.description") })
  return <Services />
}

export default ServicesPage
