import { TAGS } from "./tags"
import type { ProjectType } from "../types/types"

export const PROJECTS: ProjectType[] = [
  {
    title: "SS_RECORDER — grabador de pantalla multiplataforma",
    description:
      "Grabador de pantalla de escritorio multiplataforma (Windows / macOS / Linux) desarrollado en Python con interfaz moderna en CustomTkinter. Captura la pantalla y el audio del sistema (loopback) — lo que suena por los altavoces: juegos, YouTube, música, llamadas — sin necesidad de 'Stereo Mix' ni drivers extra: usa loopback WASAPI nativo en Windows, el monitor de PulseAudio/PipeWire en Linux y BlackHole en macOS. Soporta captura compatible con Wayland y X11 (en Wayland vía portal ScreenCast + PipeWire con detección automática), control de calidad/FPS, selección de monitor, capturas de pantalla y exportación a mp4, avi, mov y webm con el audio mezclado vía ffmpeg (binario embebido en imageio-ffmpeg). Arquitectura modular separando UI, captura, codificación y utilidades por plataforma.",
    link: "",
    github: "https://github.com/StivenColorado/SS_RECORDER",
    images: [
      "/projects/ss-recorder/ss-recorder_1.png",
      "/projects/ss-recorder/ss-recorder_2.png",
    ],
    videos: [],
    tags: [TAGS.PYTHON],
  },
  {
    title: "Rick & Morty Explorer",
    description:
      "Explorador del universo de Rick & Morty construido con React 19, TypeScript y Vite, consumiendo la API vía GraphQL (graphql-request + TanStack Query). Incluye filtros avanzados con búsqueda en vivo (debounce), estado en la URL, modales de detalle que traen residentes/reparto/episodios anidados en una sola query (sin N+1), favoritos y comparador de personajes persistentes con Zustand, un dashboard de estadísticas con Recharts que agrega todos los personajes mediante una query multi-alias, skeleton loaders, animaciones y diseño totalmente responsive con Tailwind CSS.",
    link: "https://stivencolorado.github.io/rickAndMorty/",
    github: "https://github.com/StivenColorado/rickAndMorty",
    images: [
      "/projects/rickandmorty/rickandmorty_p1.jpeg",
      "/projects/rickandmorty/rickandmorty_p2.jpeg",
      "/projects/rickandmorty/rickandmorty_p3.jpeg",
      "/projects/rickandmorty/rickandmorty_p4.jpeg",
    ],
    videos: [],
    tags: [TAGS.REACT, TAGS.TYPESCRIPT, TAGS.GRAPHQL, TAGS.TAILWIND],
  },
  {
    title: "Paraty — Sangrías & Tablas de queso",
    description:
      "Tienda online de charcutería gourmet (cups, cajas y tablas de queso) construida con React, Vite y Tailwind CSS. Incluye catálogo con búsqueda en tiempo real, filtrado por categorías, carrito de compras, valoraciones de productos e interfaz responsive con un diseño limpio y elegante orientado a la conversión.",
    link: "https://paraty-pink.vercel.app/",
    github: "",
    images: [
      "/projects/paraty-pink/paraty1.jpg",
      "/projects/paraty-pink/paraty2.jpg",
    ],
    videos: [],
    tags: [TAGS.REACT, TAGS.TAILWIND, TAGS.JAVASCRIPT],
  },
  {
    title: "Cindy Fast Food — landing de comida rápida",
    description:
      "Landing page para un restaurante de comida rápida a la parrilla, desarrollada con React, Vite y Tailwind CSS. Cuenta con hero de alto impacto, menú interactivo filtrable por categorías (hamburguesas, salchipapas, perros, combos), tarjetas de producto con precios y sección de contacto/pedidos. Diseño responsive con tema oscuro y acentos naranja.",
    link: "https://cindy-fast-food.vercel.app/",
    github: "",
    images: [
      "/projects/cindy-fast-food/cindy1.jpg",
      "/projects/cindy-fast-food/cindy2.jpg",
    ],
    videos: [],
    tags: [TAGS.REACT, TAGS.TAILWIND, TAGS.JAVASCRIPT],
  },
  {
    title: "TrashGame — survival 2D (en desarrollo)",
    description:
      "Videojuego survival 2D top-down que estoy desarrollando con Python y Pygame: mundo infinito generado proceduralmente por chunks (ruido OpenSimplex), arquitectura ECS propia, ciclo día/noche con iluminación dinámica, tormentas, sistema de crafteo con estaciones (mesa de trabajo, fogata con asador), agricultura, jefes y multijugador LAN con servidor relay TCP propio. Incluye creador de personaje por capas y pixel-art propio hecho en Pixelorama. Los GIFs muestran animaciones reales del juego.",
    link: "",
    github: "https://github.com/StivenColorado/TrashGame",
    images: [
      "/projects/trashgame/trash_cover.gif",
      "/projects/trashgame/trash_fogata.gif",
      "/projects/trashgame/trash_player.gif",
      "/projects/trashgame/trash_slime.gif",
    ],
    videos: [],
    tags: [TAGS.PYTHON, TAGS.PYGAME],
  },
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
      "Pokédex frontend construido con Astro, JavaScript y Tailwind CSS que consume la PokéAPI. Incluye búsqueda en vivo, filtrado por tipo, favoritos persistentes en localStorage, comparador de hasta 4 Pokémon con gráfico de estadísticas lado a lado, scroll infinito con skeleton loaders, y una vista de detalle enriquecida con habilidades, cadena de evolución, sprites animados (Showdown/Gen V), arte shiny y reproducción del sonido (cry) de cada Pokémon. Migrado de npm a pnpm.",
    link: "https://pokemon-api-consumer.vercel.app/",
    github: "https://github.com/StivenColorado/pokemon-api-consumer",
    images: [
      "/projects/pokemon/pokemon_p1.webp",
      "/projects/pokemon/pokemon_p2.webp",
      "/projects/pokemon/pokemon_p3.webp",
      "/projects/pokemon/pokemon_p4.webp",
    ],
    videos: [],
    tags: [TAGS.ASTRO, TAGS.JAVASCRIPT, TAGS.TAILWIND],
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
