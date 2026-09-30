import type { ProjectType } from "../types/types";

const EXT = { "case-study": "priv", demo: "demo", oss: "oss" } as const;

export const fileNameOf = (project: ProjectType) =>
    `${project.year ?? new Date().getFullYear()}-${project.slug}.${project.nda ? "nda" : EXT[project.kind]}`;
