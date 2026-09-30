import React, { lazy, Suspense } from "react";
import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import WhatsAppButton from "./WhatsAppButton";
import { useTrack } from "../lib/track";

const SceneCanvas = lazy(() => import("../three/SceneCanvas"));

const Layout: React.FC = () => {
    useTrack();

    return (
        <div className="min-h-dvh bg-paper text-ink font-sans">
            <Suspense fallback={null}>
                <SceneCanvas />
            </Suspense>
            <ScrollToTop />
            <Navbar />
            <main className="relative">
                <Outlet />
            </main>
            <Footer />
            <WhatsAppButton />
        </div>
    );
};

export default Layout;
