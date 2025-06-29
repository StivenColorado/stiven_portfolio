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
    link: "#",
  }
  ,
  {
    date: "Marzo 2025 - Junio 2025",
    title: "Desarrollador de Software FullStack - GS PRO MASTER MOVING",
    description:
      "Desarrollador Full Stack con enfoque en Python/Django para backend y JavaScript/Tailwind en frontend. APIs REST con DDD, JWT, MySQL y S3. Diseño de interfaces responsivas y documentación con DRF Spectacular.",
    link: "#",
  },
  {
    date: "Noviembre 2024 - Diciembre 2025",
    title: "Contratista Desarrollador en Comercializadora la rocka SAS.",
    description:
      "Automatización de procesos manuales mediante Python, OpenCV, OpenPyXL y Pandas. Generación de informes desde archivos Excel. GUI con Tkinter para mejor usabilidad.",
    link: "#",
    contact: "+57 324 2818821",
  },
  {
    date: "Agosto 2024 - Enero 2025",
    title: "Practicante Desarrollador de Software - SENA Sennova",
    description:
      "Sistema de agendamiento con React.js y NodeJs para CámaraStudio. Automatización de asistencias con Python, QR, Django y Pandas.",
    link: "#",
  },
  {
    date: "Abril 2024 - Junio 2024",
    title: "Practicante Desarrollador de Software - Accedo Technologies",
    description:
      "PHP, Laravel, migraciones, entidades y DataTables con Vue.js. Simulación de tienda con autenticación y base de datos.",
    link: "#",
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
