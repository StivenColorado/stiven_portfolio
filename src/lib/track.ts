import { useEffect } from "react";
import { useLocation } from "react-router";

type GpcNavigator = Navigator & { globalPrivacyControl?: boolean };

/** Registra la visita en cada cambio de ruta; respeta Global Privacy Control y omite /admin. */
export function useTrack() {
    const { pathname } = useLocation();

    useEffect(() => {
        if (pathname.startsWith("/admin")) return;
        if ((navigator as GpcNavigator).globalPrivacyControl) return;
        try {
            const body = JSON.stringify({
                path: pathname,
                ref: document.referrer,
                touch: navigator.maxTouchPoints > 1,
            });
            navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
        } catch {
            return;
        }
    }, [pathname]);
}
