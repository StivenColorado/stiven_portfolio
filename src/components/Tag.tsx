import React from "react";
import { type TagType } from "../types/types";

interface Props {
    tag: TagType
}

const Tag: React.FC<Props> = ({ tag }) => {
    const Icon = tag.icon;
    return (
        <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
            <Icon className="w-3.5 h-3.5 grayscale opacity-80" />
            {tag.name}
        </span>
    )
}

export default Tag;