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
}
