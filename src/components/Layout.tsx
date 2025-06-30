import React from "react";
import Navbar from "./Navbar";
import { ParticlesBackground } from "./ParticlesBackground";

interface Props {
    children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
    return (
        <div className="relative h-screen flex flex-col overflow-hidden">
            {/* Fondo negro base */}
            <div className="fixed inset-0 bg-black -z-10" />
            
            {/* Capa de partículas */}
            <div className="fixed inset-0 z-0 w-full h-full">
                <ParticlesBackground />
            </div>
            
            {/* Contenido principal */}
            <div className="relative z-10 flex flex-col h-full">
                <Navbar />
                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
};

export default Layout;