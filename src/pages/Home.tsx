import React from "react"
import { Link } from "react-router"
import { motion, useReducedMotion } from "framer-motion"
import EmblaCarousel from "../components/EmblaCarousel"
import ExperienceTimeline from "../components/ExperienceItemTimeline"
import ContactForm from "../components/ContactForm"
import Services from "../components/Services"
import { useDocumentMeta } from "../lib/seo"

const Home: React.FC = () => {
  const reduce = useReducedMotion()
  useDocumentMeta({
    title: "Stiven Colorado | Software a medida, IA y seguridad",
    description:
      "Desarrollador full-stack en Colombia. Software a medida, inteligencia artificial y seguridad para pymes y grandes empresas.",
  })

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
            Hola.
            <br />
            Soy Stiven.
          </h1>
          <p className="mt-4 max-w-md text-lg leading-snug">
            Software a medida, IA y seguridad para tu empresa.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <a href="#servicios" className="btn">
              Ver servicios
            </a>
          </div>
        </motion.div>

        <div className="mt-10 md:mt-14">
          <h2 className="mb-3 text-lg leading-none">Quick links</h2>
          <nav aria-label="Accesos rápidos" className="quicklinks">
            <a href="#servicios" className="quicklink">Servicios</a>
            <a href="#proyectos" className="quicklink">Proyectos</a>
            <Link to="/about" className="quicklink">Acerca</Link>
            <a href="#contacto" className="quicklink">Contacto</a>
          </nav>
        </div>
      </section>

      <div className="divider" />
      <Services />
      <div className="divider" />

      <section id="proyectos" data-scene="projects" className="section scroll-mt-10">
        <motion.div {...reveal}>
          <h2 className="text-4xl md:text-5xl">Projects</h2>
          <p className="mt-3 max-w-xl text-muted">Proyectos destacados, incluidos trabajos para clientes bajo acuerdos de confidencialidad.</p>
          <div className="mt-6">
            <EmblaCarousel />
          </div>
          <div data-slot="k" className="h-36 md:hidden" aria-hidden="true" />
          <div className="mt-8 text-center">
            <Link to="/projects" className="btn">
              Ver todos los proyectos <span className="font-mono">→</span>
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
          <h2 className="text-4xl md:text-5xl">Hablemos</h2>
          <p className="mt-3 text-muted">
            ¿Tienes un proyecto en mente? Escríbeme y te respondo a tu correo.
          </p>
          <div data-slot="l" className="h-36 md:hidden" aria-hidden="true" />
          <div className="window mt-8">
            <div className="window-bar">
              <span className="window-dot" aria-hidden="true" />
              <span className="window-dot" aria-hidden="true" />
              <span className="flex-1 truncate text-center">contacto.form</span>
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
