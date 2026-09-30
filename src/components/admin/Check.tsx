import { Check as Tick } from "lucide-react";

export default function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="relative inline-flex size-5 shrink-0 cursor-pointer items-center justify-center">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="peer absolute inset-0 m-0 cursor-pointer opacity-0" />
            <span aria-hidden="true" className={`flex size-5 items-center justify-center border-2 border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lens ${checked ? "bg-ink text-paper" : "bg-paper"}`}>
                {checked && <Tick className="size-3.5" strokeWidth={4} />}
            </span>
        </label>
    );
}
