import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  PackageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import configsData from '@shared/static/configs.json';
import partsData from '@shared/static/parts.json';
import deliveryData from '@shared/static/delivery.json';
import type { IProjectConfig, IProject, IPart, IDeliveryRecord } from '@/types';

const configs: IProjectConfig[] = configsData as IProjectConfig[];
const parts: IPart[] = partsData as IPart[];
const deliveries: IDeliveryRecord[] = deliveryData as IDeliveryRecord[];

/* ─── 状态配置 ─── */
const STATUS_MAP: Record<string, {
  label: string;
  emoji: string;
  bg: string;
  text: string;
  border: string;
  barColor: string;
}> = {
  safe: {
    label: '可装',
    emoji: '🟢',
    bg: 'bg-[hsl(152_45%_95%)]',
    text: 'text-[hsl(152_60%_22%)]',
    border: 'border-[hsl(152_55%_40%)]',
    barColor: 'bg-[hsl(152_55%_40%)]',
  },
  warning: {
    label: '预警',
    emoji: '🟡',
    bg: 'bg-[hsl(40_75%_94%)]',
    text: 'text-[hsl(40_65%_25%)]',
    border: 'border-[hsl(40_70%_50%)]',
    barColor: 'bg-[hsl(40_70%_50%)]',
  },
  danger: {
    label: '阻塞',
    emoji: '🔴',
    bg: 'bg-[hsl(4_55%_95%)]',
    text: 'text-[hsl(4_60%_28%)]',
    border: 'border-[hsl(4_65%_48%)]',
    barColor: 'bg-[hsl(4_65%_48%)]',
  },
};

/* ─── 模拟缺件清单 ─── */
interface IMissingPart {
  part_code: string;
  part_name: string;
  demand: number;
  received: number;
  gap: number;
  eta: string;
}

function getMissingParts(projectId: number): IMissingPart[] {
  const projectParts = parts.filter(
    (p) => p.project_id === projectId && p.critical_level >= 3.0,
  );
  const projectDeliveries = deliveries.filter((d) => d.project_id === projectId);

  return projectParts
    .map((part) => {
      const partDeliveries = projectDeliveries.filter(
        (d) => d.part_code === part.part_code,
      );
      const totalIn = partDeliveries.reduce((sum, d) => sum + d.in_qty, 0);
      const gap = Math.max(0, part.demand_quantity - totalIn);
      if (gap <= 0) return null;

      const dates = ['07-02', '07-05', '07-08', '07-12', '07-15', '07-18'];
      const eta = dates[part.id % dates.length];

      return {
        part_code: part.part_code,
        part_name: part.part_name,
        demand: part.demand_quantity,
        received: totalIn,
        gap,
        eta,
      };
    })
    .filter(Boolean) as IMissingPart[];
}

