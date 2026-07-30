import { motion } from 'framer-motion';
import AuditLogListSection from './AuditLogListSection';

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  },
};

export default function AuditLogPage() {
  return (
    <motion.div
      className="w-full space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <AuditLogListSection />
    </motion.div>
  );
}
