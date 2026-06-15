import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { EXPERIENCE, type ExperienceItemType } from '../data/experience';
import ExperienceItem from './ExperienceItem';
import ExperienceDetailModal from './ExperienceDetailModal';
import { Brain, Keyboard, QrCode, Box } from 'lucide-react';
import WorkIcon from './icons/WorkIcon';

const ExperienceTimeline: React.FC = () => {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [selected, setSelected] = useState<ExperienceItemType | null>(null);
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
        }, index * 100);
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
    <section ref={ref} className="w-full max-w-3xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3">
          Experiencia Profesional
        </h2>
        <p className="text-base text-zinc-600 dark:text-gray-300">
          Una mirada rápida a mi trayectoria · toca cualquier rol para ver el detalle
        </p>
        <div className="mt-4 h-1 w-24 bg-zinc-900 dark:bg-zinc-100 mx-auto" />
      </motion.div>

      <div className="relative">
        {/* Línea vertical del timeline */}
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
          className="relative space-y-4"
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
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <ExperienceItem
                  experience={experience}
                  onSelect={() => setSelected(experience)}
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

      <AnimatePresence>
        {selected && (
          <ExperienceDetailModal
            experience={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default ExperienceTimeline;
