import React from "react";
import Navbar from "./Navbar";
import { ParticlesBackground } from "./ParticlesBackground";

interface Props {
    children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
    return (
        <div className="relative min-h-screen overflow-hidden">
      {/* Fondo negro base */}
      <div className="fixed inset-0 bg-black -z-10" />
      
      {/* Capa de partículas */}
      <div className="fixed inset-0 z-0">
        <ParticlesBackground />
      </div>
      
      {/* Contenido principal */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">{children}</main>
      </div>
    </div>
    );
};

export default Layout;