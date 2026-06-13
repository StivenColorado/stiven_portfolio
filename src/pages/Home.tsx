import React from "react"
import { motion } from "framer-motion"
import EmblaCarousel from "../components/EmblaCarousel"
import ExperienceTimeline from "../components/ExperienceItemTimeline"
import ContactForm from "../components/ContactForm"

const Home: React.FC = () => {
  return (
    <div className="min-h-screen  py-16 px-4 sm:px-6 lg:px-8 select-none">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto text-center mb-20"
      >
        <span className="inline-block font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300 border-2 border-zinc-900 dark:border-zinc-100 rounded-md px-3 py-1 mb-6">
          // Full Stack Developer
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6">
          Hola, soy Stiven <span className="inline-block">👋</span>
        </h1>
        <p className="text-xl sm:text-2xl text-zinc-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Desarrollador Full Stack apasionado por crear experiencias digitales excepcionales
        </p>

        {/* Quick links estilo retro (cajas con borde y flecha) */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {[
            { label: "Proyectos", href: "/projects" },
            { label: "Acerca", href: "/about" },
            { label: "Contacto", href: "#contacto" },
            { label: "GitHub", href: "https://github.com/StivenColorado", external: true },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex items-center justify-between gap-2 border-2 border-zinc-900 dark:border-zinc-100 rounded-md px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-white/60 dark:bg-white/5 backdrop-blur-sm transition-all hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 hover:-translate-y-0.5"
            >
              {l.label}
              <span className="font-mono transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
            </a>
          ))}
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="mb-24"
      >
        <ExperienceTimeline />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-7xl mx-auto mb-20"
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Proyectos Destacados
          </h2>
          <div className="mt-3 h-1 w-20 bg-zinc-900 dark:bg-zinc-100 mx-auto" />
        </div>
        <EmblaCarousel />
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="text-center mt-8 mb-24"
      >
        <a
          href="/projects"
          className="inline-flex items-center gap-2 border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 px-8 rounded-md transition-all duration-200 hover:bg-transparent hover:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100 shadow-[4px_4px_0_0_#18181b] dark:shadow-[4px_4px_0_0_#fafafa] hover:-translate-x-0.5 hover:-translate-y-0.5"
        >
          Ver Todos los Proyectos <span className="font-mono">→</span>
        </a>
      </motion.div>

      {/* Sección de contacto */}
      <motion.section
        id="contacto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3">
            Hablemos
          </h2>
          <div className="h-1 w-20 bg-zinc-900 dark:bg-zinc-100 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-gray-300">
            ¿Tienes un proyecto en mente? Escríbeme y te respondo a tu correo.
          </p>
        </div>
        <div className="rounded-lg border-2 border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900/80 backdrop-blur-sm p-6 sm:p-8 shadow-[6px_6px_0_0_#18181b] dark:shadow-[6px_6px_0_0_#fafafa]">
          <ContactForm />
        </div>
      </motion.section>
    </div>
  )
}

export default Home
