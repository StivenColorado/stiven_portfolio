import React from "react";
import { type TagType } from "../types/types";

interface Props {
    tag: TagType
}

const Tag: React.FC<Props> = ({ tag }) => {
    const Icon = tag.icon;
    return (
        <span className="tag">
            {Icon && <Icon className="h-3.5 w-3.5 brightness-0 dark:invert" aria-hidden="true" />}
            {tag.name}
        </span>
    )
}

export default Tag;
