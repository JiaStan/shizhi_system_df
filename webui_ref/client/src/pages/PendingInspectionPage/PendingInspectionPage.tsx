import { motion } from 'framer-motion';
import SummaryStatsSection from './SummaryStatsSection';
import InspectionListSection from './InspectionListSection';

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.18, ease: 'easeOut' },
  },
};

export default function PendingInspectionPage() {
  return (
    <motion.div
      className="w-full space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 专业室汇总统计 */}
      <SummaryStatsSection />

      {/* 待检明细列表 */}
      <InspectionListSection />
    </motion.div>
  );
}
