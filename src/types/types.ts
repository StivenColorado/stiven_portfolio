export interface TagType {
    name: string,
    class: string,
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export type ProjectKind = 'demo' | 'oss' | 'case-study'

export interface ProjectType {
    slug: string,
    title: string,
    summary: string,
    description: string,
    kind: ProjectKind,
    year?: number,
    client?: string,
    links?: { demo?: string, repo?: string, gist?: string },
    private?: boolean,
    nda?: boolean,
    highlights?: string[],
    images: string[],
    videos: string[],
    tags: TagType[],
    featured?: boolean
}
