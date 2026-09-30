import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import type { SceneHandle } from "./scene.ts";

const hasWebGL = () => !!document.createElement("canvas").getContext("webgl2");

const SceneCanvas: React.FC = () => {
    const { pathname } = useLocation();
    const container = useRef<HTMLDivElement>(null);
    const handle = useRef<SceneHandle | null>(null);
    const pathRef = useRef(pathname);
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const idle = window.requestIdleCallback
            ? (cb: () => void) => {
                  const id = window.requestIdleCallback(cb);
                  return () => window.cancelIdleCallback(id);
              }
            : (cb: () => void) => {
                  const id = window.setTimeout(cb, 200);
                  return () => window.clearTimeout(id);
              };

        const cancelIdle = idle(async () => {
            if (!hasWebGL()) {
                setFallback(true);
                return;
            }
            try {
                const { mount } = await import("./scene.ts");
                if (cancelled || !container.current) return;
                handle.current = mount(container.current, pathRef.current);
            } catch {
                if (!cancelled) setFallback(true);
            }
        });

        return () => {
            cancelled = true;
            cancelIdle();
            handle.current?.dispose();
            handle.current = null;
        };
    }, []);

    useEffect(() => {
        pathRef.current = pathname;
        handle.current?.setRoute(pathname);
    }, [pathname]);

    return (
        <div
            ref={container}
            aria-hidden="true"
            className={`pointer-events-none fixed inset-0 z-0 dark:[filter:drop-shadow(0_0_1px_#f4f2ec)_drop-shadow(0_0_1.5px_#f4f2ec)] ${
                fallback
                    ? "bg-[radial-gradient(ellipse_at_70%_20%,var(--lens-soft),transparent_60%)]"
                    : ""
            }`}
        />
    );
};

export default SceneCanvas;
