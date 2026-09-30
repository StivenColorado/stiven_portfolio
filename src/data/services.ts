export interface Service {
    id: string;
    title: string;
    tagline: string;
    bullets: [string, string, string];
    proof: string[];
}

export const SERVICES: Service[] = [
    {
        id: "asesoria",
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
        id: "desarrollo",
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
        id: "ia",
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
        id: "seguridad",
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
