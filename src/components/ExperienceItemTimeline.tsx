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
        <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
          Experiencia Profesional
        </h2>
        <p className="text-xl text-zinc-600 dark:text-gray-300">
          Mi trayectoria y crecimiento profesional a lo largo de los años
        </p>
        <div className="mt-4 h-1 w-24 bg-zinc-900 dark:bg-zinc-100 mx-auto" />
      </motion.div>
      
      <div className="relative">
        {/* Línea vertical del timeline con gradiente */}
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: '100%' }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-zinc-100 ml-4 md:ml-6"
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
                    className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 border-2 border-zinc-900 dark:border-zinc-100"
                  >
                    {index === 0 ? (
                      <Brain className="w-4 h-4 text-white dark:text-zinc-900" />
                    ) : index === 1 ? (
                      <Keyboard className="w-4 h-4 text-white dark:text-zinc-900" />
                    ) : index === 2 ? (
                      <QrCode className="w-4 h-4 text-white dark:text-zinc-900" />
                    ) : index === 3 ? (
                      <Box className="w-4 h-4 text-white dark:text-zinc-900" />
                    ) : (
                      <WorkIcon className="w-4 h-4 text-white dark:text-zinc-900" />
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
          <div className="relative px-6 py-2 border-2 border-zinc-900 dark:border-zinc-100 rounded-md leading-none flex items-center bg-white dark:bg-zinc-900">
            <span className="text-zinc-900 dark:text-zinc-100 font-mono text-sm uppercase tracking-wider">Desplázate para ver más</span>
            <svg className="w-4 h-4 ml-2 text-zinc-900 dark:text-zinc-100 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ExperienceTimeline;