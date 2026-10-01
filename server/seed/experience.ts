import type { SeedExperience } from '../validate.ts'

const BASE: Omit<SeedExperience, 'i18n'>[] = [
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
    link: null,
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
    link: null,
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
    date: "Noviembre 2023 - Marzo 2024",
    title: "Desarrollador Fullstack - Proyecto Eye Tracking",
    role: "Desarrollador FullStack",
    company: "Proyecto académico · Eye Tracking",
    summary:
      "App de seguimiento ocular con visualización de datos en tiempo real y carga masiva desde Excel.",
    stack: ["Django", "React", "Python", "JWT"],
    description:
      "Aplicación web de seguimiento ocular interactivo desarrollada con Django y React.js. Visualización de datos en gráficos y videos en tiempo real, gestión de grandes volúmenes de datos importados desde archivos Excel hacia la base de datos, y autenticación JWT con encriptación para la protección de la información.",
    link: null,
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
    link: null,
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
    link: null,
  },
]

type ExperienceEn = NonNullable<SeedExperience['i18n']['en']>

const EXPERIENCE_EN: Record<string, ExperienceEn> = {
  'Desarrollador de Software FullStack - fuldei - Corprevenir': {
    date: 'April 2026 - Present',
    title: 'FullStack Software Developer - fuldei - Corprevenir',
    role: 'FullStack Developer',
    summary: 'Fullstack web apps and analytics modules with Excel reports and secure JWT-based APIs.',
    description: 'Design and development of fullstack web applications with React, TypeScript and TailwindCSS. Implementation of backend services in Node.js and Express, with PostgreSQL data modeling using Prisma ORM. Management of complex state through the Context API and custom hooks. Development of analytics modules with dynamic Excel report generation (ExcelJS) and data visualization. Integration of secure REST APIs with JWT authentication and schema validation with Joi. Application of clean architecture principles, centralized error handling and SQL query optimization. Work under agile methodologies (SCRUM) and version control with Git/Bitbucket, ensuring quality, traceability and continuous improvement.',
  },
  'Desarrollador de Software FullStack - Unlimitech Cloud': {
    date: 'July 2025 - March 2026',
    title: 'FullStack Software Developer - Unlimitech Cloud',
    role: 'FullStack Developer',
    summary: 'Frontend with React/MobX and backend in Node.js, PHP and WordPress (plugins and APIs).',
    description: 'Development and maintenance of frontend features with React and MobX. Implementation of backend services in Node.js, PHP and WordPress (themes, plugins, APIs). Integration of REST APIs, management of complex state, work with databases (MySQL, PostgreSQL, MongoDB) and support with infrastructure and deployment. Use of Git and SCRUM agile methodologies to ensure software quality.',
  },
  'Desarrollador de Software FullStack - GS PRO MASTER MOVING': {
    date: 'March 2025 - June 2025',
    title: 'FullStack Software Developer - GS PRO MASTER MOVING',
    role: 'FullStack Developer',
    summary: 'RESTful APIs with Django and DDD, JWT authentication and deployment on DigitalOcean.',
    description: 'Full Stack developer with experience in Python/Django for the backend and JavaScript/Tailwind CSS on the frontend. Implementation of RESTful APIs applying Domain-Driven Design (DDD), JWT authentication and MySQL persistence. Deployment on DigitalOcean, using Spaces (S3-compatible) for file storage. Design of responsive interfaces and automated documentation with DRF Spectacular.',
  },
  'Contratista Desarrollador en Comercializadora la rocka SAS.': {
    date: 'November 2024 - December 2025',
    title: 'Contract Developer at Comercializadora la rocka SAS.',
    role: 'Developer · Automation',
    summary: 'Automation of manual processes with Python, OCR and Excel report generation.',
    description: 'Automation of manual processes using Python, OpenCV, OCR (tesseract), OpenPyXL and Pandas. Report generation from Excel files. GUI with Tkinter for better usability.',
  },
  'Practicante Desarrollador de Software - SENA Sennova': {
    date: 'August 2024 - January 2025',
    title: 'Software Developer Intern - SENA Sennova',
    role: 'Developer Intern',
    summary: 'Scheduling system (React/Node) and QR attendance tracking deployed on a VPS.',
    description: 'Scheduling system developed with React.js and Node.js for CámaraStudio. Attendance automation was implemented with Python, using QR codes, Django and Pandas. The system was deployed on a VPS running Debian, using Nginx to serve static files and Gunicorn as the application server.',
  },
  'Practicante Desarrollador de Software - Accedo Technologies': {
    date: 'April 2024 - June 2024',
    title: 'Software Developer Intern - Accedo Technologies',
    role: 'Developer Intern',
    summary: 'Simulated store with authentication, Laravel migrations and DataTables with Vue.js.',
    description: 'PHP, Laravel, migrations, entities and DataTables with Vue.js. Store simulation with authentication and a database.',
  },
  'Desarrollador Fullstack - Proyecto Eye Tracking': {
    date: 'November 2023 - March 2024',
    title: 'Fullstack Developer - Eye Tracking Project',
    role: 'FullStack Developer',
    summary: 'Eye tracking app with real-time data visualization and bulk loading from Excel.',
    description: 'Interactive eye tracking web application built with Django and React.js. Visualization of data in charts and real-time videos, management of large volumes of data imported from Excel files into the database, and JWT authentication with encryption to protect the information.',
  },
  'Desarrollador Backend - Contratista ICA': {
    date: 'December 2023',
    title: 'Backend Developer - ICA Contractor',
    role: 'Backend Developer',
    summary: 'Event attendance registration, contact aggregation and QR scanning.',
    description: 'Collaboration on event attendance registration, contact aggregation and QR scanning.',
  },
  'Desarrollador en Isilab Foundation': {
    date: 'April 2021',
    title: 'Developer at Isilab Foundation',
    role: 'Developer',
    summary: 'Logic and math games for children with cognitive disabilities.',
    description: 'Development of logic and math games for children with cognitive disabilities.',
  },
}

export const EXPERIENCE_SEED: SeedExperience[] = BASE.map((e) => ({ ...e, i18n: { en: EXPERIENCE_EN[e.title] ?? {} } }))
