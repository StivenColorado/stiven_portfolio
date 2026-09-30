import React from "react"
import { Link } from "react-router"
import { motion, useReducedMotion } from "framer-motion"
import GithubIcon from "../components/icons/Github"
import LinkedinIcon from "../components/icons/Linkedin"
import { useDocumentMeta } from "../lib/seo"

const backendNotes: Record<string, string> = {
    Python: 'FastAPI, Django, asincronía, typing, testing (pytest).',
    PHP: 'Laravel (Eloquent, Queues, Events), Composer, PSR-12.',
    'Node.js': 'Express/NestJS, middlewares, streams, PM2.',
    Django: 'DRF, ORM avanzado, signals, admin, config por entornos.',
    MySQL: 'Índices, EXPLAIN, migraciones, transacciones y locks.',
    MongoDB: 'Agregaciones, índices compuestos, TTL, diseño de esquemas.',
    'RESTful APIs': 'Versionado, paginación, validación, OpenAPI/Swagger.',
    JWT: 'Auth stateless, refresh, rotación segura, expiración.',
    OAuth: 'Authorization Code/PKCE, scopes, permisos granulares.',
    AWS: 'IAM, CloudWatch, costos, mejores prácticas de seguridad.',
    S3: 'Multipart upload, políticas de acceso, pre-signed URLs, lifecycle, Conciliate S3.',
    'API Gateway': 'Diseño de APIs con etapas y despliegues, rate limiting, API keys, autorizadores (JWT/Lambda), integración con Lambda/ALB.',
    DynamoDB: 'Modelado single-table, particiones/throughput, GSIs/LSIs, streams, patrones de acceso y consultas eficientes.',
    'EC2 - EBS': 'Provisionamiento, SG, volúmenes, backups, escalabilidad.',
    Redis: 'Caches, locks distribuidos, pub/sub, expiración y eviction.',
    Docker: 'Dockerfiles multi-stage, compose, optimización de layers.',
    Git: 'Git flow, Branching, PRs, code review, tagging y releases.',
    Vps: 'Nginx/Apache, SSL Let’s Encrypt, deploys y CI/CD básico.'
};

const STACKS: { title: string; items: string[] }[] = [
  { title: "Stack frontend", items: ['JavaScript', 'TypeScript', 'React', 'React Native', 'TailwindCSS', 'MobX', 'Redux', 'HTML5', 'CSS3'] },
  { title: "Arquitectura y patrones", items: ['Patrones de Diseño', 'Principios SOLID', 'Domain-Driven Design (DDD)', 'Arquitectura Hexagonal', 'Arquitectura de Software', 'Levantamiento de Información', 'Análisis de Requerimientos', 'Patron Backend for Frontend', 'IaC'] },
  { title: "Habilidades blandas", items: ['Trabajo en Equipo', 'Comunicación Efectiva', 'Resolución de Problemas', 'Pensamiento Analítico', 'Adaptabilidad', 'Liderazgo', 'Gestión del Tiempo', 'Atención al Detalle', 'Aprendizaje Continuo'] },
]

const Chip: React.FC<{ children: string }> = ({ children }) => (
  <span className="tag !px-3 !py-1 !text-sm">{children}</span>
)

const About: React.FC = () => {
  const reduce = useReducedMotion()
  useDocumentMeta({
    title: "Acerca de | Stiven Colorado",
    description:
      "Analista y desarrollador full-stack en Colombia: arquitectura limpia, APIs, cloud y experiencias web.",
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
    <div className="section text-ink">
      <div data-slot="g" className="h-[40svh] md:hidden" aria-hidden="true" />
      <motion.div {...reveal}>
        <p className="eyebrow">Acerca de mí</p>
        <h1 className="mt-2 text-balance text-5xl md:text-7xl">
          Hola, soy Stiven Colorado
        </h1>
      </motion.div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <motion.div {...reveal} className="space-y-4 lg:order-1">
          <p>
            Soy analista y desarrollador de software con sólida experiencia en desarrollo Full Stack,
            utilizando tecnologías como Python, PHP, JavaScript, TailwindCSS y Node.js.
          </p>
          <p>
            He trabajado implementando arquitecturas limpias como Domain-Driven Design (DDD) y
            Hexagonal, organizando proyectos por dominios, controladores, repositorios, servicios y
            adaptadores, lo que garantiza mantenibilidad y escalabilidad.
          </p>
          <p>
            Tengo experiencia desarrollando APIs RESTful, integración con JWT, CORS, y configuraciones
            avanzadas en Django con bases de datos MySQL y almacenamiento de archivos en local y en la
            nube (S3).
          </p>
          <p>
            En frontend, manejo ReactJS - React Native, integrando Redux/mobX para la gestión de
            estados, creando hooks personalizados para centralizar peticiones HTTP y optimizando la
            experiencia del usuario.
          </p>
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
              Hablemos
            </Link>
          </div>
        </motion.div>

        <motion.div {...reveal} className="mx-auto w-full max-w-xs lg:order-2">
          <img
            src="/pic.webp"
            alt="Stiven Colorado"
            width={480}
            height={640}
            className="aspect-[3/4] w-full border-[length:var(--line)] border-ink object-cover object-top shadow-hard"
          />
        </motion.div>
      </div>

      <motion.div {...reveal} className="mt-16">
        <h2 className="text-3xl">Stack backend</h2>
        <div className="window mt-6">
          <div className="window-bar">
            <span className="window-dot" aria-hidden="true" />
            <span className="window-dot" aria-hidden="true" />
            <span className="flex-1 truncate text-center">stack.backend</span>
          </div>
        <dl className="window-body grid gap-x-8 gap-y-3 font-mono text-sm md:grid-cols-2">
          {Object.entries(backendNotes).map(([name, note]) => (
            <div key={name}>
              <dt className="font-black underline decoration-2 underline-offset-2">{name}</dt>
              <dd className="text-muted">{note}</dd>
            </div>
          ))}
        </dl>
        </div>
      </motion.div>

      {STACKS.map((group) => (
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
