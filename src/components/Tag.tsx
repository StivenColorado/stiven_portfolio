import React from "react";
import { type TagType } from "../types/types";

interface Props {
    tag: TagType
}

const Tag: React.FC<Props> = ({ tag }) => {
    const Icon = tag.icon;
    return (
        <span className={`flex items-center gap-1 text-sm ${tag.class}`}>
            <Icon className="w-4 h-4" />
            {tag.name}
        </span>
    )
}

export default Tag;