import type { ComponentType, SVGProps } from "react"
import { Boxes, Bot, Cloud, Database, GitBranch, KeyRound, Network, Server, Sparkles, Terminal, Webhook, Workflow } from "lucide-react"
import { TAGS } from "../data/tags"

type Icon = ComponentType<SVGProps<SVGSVGElement>>

const fromTag = (key: string): Icon | undefined => TAGS[key]?.icon

const BY_NAME: Record<string, Icon | undefined> = {
    javascript: fromTag("JAVASCRIPT"),
    typescript: fromTag("TYPESCRIPT"),
    react: fromTag("REACT"),
    "react native": fromTag("REACT"),
    tailwindcss: fromTag("TAILWIND"),
    html5: fromTag("HTML"),
    css3: fromTag("CSS"),
    python: fromTag("PYTHON"),
    django: fromTag("DJANGO"),
    php: fromTag("PHP"),
    "node.js": fromTag("NODEJS"),
    nestjs: fromTag("NESTJS"),
    graphql: fromTag("GRAPHQL"),
    mysql: fromTag("MYSQL"),
    redis: fromTag("REDIS"),
    sqlite: fromTag("SQLITE"),
    supabase: fromTag("SUPABASE"),
    n8n: fromTag("N8N"),
    "ia generativa": Sparkles,
    "generative ai": Sparkles,
    "agentes de ia": Bot,
    "ai agents": Bot,
    webhooks: Webhook,
    automatización: Workflow,
    automation: Workflow,
    "rest apis": Network,
    jwt: KeyRound,
    oauth: KeyRound,
    mongodb: Database,
    dynamodb: Database,
    prisma: Database,
    aws: Cloud,
    s3: Cloud,
    ec2: Server,
    nginx: Server,
    docker: Boxes,
    git: GitBranch,
    "api gateway": Network,
    "ci/cd": Workflow,
    iac: Terminal,
}

const FALLBACK: Record<string, Icon> = {
    frontend: Terminal,
    backend: Server,
    data: Database,
    devops: Cloud,
    ai: Sparkles,
}

export function iconFor(name: string, group: string): Icon {
    return BY_NAME[name.toLowerCase()] ?? FALLBACK[group] ?? Terminal
}
