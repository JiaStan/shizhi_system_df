import React from 'react';
import { motion } from 'framer-motion';

import CredentialsSection from './CredentialsSection';
import FeishuCredentialsSection from './FeishuCredentialsSection';
import SpiderControlSection from './SpiderControlSection';
import SystemParamsSection from './SystemParamsSection';

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  },
};

export default function SystemSettingsPage() {
  return (
    <motion.div
      className="w-full space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Sections */}
      <CredentialsSection />
      <FeishuCredentialsSection />
      <SpiderControlSection />
      <SystemParamsSection />
    </motion.div>
  );
}
