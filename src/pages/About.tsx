import React from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import GithubIcon from '../components/icons/Github';
import LinkedinIcon from '../components/icons/Linkedin';
import Layout from '../components/Layout';

const About: React.FC = () => {
    return (
        <Layout>
            <motion.div
                className="md:pt-80 lg:pt-0 min-h-screen py-16 px-4 sm:px-6 lg:px-8"
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

                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-white mb-4">Habilidades Técnicas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Python', 'PHP', 'JavaScript', 'TypeScript', 'Node.js',
                                        'React', 'Django', 'MySQL', 'MongoDB', 'Docker',
                                        'Git', 'RESTful APIs', 'JWT', 'OAuth', 'AWS S3',
                                        'TailwindCSS', 'MobX', 'Redux', 'HTML5', 'CSS3'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-gray-800/50 text-cyan-400 text-sm rounded-full border border-cyan-400/20"
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
                                <a
                                    href="mailto:steven17cc@hotmail.com"
                                    className="flex items-center space-x-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-700/70 text-white rounded-lg transition-all duration-300 group"
                                >
                                    <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>Email</span>
                                </a>
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