/* ─── 单条配置行 ─── */
function ConfigRow({
  config,
  missingParts,
}: {
  config: IProjectConfig;
  missingParts: IMissingPart[];
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_MAP[config.status] || STATUS_MAP.safe;

  return (
    <div
      className={`border border-border rounded-sm overflow-hidden ${
        config.status === 'danger'
          ? 'bg-[hsl(4_55%_95%)]'
          : config.status === 'warning'
            ? 'bg-[hsl(40_75%_94%)]'
            : 'bg-card'
      }`}
    >
      {/* 主行 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-accent/30 transition-colors"
      >
        {/* 配置信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
              {config.config_name}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {config.config_alias}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.part_count} 个零件 · 关键件 {config.key_parts_total} 项
          </p>
        </div>

        {/* 进度条 + 齐套率 */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-32 hidden sm:block">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>齐套率</span>
              <span className="font-mono font-medium text-foreground">
                {config.ready_rate}%
              </span>
            </div>
            <div className="h-2 bg-accent rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${config.ready_rate}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                className={`h-full rounded-full ${statusCfg.barColor}`}
              />
            </div>
          </div>

          {/* 大数字（移动端可见） */}
          <span
            className={`text-xl font-bold font-mono tracking-tight sm:hidden ${statusCfg.text}`}
          >
            {config.ready_rate}%
          </span>

          {/* 状态标签 */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
          >
            <span>{statusCfg.emoji}</span>
            {statusCfg.label}
          </span>

          {/* 展开箭头 */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* 展开：缺件清单 */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-border/60 pt-3">
              {missingParts.length === 0 ? (
                <div className="flex items-center gap-2 py-3 text-sm text-[hsl(152_60%_22%)]">
                  <CheckCircle2Icon className="size-4" />
                  <span>所有关键件已齐套，可安排装车</span>
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    缺件清单 · {missingParts.length} 项
                  </p>
                  <div className="space-y-1.5">
                    {missingParts.map((mp) => (
                      <div
                        key={mp.part_code}
                        className="flex items-center gap-3 text-xs bg-card border border-border/60 rounded-sm px-3 py-2"
                      >
                        <span className="font-mono font-medium text-foreground shrink-0">
                          {mp.part_code}
                        </span>
                        <span className="text-foreground truncate flex-1 min-w-0">
                          {mp.part_name}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          需
                          <span className="font-mono font-medium text-foreground mx-0.5">
                            {mp.demand}
                          </span>
                          / 到
                          <span className="font-mono font-medium text-foreground mx-0.5">
                            {mp.received}
                          </span>
                          / 缺
                          <span className="font-mono font-medium text-[hsl(4_60%_28%)] mx-0.5">
                            {mp.gap}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
                          <ClockIcon className="size-3" />
                          <span className="font-mono">07-{mp.eta.split('-')[1]}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── 主 Section ─── */
export default function CriticalReadinessSection() {
  /* 从 sessionStorage 读取当前项目 */
  const [currentProject] = useState<IProject | null>(() => {
    try {
      const raw = sessionStorage.getItem('__global_dfmc_currentProject');
      return raw ? (JSON.parse(raw) as IProject) : null;
    } catch {
      return null;
    }
  });

  const projectId = currentProject?.id;

  /* 筛选当前项目的配置 */
  const projectConfigs = useMemo(
    () => (projectId ? configs.filter((c) => c.project_id === projectId) : []),
    [projectId],
  );

  /* 缺件清单 */
  const allMissingParts = useMemo(() => {
    if (!projectId) return new Map<number, IMissingPart[]>();
    const missing = getMissingParts(projectId);
    const map = new Map<number, IMissingPart[]>();
    projectConfigs.forEach((cfg) => {
      map.set(cfg.id, missing.slice(0, Math.min(missing.length, cfg.key_parts_total - cfg.key_parts_ready)));
    });
    return map;
  }, [projectId, projectConfigs]);

  /* 汇总统计 */
  const summary = useMemo(() => {
    const safe = projectConfigs.filter((c) => c.status === 'safe').length;
    const warning = projectConfigs.filter((c) => c.status === 'warning').length;
    const danger = projectConfigs.filter((c) => c.status === 'danger').length;
    return { safe, warning, danger, total: projectConfigs.length };
  }, [projectConfigs]);

  if (!projectId || projectConfigs.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      {/* 区块标题 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex size-8 items-center justify-center rounded-sm bg-accent">
          <ShieldCheckIcon className="size-4 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            关键件齐套率仪表盘
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            按车型/配置展示关键件到货齐套状态
          </p>
        </div>
      </div>

      {/* 汇总统计条 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {summary.safe > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[hsl(152_55%_40%)] bg-[hsl(152_45%_95%)] text-xs font-medium text-[hsl(152_60%_22%)]">
            <CheckCircle2Icon className="size-3.5" />
            <span className="font-mono font-bold text-sm">{summary.safe}</span>
            <span>可装</span>
          </span>
        )}
        {summary.warning > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[hsl(40_70%_50%)] bg-[hsl(40_75%_94%)] text-xs font-medium text-[hsl(40_65%_25%)]">
            <AlertTriangleIcon className="size-3.5" />
            <span className="font-mono font-bold text-sm">{summary.warning}</span>
            <span>预警</span>
          </span>
        )}
        {summary.danger > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[hsl(4_65%_48%)] bg-[hsl(4_55%_95%)] text-xs font-medium text-[hsl(4_60%_28%)]">
            <XCircleIcon className="size-3.5" />
            <span className="font-mono font-bold text-sm">{summary.danger}</span>
            <span>阻塞</span>
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          共 <span className="font-mono font-medium text-foreground">{summary.total}</span> 个配置
        </span>
      </div>

      {/* 配置列表 */}
      <div className="space-y-3">
        {projectConfigs.map((config) => (
          <ConfigRow
            key={config.id}
            config={config}
            missingParts={allMissingParts.get(config.id) || []}
          />
        ))}
      </div>
    </section>
  );
}
