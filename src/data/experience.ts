export interface ExperienceItemType {
  date: string
  title: string
  /** Cargo corto para la vista compacta (ej. "Desarrollador FullStack"). */
  role?: string
  /** Empresa para la vista compacta. */
  company?: string
  /** Resumen de una línea, pensado para escaneo rápido. */
  summary?: string
  /** Tecnologías clave (3-5) que se muestran como chips. */
  stack?: string[]
  /** Descripción completa, visible solo en el detalle. */
  description: string
  link: string
  contact?: string
}

export const EXPERIENCE: ExperienceItemType[] = [
  {
    date: "Abril 2026 - Actualmente",
    title: "Desarrollador de Software FullStack - fuldei - Corprevenir",
    role: "Desarrollador FullStack",
    company: "Fuldei · Corprevenir",
    summary:
      "Apps web fullstack y módulos analíticos con reportes en Excel y APIs seguras con JWT.",
    stack: ["React", "TypeScript", "Node.js", "PostgreSQL", "Prisma"],
    description:
      "Diseño y desarrollo de aplicaciones web fullstack con React, TypeScript y TailwindCSS. Implementación de servicios backend en Node.js y Express, con modelado de bases de datos PostgreSQL usando Prisma ORM. Gestión de estados complejos mediante Context API y hooks personalizados. Desarrollo de módulos analíticos con generación dinámica de reportes en Excel (ExcelJS) y visualización de datos. Integración de APIs REST seguras con autenticación JWT y validación de esquemas con Joi. Aplicación de principios de arquitectura limpia, manejo centralizado de errores y optimización de consultas SQL. Trabajo bajo metodologías ágiles (SCRUM) y control de versiones con Git/Bitbucket, asegurando calidad, trazabilidad y mejora continua.",
    link: "https://www.corprevenir.com/",
  },
  {
    date: "Julio 2025 - marzo 2026",
    title: "Desarrollador de Software FullStack - Unlimitech Cloud",
    role: "Desarrollador FullStack",
    company: "Unlimitech Cloud",
    summary:
      "Frontend con React/MobX y backend en Node.js, PHP y WordPress (plugins y APIs).",
    stack: ["React", "MobX", "Node.js", "PHP", "WordPress"],
    description:
      "Desarrollo y mantenimiento de funcionalidades frontend con React y MobX. Implementación de servicios backend en Node.js, PHP y WordPress (temas, plugins, APIs). Integración de APIs REST, manejo de estados complejos, trabajo con bases de datos (MySQL, PostgreSQL, MongoDB) y apoyo en infraestructura y despliegue. Uso de Git y metodologías ágiles SCRUM para garantizar la calidad del software.",
    link: "https://unlimitech.cloud/",
  },
  {
    date: "Marzo 2025 - Junio 2025",
    title: "Desarrollador de Software FullStack - GS PRO MASTER MOVING",
    role: "Desarrollador FullStack",
    company: "GS Pro Master Moving",
    summary:
      "APIs RESTful con Django y DDD, autenticación JWT y despliegue en DigitalOcean.",
    stack: ["Python", "Django", "MySQL", "Tailwind"],
    description:
      "Desarrollador Full Stack con experiencia en Python/Django para el backend y JavaScript/Tailwind CSS en el frontend. Implementación de APIs RESTful aplicando Domain-Driven Design (DDD), autenticación con JWT y persistencia en MySQL. Despliegue en DigitalOcean, utilizando Spaces (compatibles con S3) para almacenamiento de archivos. Diseño de interfaces responsivas y documentación automatizada con DRF Spectacular.",
    link: "https://www.gs-pro-master-moving.com/",
  },
  {
    date: "Noviembre 2024 - Diciembre 2025",
    title: "Contratista Desarrollador en Comercializadora la rocka SAS.",
    role: "Desarrollador · Automatización",
    company: "Comercializadora La Rocka SAS",
    summary:
      "Automatización de procesos manuales con Python, OCR y generación de informes en Excel.",
    stack: ["Python", "OpenCV", "OCR", "Pandas"],
    description:
      "Automatización de procesos manuales mediante Python, OpenCV, OCR (tesseract), OpenPyXL y Pandas. Generación de informes desde archivos Excel. GUI con Tkinter para mejor usabilidad.",
    link: "#",
    contact: "+57 324 2818821",
  },
  {
    date: "Agosto 2024 - Enero 2025",
    title: "Practicante Desarrollador de Software - SENA Sennova",
    role: "Practicante Desarrollador",
    company: "SENA · Sennova",
    summary:
      "Sistema de agendamiento (React/Node) y asistencia por QR desplegado en VPS.",
    stack: ["React", "Node.js", "Python", "Django"],
    description:
      "Sistema de agendamiento desarrollado con React.js y Node.js para CámaraStudio. Se implementó automatización de asistencias mediante Python, utilizando códigos QR, Django y Pandas. El sistema fue desplegado en un VPS con Debian como sistema operativo, utilizando Nginx para servir archivos estáticos y Gunicorn como servidor de aplicaciones.",
    link: "#",
  },
  {
    date: "Abril 2024 - Junio 2024",
    title: "Practicante Desarrollador de Software - Accedo Technologies",
    role: "Practicante Desarrollador",
    company: "Accedo Technologies",
    summary:
      "Tienda simulada con autenticación, migraciones en Laravel y DataTables con Vue.js.",
    stack: ["PHP", "Laravel", "Vue.js"],
    description:
      "PHP, Laravel, migraciones, entidades y DataTables con Vue.js. Simulación de tienda con autenticación y base de datos.",
    link: "https://www.linkedin.com/company/accedo-technologies/",
  },
  {
    date: "Diciembre 2023",
    title: "Desarrollador Backend - Contratista ICA",
    role: "Desarrollador Backend",
    company: "Contratista ICA",
    summary:
      "Registro de asistencia a eventos, agregación de contactos y lectura de QR.",
    stack: ["Backend", "QR"],
    description:
      "Colaboración en registro de asistencia de eventos, agregación de contactos y lectura de QR.",
    link: "#",
    contact: "+57 317 5404432",
  },
  {
    date: "Abril 2021",
    title: "Desarrollador en Isilab Foundation",
    role: "Desarrollador",
    company: "Isilab Foundation",
    summary:
      "Juegos lógico-matemáticos para niños con discapacidades cognitivas.",
    stack: ["Game Dev"],
    description:
      "Desarrollo de juegos lógico-matemáticos para niños con discapacidades cognitivas.",
    link: "#",
  },
]
