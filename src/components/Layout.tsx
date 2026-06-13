import React from "react";
import Navbar from "./Navbar";
import { ParticlesBackground } from "./ParticlesBackground";
import WhatsAppButton from "./WhatsAppButton";

interface Props {
    children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
    return (
        <div className="relative h-screen flex flex-col overflow-hidden">
            {/* Fondo base según tema (token --bg) */}
            <div className="fixed inset-0 bg-[var(--bg)] -z-10 transition-colors duration-300" />

            {/* Capa de partículas monocromas (visibles pero sutiles en ambos temas) */}
            <div className="fixed inset-0 z-0 w-full h-full opacity-50 dark:opacity-60 transition-opacity duration-300">
                <ParticlesBackground />
            </div>

            {/* Contenido principal */}
            <div className="relative z-10 flex flex-col h-full">
                <Navbar />
                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>

            {/* Botón flotante de WhatsApp (global) */}
            <WhatsAppButton />
        </div>
    );
};

export default Layout;
