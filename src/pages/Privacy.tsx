import React from "react"
import { useDocumentMeta } from "../lib/seo"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"

const Privacy: React.FC = () => {
  const { t } = useTranslation()
  useDocumentMeta({ title: t("seo.privacy.title"), description: t("seo.privacy.description") })
  const data = t("privacy.data", { returnObjects: true }) as string[]

  const h2 = "mt-10 text-3xl text-ink"
  const li = "list-disc ml-5"

  return (
    <div className="section max-w-3xl text-ink">
      <p className="eyebrow">{t("privacy.eyebrow")}</p>
      <h1 className="mt-2 text-balance text-5xl md:text-6xl">
        {t("privacy.title")}
      </h1>
      <p className="mt-4 text-muted">{t("privacy.intro")}</p>

      <h2 className={h2}>{t("privacy.dataTitle")}</h2>
      <ul className="mt-3 space-y-1 text-muted">
        {data.map((item) => (
          <li key={item} className={li}>{item}</li>
        ))}
      </ul>

      <h2 className={h2}>{t("privacy.purposeTitle")}</h2>
      <p className="mt-3 text-muted">{t("privacy.purpose")}</p>

      <h2 className={h2}>{t("privacy.retentionTitle")}</h2>
      <p className="mt-3 text-muted">{t("privacy.retention")}</p>

      <h2 className={h2}>{t("privacy.geoTitle")}</h2>
      <p className="mt-3 text-muted">
        <a
          href="https://db-ip.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:bg-ink hover:text-paper"
        >
          {t("privacy.geoLink")}
        </a>
        {t("privacy.geoAfter")}
      </p>

      <h2 className={h2}>{t("privacy.rightsTitle")}</h2>
      <p className="mt-3 text-muted">
        {t("privacy.rightsBefore")}
        <Link to="/#contacto" className="underline underline-offset-4 hover:bg-ink hover:text-paper">
          {t("privacy.rightsLink")}
        </Link>
        {t("privacy.rightsAfter")}
      </p>
    </div>
  )
}

export default Privacy
