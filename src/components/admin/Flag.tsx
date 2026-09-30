import { useState } from "react";
import { countryName, flagEmoji } from "./country";

export default function Flag({ code, className = "" }: { code: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    const cc = code.toLowerCase();
    const name = countryName(code);

    if (failed || !/^[a-z]{2}$/.test(cc)) {
        return <span role="img" aria-label={name} title={name} className={`inline-block shrink-0 text-center leading-none ${className}`}>{flagEmoji(code) ?? code}</span>;
    }
    return (
        <img
            src={`https://flagcdn.com/w40/${cc}.png`}
            srcSet={`https://flagcdn.com/w80/${cc}.png 2x`}
            width={20}
            height={15}
            loading="lazy"
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`inline-block h-[15px] w-5 shrink-0 border border-ink object-cover ${className}`}
        />
    );
}
