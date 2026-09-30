import PythonIcon from "../components/icons/PythonIcon"
import DjangoIcon from "../components/icons/DjangoIcon"
import JsIcon from "../components/icons/JsIcon"
import PhpIcon from "../components/icons/PhpIcon"
import CssIcon from "../components/icons/CssIcon"
import HtmlIcon from "../components/icons/HtmlIcon"
import TailwindIcon from "../components/icons/TailwindIcon"
import NodejsIcon from "../components/icons/NodejsIcon"
import ScssIcon from "../components/icons/ScssIcon"
import ReactIcon from "../components/icons/ReactIcon"
import AstroIcon from "../components/icons/AstroIcon"
import MysqlIcon from "../components/icons/MysqlIcon"
import TypeScriptIcon from "../components/icons/TypeScriptIcon"
import GraphQLIcon from "../components/icons/GraphQLIcon"

import NestJSIcon from "../components/icons/NestJSIcon"
import FlutterIcon from "../components/icons/FlutterIcon"
import N8nIcon from "../components/icons/N8nIcon"
import SupabaseIcon from "../components/icons/SupabaseIcon"
import SqliteIcon from "../components/icons/SqliteIcon"
import RedisIcon from "../components/icons/RedisIcon"
import ThreeIcon from "../components/icons/ThreeIcon"
import { Sparkles } from "lucide-react"

import type { TagType } from "../types/types"

export const TAGS: Record<string, TagType> = {
  PYTHON: {
    name: "Python",
    class: "text-yellow-500",
    icon: PythonIcon,
  },
  DJANGO: {
    name: "Django",
    class: "text-lime-500",
    icon: DjangoIcon,
  },
  JAVASCRIPT: {
    name: "JavaScript",
    class: "text-yellow-300",
    icon: JsIcon,
  },
  PHP: {
    name: "PHP",
    class: "text-white",
    icon: PhpIcon,
  },
  CSS: {
    name: "CSS",
    class: "text-white",
    icon: CssIcon,
  },
  HTML: {
    name: "HTML",
    class: "text-white",
    icon: HtmlIcon,
  },
  TAILWIND: {
    name: "Tailwind",
    class: "text-white",
    icon: TailwindIcon,
  },
  NODEJS: {
    name: "NodeJs",
    class: "text-white",
    icon: NodejsIcon,
  },
  SASS: {
    name: "SASS",
    class: "text-white",
    icon: ScssIcon,
  },
  REACT: {
    name: "React",
    class: "text-white",
    icon: ReactIcon,
  },
  ASTRO: {
    name: "Astro",
    class: "text-white",
    icon: AstroIcon,
  },
  MYSQL: {
    name: "Mysql",
    class: "text-white",
    icon: MysqlIcon,
  },
  PYGAME: {
    name: "Pygame",
    class: "text-emerald-400",
    icon: PythonIcon,
  },
  TYPESCRIPT: {
    name: "TypeScript",
    class: "text-blue-400",
    icon: TypeScriptIcon,
  },
  GRAPHQL: {
    name: "GraphQL",
    class: "text-pink-500",
    icon: GraphQLIcon,
  },
  NESTJS: {
    name: "NestJS",
    class: "text-red-500",
    icon: NestJSIcon,
  },
  PRISMA: {
    name: "Prisma",
    class: "text-teal-400",
  },
  REDIS: {
    name: "Redis",
    class: "text-red-400",
    icon: RedisIcon,
  },
  FLUTTER: {
    name: "Flutter",
    class: "text-sky-400",
    icon: FlutterIcon,
  },
  N8N: {
    name: "n8n",
    class: "text-orange-500",
    icon: N8nIcon,
  },
  SUPABASE: {
    name: "Supabase",
    class: "text-emerald-400",
    icon: SupabaseIcon,
  },
  SQLITE: {
    name: "SQLite",
    class: "text-sky-300",
    icon: SqliteIcon,
  },
  THREEJS: {
    name: "three.js",
    class: "text-white",
    icon: ThreeIcon,
  },
  WHATSAPP: {
    name: "WhatsApp",
    class: "text-green-500",
  },
  IA: {
    name: "IA",
    class: "text-violet-400",
    icon: Sparkles,
  },
}
