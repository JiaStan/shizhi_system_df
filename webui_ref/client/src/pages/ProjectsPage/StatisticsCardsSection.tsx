import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpenIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import projectsData from '@shared/static/projects.json';
import type { IProject } from '@/types';

const projects: IProject[] = projectsData as IProject[];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.25, ease: 'easeOut' },
  },
};

interface IKpiCard {
  label: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  topColor: string;
  iconBg: string;
  iconColor: string;
}

export default function StatisticsCardsSection() {
  const cards = useMemo<IKpiCard[]>(() => {
    const total = projects.length;
    const avgDelivery =
      total > 0
        ? projects.reduce((sum, p) => sum + p.delivery_rate, 0) / total
        : 0;
    const avgCritical =
      total > 0
        ? projects.reduce((sum, p) => sum + p.critical_ready_rate, 0) / total
        : 0;
    const riskCount = projects.filter((p) => p.delivery_rate < 80).length;

    const deliveryColor =
      avgDelivery >= 95
        ? 'border-t-[hsl(152_55%_40%)]'
        : avgDelivery >= 80
          ? 'border-t-[hsl(40_70%_50%)]'
          : 'border-t-[hsl(4_65%_48%)]';

    const criticalColor =
      avgCritical >= 95
        ? 'border-t-[hsl(152_55%_40%)]'
        : avgCritical >= 80
          ? 'border-t-[hsl(40_70%_50%)]'
          : 'border-t-[hsl(4_65%_48%)]';

    const riskColor =
      riskCount === 0
        ? 'border-t-[hsl(152_55%_40%)]'
        : 'border-t-[hsl(4_65%_48%)]';

    return [
      {
        label: '项目总数',
        value: String(total),
        unit: '个',
        icon: FolderOpenIcon,
        topColor: 'border-t-[hsl(210_60%_48%)]',
        iconBg: 'bg-[hsl(210_55%_95%)]',
        iconColor: 'text-[hsl(210_55%_35%)]',
      },
      {
        label: '平均到货率',
        value: avgDelivery.toFixed(1),
        unit: '%',
        icon: TrendingUpIcon,
        topColor: deliveryColor,
        iconBg:
          avgDelivery >= 95
            ? 'bg-[hsl(152_45%_95%)]'
            : avgDelivery >= 80
              ? 'bg-[hsl(40_75%_94%)]'
              : 'bg-[hsl(4_55%_95%)]',
        iconColor:
          avgDelivery >= 95
            ? 'text-[hsl(152_60%_22%)]'
            : avgDelivery >= 80
              ? 'text-[hsl(40_65%_25%)]'
              : 'text-[hsl(4_60%_28%)]',
      },
      {
        label: '关键件齐套率',
        value: avgCritical.toFixed(1),
        unit: '%',
        icon: ShieldCheckIcon,
        topColor: criticalColor,
        iconBg:
          avgCritical >= 95
            ? 'bg-[hsl(152_45%_95%)]'
            : avgCritical >= 80
              ? 'bg-[hsl(40_75%_94%)]'
              : 'bg-[hsl(4_55%_95%)]',
        iconColor:
          avgCritical >= 95
            ? 'text-[hsl(152_60%_22%)]'
            : avgCritical >= 80
              ? 'text-[hsl(40_65%_25%)]'
              : 'text-[hsl(4_60%_28%)]',
      },
      {
        label: '风险项目',
        value: String(riskCount),
        unit: '个',
        icon: AlertTriangleIcon,
        topColor: riskColor,
        iconBg:
          riskCount === 0
            ? 'bg-[hsl(152_45%_95%)]'
            : 'bg-[hsl(4_55%_95%)]',
        iconColor:
          riskCount === 0
            ? 'text-[hsl(152_60%_22%)]'
            : 'text-[hsl(4_60%_28%)]',
      },
    ];
  }, []);

  return (
    <motion.section
      className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={cardVariants}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 hover:border-slate-200 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {card.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[#1a1a1a]">
                  {card.value}
                </span>
                <span className="text-sm font-medium text-slate-400">
                  {card.unit}
                </span>
              </div>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              <card.icon className={`size-5 ${card.iconColor}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.section>
  );
}
