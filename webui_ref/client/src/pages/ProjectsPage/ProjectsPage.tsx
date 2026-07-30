import { motion } from 'framer-motion';
import StatisticsCardsSection from './StatisticsCardsSection';
import ProjectRiskChartSection from './ProjectRiskChartSection';
import ProjectListSection from './ProjectListSection';

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  },
};

export default function ProjectsPage() {
  return (
    <motion.div
      className="w-full space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <section className="w-full">
        <StatisticsCardsSection />
      </section>
      <section className="w-full">
        <ProjectRiskChartSection />
      </section>
      <section className="w-full">
        <ProjectListSection />
      </section>
    </motion.div>
  );
}
