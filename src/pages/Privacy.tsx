import React from "react"
import { useDocumentMeta } from "../lib/seo"
import { Link } from "react-router"

const Privacy: React.FC = () => {
  useDocumentMeta({
    title: "Aviso de privacidad | Stiven Colorado",
    description:
      "Qué datos de navegación se recogen en este sitio, para qué, por cuánto tiempo y cómo ejercer tus derechos (Ley 1581 de 2012).",
  })

  const h2 = "mt-10 text-3xl text-ink"
  const li = "list-disc ml-5"

  return (
    <div className="section max-w-3xl text-ink">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-balance text-5xl md:text-6xl">
        Aviso de privacidad
      </h1>
      <p className="mt-4 text-muted">
        Este aviso se emite en cumplimiento de la Ley 1581 de 2012 de Colombia sobre protección de
        datos personales. No usamos cookies de seguimiento ni mostramos banner de cookies.
      </p>

      <h2 className={h2}>Qué datos se recogen</h2>
      <ul className="mt-3 space-y-1 text-muted">
        <li className={li}>Dirección IP.</li>
        <li className={li}>País y ciudad aproximados, deducidos de la IP.</li>
        <li className={li}>Sistema operativo y tipo de dispositivo.</li>
        <li className={li}>Navegador (user agent).</li>
        <li className={li}>Ruta visitada y referrer.</li>
        <li className={li}>Fecha y hora de la visita.</li>
      </ul>

      <h2 className={h2}>Finalidad</h2>
      <p className="mt-3 text-muted">
        Estos datos se usan únicamente para estadísticas de tráfico del sitio.
      </p>

      <h2 className={h2}>Retención y terceros</h2>
      <p className="mt-3 text-muted">
        Los registros se conservan 30 días y luego se eliminan. No se comparten ni se venden a
        terceros. Respetamos la señal Global Privacy Control: si tu navegador la envía, no se
        registra tu visita.
      </p>

      <h2 className={h2}>Geolocalización</h2>
      <p className="mt-3 text-muted">
        <a
          href="https://db-ip.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:bg-ink hover:text-paper"
        >
          IP Geolocation by DB-IP
        </a>
        . La consulta se hace localmente sobre una base de datos descargada; tu IP no se envía a
        ningún servicio externo.
      </p>

      <h2 className={h2}>Tus derechos</h2>
      <p className="mt-3 text-muted">
        Como titular puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos, o
        revocar la autorización. Para ejercer estos derechos escríbeme desde el{" "}
        <Link to="/#contacto" className="underline underline-offset-4 hover:bg-ink hover:text-paper">
          formulario de contacto
        </Link>
        .
      </p>
    </div>
  )
}

export default Privacy
