import type { PublicProject } from "../types/content";
import type { TagType } from "../types/types";
import { TAGS } from "../data/tags";

export const tagOf = (key: string): TagType => TAGS[key] ?? { name: key, class: "" };

const EXT = { "case-study": "priv", demo: "demo", oss: "oss" } as const;

export const fileNameOf = (project: PublicProject) =>
    `${project.year ?? new Date().getFullYear()}-${project.slug}.${project.nda ? "nda" : EXT[project.kind]}`;
