import React, { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import WhatsAppButton from "./WhatsAppButton";
import { useTrack } from "../lib/track";

const SceneCanvas = lazy(() => import("../three/SceneCanvas"));

const SCENE_ROUTES = new Set(["/", "/projects", "/services", "/experience", "/contact"]);

const PageFallback: React.FC = () => (
    <div className="min-h-dvh flex items-center justify-center font-mono text-sm" role="status">
        <span className="animate-pulse">▮</span>
    </div>
);

const Layout: React.FC = () => {
    useTrack();
    const { pathname } = useLocation();
    const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
    const showScene = SCENE_ROUTES.has(pathname.replace(/\/+$/, "") || "/");

    return (
        <div className="min-h-dvh bg-paper text-ink font-sans">
            {showScene && (
                <Suspense fallback={null}>
                    <SceneCanvas />
                </Suspense>
            )}
            <ScrollToTop />
            {!isAdmin && <Navbar />}
            <main className="relative">
                <Suspense fallback={<PageFallback />}>
                    <Outlet />
                </Suspense>
            </main>
            {!isAdmin && <Footer />}
            {!isAdmin && <WhatsAppButton />}
        </div>
    );
};

export default Layout;
