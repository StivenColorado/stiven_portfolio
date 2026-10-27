import { ExternalLink } from "lucide-react";
import { linkMeta } from "./linkMeta";

export default function ProspectLinks({ links, size = "md" }: { links: string[]; size?: "sm" | "md" }) {
    const small = size === "sm";
    return (
        <ul className="flex flex-wrap gap-2">
            {links.map((url) => {
                const { label, icon: Icon } = linkMeta(url);
                return (
                    <li key={url} className="min-w-0">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={url}
                            className={`btn max-w-full ${small ? "!min-h-8 !px-2 !py-0.5 !text-xs" : "!min-h-10 !px-3 !py-1 !text-sm"}`}
                        >
                            <Icon size={small ? 13 : 16} strokeWidth={2.5} aria-hidden className="shrink-0" />
                            <span className="truncate">{label}</span>
                            {!small && <ExternalLink size={12} strokeWidth={2.5} aria-hidden className="shrink-0 opacity-70" />}
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}
