import React, { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import WhatsAppButton from "./WhatsAppButton";
import { useTrack } from "../lib/track";

const SceneCanvas = lazy(() => import("../three/SceneCanvas"));

const SCENE_ROUTES = new Set(["/", "/projects", "/about"]);

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
                <Outlet />
            </main>
            {!isAdmin && <Footer />}
            {!isAdmin && <WhatsAppButton />}
        </div>
    );
};

export default Layout;
