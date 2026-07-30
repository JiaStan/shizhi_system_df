import { motion } from 'framer-motion';
import RecommendationListSection from './RecommendationListSection';
import WeightControlSection from './WeightControlSection';
import AiExplanationSection from './AiExplanationSection';
import AssemblyPlanImportSection from './AssemblyPlanImportSection';

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  },
};

export default function AssemblyPlanPage() {
  return (
    <motion.div
      className="w-full space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Sections */}
      <section className="w-full">
        <AssemblyPlanImportSection />
      </section>

      <section className="w-full">
        <RecommendationListSection />
      </section>

      <section className="w-full">
        <WeightControlSection />
      </section>

      <section className="w-full">
        <AiExplanationSection />
      </section>
    </motion.div>
  );
}
