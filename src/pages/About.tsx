import React from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import GithubIcon from '../components/icons/Github';
import LinkedinIcon from '../components/icons/Linkedin';
import Layout from '../components/Layout';

const About: React.FC = () => {
    const handleEmailClick = () => {
        // Para que funcione en todos los dispositivos y abra la app de correo nativa
        window.location.href = 'mailto:steven17cc@hotmail.com?subject=Contacto desde Portfolio&body=Hola Stiven,%0D%0A%0D%0A';
    };

    return (
        <Layout>
            <motion.div
                className="w-full py-12 px-4 sm:px-6 lg:px-8 select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">
                            Sobre Mí
                        </h1>
                        <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mt-6 rounded-full"></div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        <motion.div
                            className="space-y-6"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            <h2 className="text-3xl font-bold text-white">
                                Hola, soy <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Stiven Colorado</span>
                            </h2>

                            <div className="space-y-4 text-gray-300">
                                <p>
                                    Soy analista y desarrollador de software con sólida experiencia en desarrollo Full Stack,
                                    utilizando tecnologías como Python, PHP, JavaScript, TailwindCSS y Node.js.
                                </p>
                                <p>
                                    He trabajado implementando arquitecturas limpias como Domain-Driven Design (DDD) y Hexagonal,
                                    organizando proyectos por dominios, controladores, repositorios, servicios y adaptadores,
                                    lo que garantiza mantenibilidad y escalabilidad.
                                </p>
                                <p>
                                    Tengo experiencia desarrollando APIs RESTful, integración con JWT, CORS, y configuraciones
                                    avanzadas en Django con bases de datos MySQL y almacenamiento de archivos en local y en la nube (S3).
                                </p>
                                <p>
                                    En frontend, manejo ReactJS - React Native, integrando Redux/mobX para la gestión de estados, creando hooks
                                    personalizados para centralizar peticiones HTTP y optimizando la experiencia del usuario.
                                </p>
                            </div>

                            {/* Stack Tecnológico Backend */}
                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-white mb-4">Stack Backend</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Python', 'PHP', 'Node.js', 'Django', 'MySQL', 'MongoDB',
                                        'RESTful APIs', 'JWT', 'OAuth', 'AWS S3', 'Docker', 'Git'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-green-800/30 text-green-400 text-sm rounded-full border border-green-400/20"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Stack Tecnológico Frontend */}
                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-white mb-4">Stack Frontend</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'JavaScript', 'TypeScript', 'React', 'React Native',
                                        'TailwindCSS', 'MobX', 'Redux', 'HTML5', 'CSS3'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-blue-800/30 text-blue-400 text-sm rounded-full border border-blue-400/20"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Arquitectura y Patrones */}
                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-white mb-4">Arquitectura y Patrones</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Patrones de Diseño', 'Principios SOLID', 'Domain-Driven Design (DDD)',
                                        'Arquitectura Hexagonal', 'Arquitectura de Software', 
                                        'Levantamiento de Información', 'Análisis de Requerimientos'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-purple-800/30 text-purple-400 text-sm rounded-full border border-purple-400/20"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Habilidades Blandas */}
                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-white mb-4">Habilidades Blandas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Trabajo en Equipo', 'Comunicación Efectiva', 'Resolución de Problemas',
                                        'Pensamiento Analítico', 'Adaptabilidad', 'Liderazgo',
                                        'Gestión del Tiempo', 'Atención al Detalle', 'Aprendizaje Continuo'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-orange-800/30 text-orange-400 text-sm rounded-full border border-orange-400/20"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-6">
                                <a
                                    href="https://github.com/StivenColorado"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-700/70 text-white rounded-lg transition-all duration-300 group"
                                >
                                    <GithubIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>GitHub</span>
                                </a>
                                <a
                                    href="https://www.linkedin.com/in/stiven-colorado-370028220/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white rounded-lg transition-all duration-300 group"
                                >
                                    <LinkedinIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>LinkedIn</span>
                                </a>
                                <button
                                    onClick={handleEmailClick}
                                    className="flex items-center space-x-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-700/70 text-white rounded-lg transition-all duration-300 group cursor-pointer"
                                >
                                    <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>Email</span>
                                </button>
                            </div>
                        </motion.div>

                        <motion.div
                            className="relative w-full max-w-md mx-auto lg:max-w-none lg:mx-0"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                        >
                            <div className="relative z-10 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl aspect-[3/4] w-full max-w-xs mx-auto lg:max-w-none lg:mx-0">
                                <img
                                    src="/pic.jpg"
                                    alt="Steven Córdova"
                                    className="w-full h-full object-cover object-top"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl -z-10 hidden lg:block"></div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </Layout>
    );
};

export default About;