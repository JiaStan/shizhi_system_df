import React from 'react';
import { motion } from 'framer-motion';
import UnqualifiedSummarySection from './UnqualifiedSummarySection';
import UnqualifiedListSection from './UnqualifiedListSection';

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.18, ease: 'easeOut' },
  },
};

export default function UnqualifiedPendingPage() {
  return (
    <motion.div
      className="w-full space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 汇总统计 */}
      <UnqualifiedSummarySection />

      {/* 不合格明细列表 */}
      <UnqualifiedListSection />
    </motion.div>
  );
}
