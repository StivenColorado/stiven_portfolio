import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { EXPERIENCE } from '../data/experience';
import ExperienceItem from './ExperienceItem';
import { Brain, Keyboard, QrCode, Box } from 'lucide-react';
import WorkIcon from './icons/WorkIcon';

const ExperienceTimeline: React.FC = () => {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      // Animate items one by one
      const timeouts = EXPERIENCE.map((_, index) => {
        return setTimeout(() => {
          setVisibleItems(prev => [...prev, index]);
        }, index * 150);
      });

      return () => timeouts.forEach(clearTimeout);
    }
  }, [inView]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <section ref={ref} className="w-full max-w-5xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
          Experiencia Profesional
        </h2>
        <p className="text-xl text-gray-300">
          Mi trayectoria y crecimiento profesional a lo largo de los años
        </p>
        <div className="mt-4 h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full" />
      </motion.div>
      
      <div className="relative">
        {/* Línea vertical del timeline con gradiente */}
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: '100%' }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 ml-4 md:ml-6"
        />
        
        {/* Lista de experiencias */}
        <motion.ol 
          variants={container}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="relative space-y-12"
        >
          <AnimatePresence>
            {EXPERIENCE.map((experience, index) => (
              <motion.li 
                key={index} 
                className="relative pl-10 md:pl-12"
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: visibleItems.includes(index) ? 1 : 0,
                  x: visibleItems.includes(index) ? 0 : -20,
                }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <ExperienceItem
                  title={experience.title}
                  description={experience.description}
                  date={experience.date}
                  link={experience.link}
                  contact={experience.contact}
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg"
                  >
                    {index === 0 ? (
                      <Brain className="w-4 h-4 text-white" />
                    ) : index === 1 ? (
                      <Keyboard className="w-4 h-4 text-white" />
                    ) : index === 2 ? (
                      <QrCode className="w-4 h-4 text-white" />
                    ) : index === 3 ? (
                      <Box className="w-4 h-4 text-white" />
                    ) : (
                      <WorkIcon className="w-4 h-4 text-white" />
                    )}
                  </motion.div>
                </ExperienceItem>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ol>
      </div>
      
      {/* Decoración animada */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 1 }}
        className="flex justify-center mt-16"
      >
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300 group-hover:duration-200 animate-tilt"></div>
          <div className="relative px-6 py-2 bg-gray-800 rounded-lg leading-none flex items-center">
            <span className="text-blue-400 font-mono">Desplázate para ver más</span>
            <svg className="w-4 h-4 ml-2 text-purple-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ExperienceTimeline;