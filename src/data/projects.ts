import { TAGS } from "./tags"
import type { ProjectType } from "../types/types"

export const PROJECTS: ProjectType[] = [
  {
    title: "App generador de códigos QR",
    description:
      "Genera códigos QR ilimitados sin anuncios 🚀.",
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
      "Envío de correos masivos con QR y control de asistencia.",
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
      "Sistema de agendamiento para estudios fotográficos.",
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
      "Automatiza análisis de datos de Eye Tracking.",
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
      "Tienda online simulada para venta de sacos.",
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
      "Consume la API de Pokémon. Autenticación para detalles.",
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
      "Plataforma de vinculación de proyectos del SENA Palmira.",
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
      "App móvil para artista de vectores. Muestra su obra.",
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
