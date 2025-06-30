export interface TagType {
    name: string,
    class: string,
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export interface ProjectType {
    title: string,
    description: string,
    link: string,
    github: string,
    images: string[],
    videos: string[],
    tags: TagType[],
    gist?: string
}
