import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { observer } from "mobx-react";
import { Menu, X, Home, FolderOpen, User, ChevronDown, Sun, Moon } from "lucide-react";
import { useStore } from "../context/StoreContext";

const ThemeToggle: React.FC<{ className?: string }> = observer(({ className = "" }) => {
    const { themeStore } = useStore();
    const isDark = themeStore.isDark;
    return (
        <button
            onClick={() => themeStore.toggle()}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={isDark ? "Modo claro" : "Modo oscuro"}
            className={`relative w-10 h-10 rounded-md flex items-center justify-center
                        text-zinc-900 dark:text-zinc-100 border-2 border-zinc-900 dark:border-zinc-100
                        hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900
                        transition-all duration-300 ${className}`}
        >
            <Sun className={`absolute w-5 h-5 transition-all duration-300 ${isDark ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`} />
            <Moon className={`absolute w-5 h-5 transition-all duration-300 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`} />
        </button>
    );
});

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Detectar scroll para cambiar el estilo del navbar
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cerrar menú móvil al hacer scroll
    useEffect(() => {
        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isOpen]);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const closeMenu = () => {
        setIsOpen(false);
    };

    const linkClass =
        "flex items-center space-x-2 text-zinc-600 hover:text-zinc-900 dark:text-gray-300 dark:hover:text-white transition-all duration-300 group";

    return (
        <>
            {/* Navbar principal */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled
                    ? 'backdrop-blur-lg shadow-2xl border-b bg-white/70 border-zinc-200 dark:bg-black/40 dark:border-white/10'
                    : 'bg-transparent backdrop-blur-none border-b border-transparent'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link
                            to="/"
                            className="group flex items-center space-x-2.5 text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white"
                            onClick={closeMenu}
                        >
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 dark:bg-zinc-100 border-2 border-zinc-900 dark:border-zinc-100 rounded-md flex items-center justify-center transition-transform duration-300 group-hover:rotate-[-6deg]">
                                <span className="text-white dark:text-zinc-900 font-black text-sm md:text-base">S</span>
                            </div>
                            <span>Stiven<span className="text-zinc-400 dark:text-zinc-500">.dev</span></span>
                        </Link>

                        {/* Menu Desktop */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link to="/" className={linkClass}>
                                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="relative">
                                    Inicio
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 group-hover:w-full"></span>
                                </span>
                            </Link>
                            <Link to="/projects" className={linkClass}>
                                <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="relative">
                                    Proyectos
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 group-hover:w-full"></span>
                                </span>
                            </Link>
                            <Link to="/about" className={linkClass}>
                                <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="relative">
                                    Acerca
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 group-hover:w-full"></span>
                                </span>
                            </Link>
                            <ThemeToggle />
                        </div>

                        {/* Controles móvil: toggle de tema + hamburguesa */}
                        <div className="flex items-center gap-2 md:hidden">
                            <ThemeToggle />
                            <button
                                onClick={toggleMenu}
                                className="w-10 h-10 border-2 border-zinc-900 dark:border-zinc-100 rounded-md flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all duration-300"
                                aria-label="Toggle menu"
                            >
                                <div className="relative w-6 h-6">
                                    <Menu
                                        className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
                                            isOpen ? 'opacity-0 rotate-45' : 'opacity-100 rotate-0'
                                        }`}
                                    />
                                    <X
                                        className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
                                            isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'
                                        }`}
                                    />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Overlay para cerrar menú móvil */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={closeMenu}
                />
            )}

            {/* Menu móvil */}
            <div className={`fixed top-16 right-0 h-screen w-80 bg-white/90 dark:bg-black/70 backdrop-blur-xl transform transition-all duration-500 z-40 md:hidden border-l border-zinc-200 dark:border-white/10 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="flex flex-col p-6 space-y-4">
                    {/* Header del menú móvil */}
                    <div className="text-center pb-4 border-b border-zinc-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Navegación</h3>
                    </div>

                    {/* Links del menú móvil */}
                    <Link
                        to="/"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/50 rounded-lg px-4 py-3 transition-all duration-300 group"
                    >
                        <Home className="w-5 h-5 text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform" />
                        <span>Inicio</span>
                        <ChevronDown className="w-4 h-4 ml-auto transform rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        to="/projects"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/50 rounded-lg px-4 py-3 transition-all duration-300 group"
                    >
                        <FolderOpen className="w-5 h-5 text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform" />
                        <span>Proyectos</span>
                        <ChevronDown className="w-4 h-4 ml-auto transform rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        to="/about"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/50 rounded-lg px-4 py-3 transition-all duration-300 group"
                    >
                        <User className="w-5 h-5 text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform" />
                        <span>Acerca</span>
                        <ChevronDown className="w-4 h-4 ml-auto transform rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {/* Footer del menú móvil */}
                    <div className="pt-6 mt-6 border-t border-zinc-200 dark:border-gray-700">
                        <p className="text-xs text-zinc-500 dark:text-gray-400 text-center">
                            © 2025 Stiven Colorado. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>

            {/* Spacer para compensar el navbar fijo */}
            <div className="h-16 md:h-20"></div>
        </>
    );
};

export default Navbar;
