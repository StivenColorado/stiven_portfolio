import type { SeedService, ServiceInput } from '../validate.ts'

const BASE: Omit<ServiceInput, 'i18n'>[] = [
    {
        slug: "asesoria",
        icon: "Compass",
        title: "Asesoría técnica",
        tagline: "Decisiones de tecnología con criterio, antes de escribir código.",
        bullets: [
            "Arquitectura de software pensada para crecer sin reescribir",
            "Auditoría de código: riesgos, deuda técnica y prioridades",
            "Roadmap técnico alineado con los objetivos del negocio",
        ],
        proof: ["talkflow-ai"],
    },
    {
        slug: "desarrollo",
        icon: "Code2",
        title: "Desarrollo a medida",
        tagline: "Software hecho para la operación de pymes y grandes empresas.",
        bullets: [
            "Aplicaciones offline-first que siguen operando sin conexión",
            "Integraciones con los sistemas y servicios que ya usas",
            "Arquitectura lista para escalar con tu volumen de trabajo",
        ],
        proof: ["asadero-inventario", "azur"],
    },
    {
        slug: "ia",
        icon: "Bot",
        title: "Soluciones con IA",
        tagline: "Automatiza la atención y los procesos repetitivos con IA.",
        bullets: [
            "Chatbots para WhatsApp y Telegram conectados a tu negocio",
            "Agentes y flujos de automatización con n8n",
            "RAG: respuestas basadas en tus propios documentos",
        ],
        proof: ["chatbot-agencia", "n8n-agent"],
    },
    {
        slug: "seguridad",
        icon: "ShieldCheck",
        title: "Estándares de seguridad",
        tagline: "Seguridad integrada desde el diseño, no como parche final.",
        bullets: [
            "Autenticación con JWT en cookies httpOnly",
            "Rate limiting y cabeceras CSP contra abuso y ataques web",
            "Prácticas alineadas con OWASP en cada entrega",
        ],
        proof: ["azur"],
    },
];

const SERVICES_EN: Record<string, NonNullable<ServiceInput['i18n']['en']>> = {
  asesoria: {
    title: 'Technical consulting',
    tagline: 'Technology decisions made with judgment, before writing any code.',
    bullets: [
      'Software architecture designed to grow without rewrites',
      'Code audits: risks, technical debt and priorities',
      'A technical roadmap aligned with business goals',
    ],
  },
  desarrollo: {
    title: 'Custom development',
    tagline: 'Software built for the operations of small businesses and large companies.',
    bullets: [
      'Offline-first applications that keep working without a connection',
      'Integrations with the systems and services you already use',
      'Architecture ready to scale with your workload',
    ],
  },
  ia: {
    title: 'AI solutions',
    tagline: 'Automate customer support and repetitive processes with AI.',
    bullets: [
      'WhatsApp and Telegram chatbots connected to your business',
      'Agents and automation flows with n8n',
      'RAG: answers based on your own documents',
    ],
  },
  seguridad: {
    title: 'Security standards',
    tagline: 'Security built in from the design, not bolted on at the end.',
    bullets: [
      'Authentication with JWT in httpOnly cookies',
      'Rate limiting and CSP headers against abuse and web attacks',
      'OWASP-aligned practices in every delivery',
    ],
  },
}

export const SERVICES_SEED: SeedService[] = BASE.map((s) => ({ ...s, i18n: { en: SERVICES_EN[s.slug] ?? {} } }))
