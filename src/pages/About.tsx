import React from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import GithubIcon from '../components/icons/Github';
import LinkedinIcon from '../components/icons/Linkedin';
import ContactForm from '../components/ContactForm';

const About: React.FC = () => {

    const backendNotes: Record<string, string> = {
        Python: 'FastAPI, Django, asincronía, typing, testing (pytest).',
        PHP: 'Laravel (Eloquent, Queues, Events), Composer, PSR-12.',
        'Node.js': 'Express/NestJS, middlewares, streams, PM2.',
        Django: 'DRF, ORM avanzado, signals, admin, config por entornos.',
        MySQL: 'Índices, EXPLAIN, migraciones, transacciones y locks.',
        MongoDB: 'Agregaciones, índices compuestos, TTL, diseño de esquemas.',
        'RESTful APIs': 'Versionado, paginación, validación, OpenAPI/Swagger.',
        JWT: 'Auth stateless, refresh, rotación segura, expiración.',
        OAuth: 'Authorization Code/PKCE, scopes, permisos granulares.',
        AWS: 'IAM, CloudWatch, costos, mejores prácticas de seguridad.',
        S3: 'Multipart upload, políticas de acceso, pre-signed URLs, lifecycle, Conciliate S3.',
        'API Gateway': 'Diseño de APIs con etapas y despliegues, rate limiting, API keys, autorizadores (JWT/Lambda), integración con Lambda/ALB.',
        DynamoDB: 'Modelado single-table, particiones/throughput, GSIs/LSIs, streams, patrones de acceso y consultas eficientes.',
        'EC2 - EBS': 'Provisionamiento, SG, volúmenes, backups, escalabilidad.',
        Redis: 'Caches, locks distribuidos, pub/sub, expiración y eviction.',
        Docker: 'Dockerfiles multi-stage, compose, optimización de layers.',
        Git: 'Git flow, Branching, PRs, code review, tagging y releases.',
        Vps: 'Nginx/Apache, SSL Let’s Encrypt, deploys y CI/CD básico.'
    };

    return (
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
                        <span className="inline-block font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300 border-2 border-zinc-900 dark:border-zinc-100 rounded-md px-3 py-1 mb-5">
                            // Acerca de mí
                        </span>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
                            Sobre Mí
                        </h1>
                        <div className="w-24 h-1 bg-zinc-900 dark:bg-zinc-100 mx-auto mt-6"></div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        <motion.div
                            className="space-y-6"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                                Hola, soy <span className="underline decoration-2 underline-offset-4 decoration-zinc-900 dark:decoration-zinc-100">Stiven Colorado</span>
                            </h2>

                            <div className="space-y-4 text-zinc-600 dark:text-gray-300">
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
                                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Stack Backend</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Python', 'PHP', 'Node.js', 'Django', 'MySQL', 'MongoDB', 'DynamoDB',
                                        'RESTful APIs', 'JWT', 'OAuth', 'AWS', 'API Gateway', 'S3', 'EC2 - EBS', 'Redis', 'Docker', 'Git', 'Vps',
                                    ].map((skill, index) => (
                                        <span
                                            title={backendNotes[skill] ?? skill}
                                            key={index}
                                            className="px-3 py-1 text-sm font-mono rounded-full border-2 border-zinc-900 dark:border-zinc-100 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Stack Tecnológico Frontend */}
                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Stack Frontend</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'JavaScript', 'TypeScript', 'React', 'React Native',
                                        'TailwindCSS', 'MobX', 'Redux', 'HTML5', 'CSS3'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 text-sm font-mono rounded-full border-2 border-zinc-900 dark:border-zinc-100 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Arquitectura y Patrones */}
                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Arquitectura y Patrones</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Patrones de Diseño', 'Principios SOLID', 'Domain-Driven Design (DDD)',
                                        'Arquitectura Hexagonal', 'Arquitectura de Software',
                                        'Levantamiento de Información', 'Análisis de Requerimientos', 'Patron Backend for Frontend', 'IaC'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 text-sm font-mono rounded-full border-2 border-zinc-900 dark:border-zinc-100 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Habilidades Blandas */}
                            <div className="pt-4">
                                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Habilidades Blandas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Trabajo en Equipo', 'Comunicación Efectiva', 'Resolución de Problemas',
                                        'Pensamiento Analítico', 'Adaptabilidad', 'Liderazgo',
                                        'Gestión del Tiempo', 'Atención al Detalle', 'Aprendizaje Continuo'
                                    ].map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 text-sm font-mono rounded-full border-2 border-zinc-900 dark:border-zinc-100 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
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
                                    className="flex items-center space-x-2 px-6 py-3 border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 rounded-md font-semibold hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors duration-200 group"
                                >
                                    <GithubIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>GitHub</span>
                                </a>
                                <a
                                    href="https://www.linkedin.com/in/stiven-colorado-370028220/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 px-6 py-3 border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md font-semibold hover:bg-transparent hover:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100 transition-colors duration-200 group"
                                >
                                    <LinkedinIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>LinkedIn</span>
                                </a>
                                <a
                                    href="#contacto"
                                    className="flex items-center space-x-2 px-6 py-3 border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 rounded-md font-semibold hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors duration-200 group cursor-pointer"
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
                            <div className="relative z-10 rounded-lg overflow-hidden border-2 border-zinc-900 dark:border-zinc-100 aspect-[3/4] w-full max-w-xs mx-auto lg:max-w-none lg:mx-0 grayscale hover:grayscale-0 transition-all duration-500">
                                <img
                                    src="/pic.jpg"
                                    alt="Stiven Colorado"
                                    className="w-full h-full object-cover object-top"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-full h-full border-2 border-zinc-900 dark:border-zinc-100 rounded-lg -z-10 hidden lg:block"></div>
                        </motion.div>
                    </div>

                    {/* Sección de contacto */}
                    <motion.div
                        id="contacto"
                        className="mt-24 max-w-2xl mx-auto scroll-mt-24"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center mb-3 text-zinc-900 dark:text-white">
                            Contáctame
                        </h2>
                        <div className="h-1 w-20 bg-zinc-900 dark:bg-zinc-100 mx-auto mb-4" />
                        <p className="text-center text-zinc-600 dark:text-gray-300 mb-10">
                            Escribe tu correo y tu mensaje; te respondo directo a tu bandeja.
                        </p>
                        <div className="rounded-lg border-2 border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900/80 backdrop-blur-sm p-6 sm:p-8 shadow-[6px_6px_0_0_#18181b] dark:shadow-[6px_6px_0_0_#fafafa]">
                            <ContactForm />
                        </div>
                    </motion.div>
                </div>
            </motion.div>
    );
};

export default About;
