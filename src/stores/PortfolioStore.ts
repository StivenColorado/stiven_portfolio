import { makeAutoObservable } from "mobx";

import { PROJECTS } from "../data/projects";
import { TAGS } from "../data/tags";
import { EXPERIENCE } from "../data/experience";

// export interface TagType {
//     name: string,
//     class: string,
//     icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
// }

// export interface ProjectType {
//     title: string,
//     description: string,
//     link: string,
//     github: string,
//     images: string[],
//     videos: string[],
//     tags: TagType[]
// }

export class PortfolioStore {
    projects = PROJECTS;
    tags = TAGS;
    experiences = EXPERIENCE;

    constructor() {
        makeAutoObservable(this)
    }

    get totalProjects() {
        return this.projects.length
    }

    get totalExperiences() {
        return this.experiences.length
    }

    filterByTag(tagName: string) {
        return this.projects.filter(project =>
            project.tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())
        )
    }
}