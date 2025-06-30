import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { Menu, X, Home, FolderOpen, User, ChevronDown } from "lucide-react";

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

    return (
        <>
            {/* Navbar principal */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled 
                    ? 'backdrop-blur-lg shadow-2xl border-b border-white/10' 
                    : 'bg-transparent backdrop-blur-none'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link 
                            to="/" 
                            className="flex items-center space-x-2 text-xl md:text-2xl font-bold text-white hover:text-cyan-400 transition-colors duration-300"
                            onClick={closeMenu}
                        >
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-extrabold text-sm md:text-base">S</span>
                            </div>
                            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                Portafolio
                            </span>
                        </Link>

                        {/* Menu Desktop */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link 
                                to="/" 
                                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-all duration-300 group"
                            >
                                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="relative">
                                    Inicio
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
                                </span>
                            </Link>
                            <Link 
                                to="/projects" 
                                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-all duration-300 group"
                            >
                                <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="relative">
                                    Proyectos
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
                                </span>
                            </Link>
                            <Link 
                                to="/about" 
                                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-all duration-300 group"
                            >
                                <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="relative">
                                    Acerca
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
                                </span>
                            </Link>
                            {/* <Link 
                                to="/contact" 
                                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 backdrop-blur-sm"
                            >
                                <Mail className="w-4 h-4" />
                                <span>Contacto</span>
                            </Link> */}
                        </div>

                        {/* Botón hamburguesa móvil */}
                        <button
                            onClick={toggleMenu}
                            className="md:hidden w-10 h-10 bg-gray-800/50 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-gray-700/50 transition-all duration-300 hover:scale-105"
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
            </nav>

            {/* Overlay para cerrar menú móvil */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={closeMenu}
                />
            )}

            {/* Menu móvil */}
            <div className={`fixed top-16 right-0 h-screen w-80 bg-black/70 backdrop-blur-xl transform transition-all duration-500 z-40 md:hidden border-l border-white/10 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="flex flex-col p-6 space-y-4">
                    {/* Header del menú móvil */}
                    <div className="text-center pb-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">Navegación</h3>
                    </div>
                    
                    {/* Links del menú móvil */}
                    <Link 
                        to="/" 
                        onClick={closeMenu}
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg px-4 py-3 transition-all duration-300 group"
                    >
                        <Home className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span>Inicio</span>
                        <ChevronDown className="w-4 h-4 ml-auto transform rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                    </Link>
                    
                    <Link 
                        to="/projects" 
                        onClick={closeMenu}
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg px-4 py-3 transition-all duration-300 group"
                    >
                        <FolderOpen className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span>Proyectos</span>
                        <ChevronDown className="w-4 h-4 ml-auto transform rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                    </Link>
                    
                    <Link 
                        to="/about" 
                        onClick={closeMenu}
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg px-4 py-3 transition-all duration-300 group"
                    >
                        <User className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span>Acerca</span>
                        <ChevronDown className="w-4 h-4 ml-auto transform rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                    </Link>
                    
                    {/* <Link 
                        to="/contact" 
                        onClick={closeMenu}
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg px-4 py-3 mt-6 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 backdrop-blur-sm"
                    >
                        <Mail className="w-5 h-5" />
                        <span>Contacto</span>
                    </Link> */}

                    {/* Footer del menú móvil */}
                    <div className="pt-6 mt-6 border-t border-gray-700">
                        <p className="text-xs text-gray-400 text-center">
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