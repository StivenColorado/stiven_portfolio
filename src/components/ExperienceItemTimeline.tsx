import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useContent, type PublicExperience } from '../lib/content';
import { SkeletonBlocks, ContentError } from './ContentState';
import ExperienceItem from './ExperienceItem';
import ExperienceDetailModal from './ExperienceDetailModal';
import { Brain, Keyboard, QrCode, Box } from 'lucide-react';
import WorkIcon from './icons/WorkIcon';

const ExperienceTimeline: React.FC = () => {
  const { t } = useTranslation();
  const { data, loading, error } = useContent();
  const experience = data?.experience ?? [];
  const [selected, setSelected] = useState<PublicExperience | null>(null);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-14 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-10"
      >
        <h1 className="mb-3 text-5xl text-ink md:text-7xl">
          {t('experience.title')}
        </h1>
        <p className="text-base text-ink">
          {t('experience.intro')}
        </p>
      </motion.div>

      {loading && <SkeletonBlocks count={3} className="space-y-6 pl-10 md:pl-12" />}
      {error && <ContentError />}

      <div className="relative">
        <motion.div
          initial={{ height: 0 }}
          whileInView={{ height: '100%' }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.3 }}
          aria-hidden="true"
          className="absolute bottom-0 left-0 top-0 ml-4 w-[var(--line)] bg-ink md:ml-6"
        />

        <motion.ol
          key={loading ? "loading" : "ready"}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="relative space-y-6"
        >
          {experience.map((entry, index) => (
              <motion.li
                key={entry.id}
                className="relative pl-10 md:pl-12"
                variants={item}
              >
                <ExperienceItem
                  experience={entry}
                  onSelect={() => setSelected(entry)}
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 border-2 border-ink bg-ink"
                  >
                    {index === 0 ? (
                      <Brain className="w-4 h-4 text-paper" strokeWidth={2.5} />
                    ) : index === 1 ? (
                      <Keyboard className="w-4 h-4 text-paper" />
                    ) : index === 2 ? (
                      <QrCode className="w-4 h-4 text-paper" />
                    ) : index === 3 ? (
                      <Box className="w-4 h-4 text-paper" />
                    ) : (
                      <WorkIcon className="w-4 h-4 text-paper" />
                    )}
                  </motion.div>
                </ExperienceItem>
              </motion.li>
            ))}
        </motion.ol>
      </div>

      {selected && (
        <ExperienceDetailModal
          experience={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
};

export default ExperienceTimeline;
