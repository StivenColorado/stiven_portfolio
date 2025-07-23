export interface ExperienceItemType {
  date: string
  title: string
  description: string
  link: string
  contact?: string
}

export const EXPERIENCE: ExperienceItemType[] = [
  {
    date: "Julio 2025 - Actualmente",
    title: "Desarrollador de Software FullStack - Unlimitech Cloud",
    description:
      "Desarrollo y mantenimiento de funcionalidades frontend con React y MobX. Implementación de servicios backend en Node.js, PHP y WordPress (temas, plugins, APIs). Integración de APIs REST, manejo de estados complejos, trabajo con bases de datos (MySQL, PostgreSQL, MongoDB) y apoyo en infraestructura y despliegue. Uso de Git y metodologías ágiles SCRUM para garantizar la calidad del software.",
    link: "https://unlimitech.cloud/",
  }
  ,
  {
    date: "Marzo 2025 - Junio 2025",
    title: "Desarrollador de Software FullStack - GS PRO MASTER MOVING",
    description: "Desarrollador Full Stack con experiencia en Python/Django para el backend y JavaScript/Tailwind CSS en el frontend. Implementación de APIs RESTful aplicando Domain-Driven Design (DDD), autenticación con JWT y persistencia en MySQL. Despliegue en DigitalOcean, utilizando Spaces (compatibles con S3) para almacenamiento de archivos. Diseño de interfaces responsivas y documentación automatizada con DRF Spectacular.",
    link: "https://www.gs-pro-master-moving.com/",
  },
  {
    date: "Noviembre 2024 - Diciembre 2025",
    title: "Contratista Desarrollador en Comercializadora la rocka SAS.",
    description:
      "Automatización de procesos manuales mediante Python, OpenCV, OCR (tesseract), OpenPyXL y Pandas. Generación de informes desde archivos Excel. GUI con Tkinter para mejor usabilidad.",
    link: "#",
    contact: "+57 324 2818821",
  },
  {
    date: "Agosto 2024 - Enero 2025",
    title: "Practicante Desarrollador de Software - SENA Sennova",
    description:
      "Sistema de agendamiento desarrollado con React.js y Node.js para CámaraStudio. Se implementó automatización de asistencias mediante Python, utilizando códigos QR, Django y Pandas. El sistema fue desplegado en un VPS con Debian como sistema operativo, utilizando Nginx para servir archivos estáticos y Gunicorn como servidor de aplicaciones."
    ,
    link: "#",
  },
  {
    date: "Abril 2024 - Junio 2024",
    title: "Practicante Desarrollador de Software - Accedo Technologies",
    description:
      "PHP, Laravel, migraciones, entidades y DataTables con Vue.js. Simulación de tienda con autenticación y base de datos.",
    link: "https://www.linkedin.com/company/accedo-technologies/",
  },
  {
    date: "Diciembre 2023",
    title: "Desarrollador Backend - Contratista ICA",
    description:
      "Colaboración en registro de asistencia de eventos, agregación de contactos y lectura de QR.",
    link: "#",
    contact: "+57 317 5404432",
  },
  {
    date: "Abril 2021",
    title: "Desarrollador en Isilab Foundation",
    description:
      "Desarrollo de juegos lógico-matemáticos para niños con discapacidades cognitivas.",
    link: "#",
  },
]
