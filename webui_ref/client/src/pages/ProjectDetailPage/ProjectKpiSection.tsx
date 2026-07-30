import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TruckIcon,
  ShieldCheckIcon,
  PackageIcon,
  LayersIcon,
} from 'lucide-react';
import configsData from '@shared/static/configs.json';
import type { IProject, IProjectConfig } from '@/types';

/* ─── 语义色 ─── */
function getRateColor(rate: number) {
  if (rate >= 95)
    return { bar: 'border-t-[hsl(152_55%_40%)]', text: 'text-[hsl(152_60%_22%)]', label: '安全' };
  if (rate >= 80)
    return { bar: 'border-t-[hsl(40_70%_50%)]', text: 'text-[hsl(40_65%_25%)]', label: '预警' };
  return { bar: 'border-t-[hsl(4_65%_48%)]', text: 'text-[hsl(4_60%_28%)]', label: '风险' };
}

/* ─── 动画 ─── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'tween', duration: 0.22, ease: 'easeOut' } },
};

/* ─── 组件 ─── */
export default function ProjectKpiSection() {
  const project = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('__global_dfmc_currentProject');
      return raw ? (JSON.parse(raw) as IProject) : null;
    } catch {
      return null;
    }
  }, []);

  const configs = useMemo(
    () => (configsData as IProjectConfig[]).filter((c) => c.project_id === project?.id),
    [project?.id],
  );

  if (!project) return null;

  const deliveryColor = getRateColor(project.delivery_rate);
  const criticalColor = getRateColor(project.critical_ready_rate);

  const cards = [
    {
      icon: TruckIcon,
      label: '到货率',
      value: project.delivery_rate,
      unit: '%',
      sub: deliveryColor.label,
      barColor: deliveryColor.bar,
      valueColor: deliveryColor.text,
    },
    {
      icon: ShieldCheckIcon,
      label: '关键件齐套率',
      value: project.critical_ready_rate,
      unit: '%',
      sub: criticalColor.label,
      barColor: criticalColor.bar,
      valueColor: criticalColor.text,
    },
    {
      icon: PackageIcon,
      label: '零件总数',
      value: project.parts_count,
      unit: '',
      sub: `${configs.reduce((s, c) => s + c.part_count, 0)} 配置件`,
      barColor: 'border-t-[hsl(210_60%_48%)]',
      valueColor: 'text-foreground',
    },
    {
      icon: LayersIcon,
      label: '配置数',
      value: configs.length,
      unit: '个',
      sub: configs.length > 0
        ? configs.map((c) => c.config_alias).join(' / ')
        : '暂无配置',
      barColor: 'border-t-[hsl(42_96%_52%)]',
      valueColor: 'text-foreground',
    },
  ];

  return (
    <motion.section
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <motion.div
            key={card.label}
            variants={cardVariants}
            className={`rounded-sm border border-border bg-card border-t-2 ${card.barColor} p-5`}
          >
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className={`font-mono text-3xl font-bold tracking-tight ${card.valueColor}`}>
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </span>
              {card.unit && (
                <span className={`text-sm font-medium ${card.valueColor}`}>{card.unit}</span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5 truncate" title={card.sub}>
              {card.sub}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
