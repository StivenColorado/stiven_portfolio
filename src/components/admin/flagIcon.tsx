import type { ComponentType } from "react";
import Flag from "./Flag";

const cache = new Map<string, ComponentType<{ className?: string }>>();

export function flagIcon(code: string): ComponentType<{ className?: string }> {
    let icon = cache.get(code);
    if (!icon) {
        icon = function FlagIcon() { return <Flag code={code} />; };
        cache.set(code, icon);
    }
    return icon;
}
