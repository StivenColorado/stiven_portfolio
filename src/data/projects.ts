import { TAGS } from "./tags"
import type { ProjectType } from "../types/types"

export const PROJECTS: ProjectType[] = [
  {
    title: "App generador de códigos QR",
    description:
      "Desarrollé un generador de códigos QR ilimitados con Astro y Node.js: procesamiento en tiempo real, almacenamiento en MySQL, interfaz responsiva con Tailwind CSS, opciones de personalización de color y logo, y exportación en múltiples formatos sin anuncios.",
    link: "",
    github: "",
    images: [
      "/projects/qrcodegenerator/qrcode1.png",
      "/projects/qrcodegenerator/qrcode2.png",
    ],
    videos: [],
    tags: [TAGS.ASTRO, TAGS.NODEJS, TAGS.MYSQL, TAGS.TAILWIND],
  },
  {
    title: "Foro económico Palmira",
    description:
      "Implementé un sistema en Django para envíos masivos de correos con QR para registro de asistentes, gestión de inscripciones y generación automática de reportes en EXCEL, con diseño responsive usando Tailwind CSS y base de datos MySQL.",
    link: "",
    github: "",
    images: [
      "/projects/foroeconomico/foro1.png",
      "/projects/foroeconomico/foro2.png",
      "/projects/foroeconomico/foro3.png",
    ],
    videos: [],
    tags: [TAGS.PYTHON, TAGS.DJANGO, TAGS.MYSQL, TAGS.TAILWIND],
    gist: "https://gist.github.com/StivenColorado/ad53b430f65e8fbcbed1cb64283b15dc"
  },
  {
    title: "EmprendeAgenda",
    description:
      "Desarrollé un sistema de agendamiento en PHP con MySQL y Tailwind CSS para la Cámara de Comercio de Palmira, incluyendo CRUD de citas, validación de disponibilidad, panel de administración intuitivo.",
    link: "",
    github: "",
    images: [
      "/projects/emprendeagenda/agenda1.png",
      "/projects/emprendeagenda/agenda2.png",
      "/projects/emprendeagenda/agenda3.png",
    ],
    videos: [],
    tags: [TAGS.PHP, TAGS.TAILWIND, TAGS.MYSQL],
    gist: "https://gist.github.com/StivenColorado/46e56e4562cf6a694b67652b9ec8f5ee"
  },
  {
    title: "SAAD - Eye Tracking",
    description:
      "Automatización de migración de millones de registros con Python y Django: procesamiento en batch de archivos Excel con Pandas, almacenamiento eficiente en MySQL, y panel interactivo en JavaScript para análisis y visualización de datos de Eye Tracking en tiempo récord.",
    link: "",
    github: "https://github.com/StivenColorado/eyetracking",
    images: [
      "/projects/eyetracking/eyetracking_mockup.webp",
      "/projects/eyetracking/eyetracking_p2.webp",
      "/projects/eyetracking/eyetracking_p3.webp",
    ],
    videos: ["/projects/eyetracking/eyetrackingVideo.mp4"],
    tags: [TAGS.PYTHON, TAGS.DJANGO, TAGS.JAVASCRIPT, TAGS.CSS],
    gist: "https://gist.github.com/StivenColorado/ffa97ea66f19877153ee914d700ae9c3.js"
  },
  {
    title: "Simulación tienda de sacos",
    description:
      "Creé una tienda online simulada en PHP y JavaScript para venta de sacos, con catálogo dinámico, carrito de compras, simulación de pasarela de pago y diseño responsive en HTML/CSS.",
    link: "",
    github: "https://github.com/StivenColorado/jackets_online_store",
    images: [
      "/projects/jacket/jacket_p3.png",
      "/projects/jacket/jacket_p1.png",
      "/projects/jacket/jacket_p2.png",
      "/projects/jacket/jacket_p4.png",
      "/projects/jacket/jacket_p5.png",
    ],
    videos: [],
    tags: [TAGS.PHP, TAGS.JAVASCRIPT, TAGS.HTML, TAGS.CSS],
  },
  {
    title: "Pokémon API Consumer",
    description:
      "Desarrollé un cliente en Astro y JavaScript para consumir la PokéAPI: autenticación, paginación, filtrado por tipo y detalles, cache local con IndexedDB y diseño modular en PHP y Tailwind CSS.",
    link: "https://pokemon-api-consumer.vercel.app/",
    github: "https://github.com/StivenColorado/pokemon-api-consumer",
    images: [
      "/projects/pokemon/pokemon_p4.webp",
      "/projects/pokemon/pokemon_p1.webp",
      "/projects/pokemon/pokemon_p2.webp",
      "/projects/pokemon/pokemon_p3.webp",
    ],
    videos: [],
    tags: [TAGS.PHP, TAGS.JAVASCRIPT, TAGS.TAILWIND, TAGS.ASTRO],
  },
  {
    title: "Banco de proyectos Soft-PAC",
    description:
      "Implementé una plataforma en Astro y PHP para vincular proyectos del SENA Palmira: gestión de proyectos, roles de usuario, búsqueda avanzada, subida de documentos y diseño responsive con Tailwind CSS.",
    link: "",
    github: "https://github.com/frankalessandro/Soft_PAC",
    images: [
      "/projects/pac/pac_2.webp",
      "/projects/pac/pac.webp",
      "/projects/pac/pac_3.webp",
    ],
    videos: [],
    tags: [TAGS.PHP, TAGS.JAVASCRIPT, TAGS.TAILWIND, TAGS.ASTRO],
  },
  {
    title: "Vector Randy (Building)",
    description:
      "Desarrollé una PWA mobile-first en React y Node.js para mostrar obras de arte vectorial: galería interactiva, filtros dinámicos, navegación offline y estilos con SASS.",
    link: "https://vector-randy.vercel.app",
    github: "https://github.com/StivenColorado/vector_randy",
    images: [
      "/projects/vector/vector_p3.webp",
      "/projects/vector/vector_p2.webp",
      "/projects/vector/vector_p1.webp",
    ],
    videos: [],
    tags: [TAGS.NODEJS, TAGS.REACT, TAGS.JAVASCRIPT, TAGS.SASS, TAGS.HTML],
  },
]
