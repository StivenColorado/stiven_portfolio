import React from "react";
import { Link } from "react-router";

const linkClass = "underline underline-offset-4 hover:bg-ink hover:text-paper";

const Footer: React.FC = () => (
    <footer className="relative bg-paper text-ink">
        <div className="divider" />
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-20 pt-6 font-mono md:py-6 text-xs sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>© {new Date().getFullYear()} · stiven.dev</p>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link to="/privacidad" className={linkClass}>Privacidad</Link>
                <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className={linkClass}>
                    IP Geolocation by DB-IP
                </a>
            </nav>
        </div>
        <p className="mx-auto max-w-7xl px-4 pb-6 font-mono text-[11px] opacity-70 sm:px-6 md:-mt-2 lg:px-8">
            Modelos 3D:{" "}
            <a href="https://sketchfab.com/3d-models/glasses-007651a9450746a5b6c5a126d484cd52" target="_blank" rel="noopener noreferrer" className={linkClass}>
                «Glasses»
            </a>{" "}
            por{" "}
            <a href="https://sketchfab.com/Marius.Eder" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Marius.Eder
            </a>{" "}
            y{" "}
            <a href="https://sketchfab.com/3d-models/macbook-laptop-7ceb46a1425b475fa7f6bf192e01ed74" target="_blank" rel="noopener noreferrer" className={linkClass}>
                «MacBook Laptop»
            </a>{" "}
            por{" "}
            <a href="https://sketchfab.com/sheshhh" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Issac Ghazanfar
            </a>
            ,{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className={linkClass}>
                CC BY 4.0
            </a>
        </p>
    </footer>
);

export default Footer;
