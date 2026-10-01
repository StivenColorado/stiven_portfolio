import { useEffect, useState } from "react";
import { loadAdminLocales } from "./index";

let loaded = false;

export function useAdminLocales(): boolean {
    const [ready, setReady] = useState(loaded);
    useEffect(() => {
        if (loaded) return;
        let alive = true;
        loadAdminLocales().then(() => {
            loaded = true;
            if (alive) setReady(true);
        });
        return () => {
            alive = false;
        };
    }, []);
    return ready;
}
