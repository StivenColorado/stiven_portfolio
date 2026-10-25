import type { Strokes } from "../../types/contracts";

export default function SignatureView({ strokes, label, className = "" }: { strokes: Strokes; label: string; className?: string }) {
    return (
        <svg viewBox={`0 0 ${strokes.w} ${strokes.h}`} role="img" aria-label={label} className={`block h-auto w-full text-ink ${className}`} preserveAspectRatio="xMidYMid meet">
            {strokes.strokes.map((s, i) => {
                const pts: string[] = [];
                for (let j = 0; j < s.length; j += 2) pts.push(`${s[j]},${s[j + 1]}`);
                if (pts.length === 1) pts.push(`${s[0] + 0.1},${s[1]}`);
                return <polyline key={i} points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
            })}
        </svg>
    );
}
