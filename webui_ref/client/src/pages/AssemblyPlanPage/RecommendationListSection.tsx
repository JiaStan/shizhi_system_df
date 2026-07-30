import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVerticalIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  PackageIcon,
  RotateCcwIcon,
  CalendarClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CarIcon,
  UserIcon,
  MapPinIcon,
} from 'lucide-react';
import type { IProjectConfig, IMissingPart, AssemblyStatus, ConfigStatus } from '@/types';
import configsData from '@shared/static/configs.json';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════
 *  装配顺序推荐卡片列表 — 可拖拽重排 (What-if 模拟)
 * ═══════════════════════════════════════════════════════════ */

// ─── 扩展类型 ────────────────────────────────────────────

interface IRecommendationItem extends IProjectConfig {
  missing_parts: IMissingPart[];
  /** 导入计划中的车型信息 (REV/BEV) */
  vehicle_type?: string;
  /** 导入计划中的用途 */
  purpose?: string;
  /** 导入计划中的用车需求人 */
  requester?: string;
  /** 导入计划中的装配地点 */
  location?: string;
  /** 导入计划中的状态 */
  plan_status?: string;
  /** 是否匹配到导入计划 */
  has_plan_match?: boolean;
}

// ─── Mock 缺件数据（关联 configs 中 blocked/warning 项）──

const MOCK_MISSING: Record<string, IMissingPart[]> = {};

// ─── 初始推荐列表（按齐套率降序 = AI 推荐初始顺序）──────

const initialRecommendations: IRecommendationItem[] = (
  configsData as IProjectConfig[]
)
  .map((c) => ({
    ...c,
    missing_parts: MOCK_MISSING[c.config_name] ?? [],
  }))
  .sort((a, b) => b.ready_rate - a.ready_rate);

// ─── 工具函数 ────────────────────────────────────────────

/** ConfigStatus → AssemblyStatus 映射 */
function toAssemblyStatus(s: ConfigStatus): AssemblyStatus {
  if (s === 'safe') return 'ready';
  if (s === 'warning') return 'warning';
  return 'blocked';
}

function getStatusInfo(status: AssemblyStatus) {
  switch (status) {
    case 'ready':
      return {
        label: '可装',
        icon: CheckCircle2Icon,
        classes:
          'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border border-[hsl(152_55%_40%)]',
      };
    case 'warning':
      return {
        label: '预警',
        icon: AlertTriangleIcon,
        classes:
          'bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)] border border-[hsl(40_70%_50%)]',
      };
    case 'blocked':
      return {
        label: '阻塞',
        icon: XCircleIcon,
        classes:
          'bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] border border-[hsl(4_65%_48%)]',
      };
  }
}

function getRowBg(status: AssemblyStatus) {
  switch (status) {
    case 'blocked':
      return 'bg-[hsl(4_55%_95%)]';
    case 'warning':
      return 'bg-[hsl(40_75%_94%)]';
    default:
      return 'bg-card';
  }
}

function getBarColor(rate: number) {
  if (rate >= 95) return 'bg-[hsl(152_55%_40%)]';
  if (rate >= 80) return 'bg-[hsl(40_70%_50%)]';
  return 'bg-[hsl(4_65%_48%)]';
}

// ─── 推荐卡片 ────────────────────────────────────────────

function RecommendationCard({
  item,
  rank,
  isDragging,
}: {
  item: IRecommendationItem;
  rank: number;
  isDragging: boolean;
}) {
  const asmStatus = toAssemblyStatus(item.status);
  const statusInfo = getStatusInfo(asmStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex items-stretch gap-0">
      {/* 排名编号列 */}
      <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-border bg-accent/30 rounded-l-sm">
        <span className="font-mono text-xs font-medium text-muted-foreground">
          #{rank}
        </span>
      </div>

      {/* 卡片主体 */}
      <div
        className={`flex-1 min-w-0 border border-border rounded-r-sm p-4 transition-colors ${getRowBg(asmStatus)}`}
      >
        {/* 第一行：配置名 + 状态标签 + 齐套率 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {item.config_alias}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {item.config_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* 齐套率 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">齐套率</span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {item.ready_rate.toFixed(1)}%
              </span>
            </div>

            {/* 状态胶囊 */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.classes}`}
            >
              <StatusIcon className="size-3" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* 齐套率进度条 */}
        <div className="mt-3 h-1.5 w-full bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.ready_rate)}`}
            style={{ width: `${Math.min(item.ready_rate, 100)}%` }}
          />
        </div>

        {/* 导入计划信息（匹配时显示） */}
        {item.has_plan_match && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {item.vehicle_type && (
              <span className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
                item.vehicle_type.toUpperCase() === 'REV'
                  ? 'bg-[hsl(210_55%_95%)] text-[hsl(210_55%_25%)] border-[hsl(210_60%_48%)]'
                  : 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border-[hsl(152_55%_40%)]'
              )}>
                <CarIcon className="size-3" />
                {item.vehicle_type}
              </span>
            )}
            {item.purpose && (
              <span className="truncate max-w-40" title={item.purpose}>
                {item.purpose}
              </span>
            )}
            {item.requester && (
              <span className="inline-flex items-center gap-1 truncate max-w-32" title={item.requester}>
                <UserIcon className="size-3 shrink-0" />
                {item.requester}
              </span>
            )}
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3 shrink-0" />
                {item.location}
              </span>
            )}
          </div>
        )}

        {/* 关键件统计 */}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <PackageIcon className="size-3" />
            关键件{' '}
            <span className="font-mono font-medium text-foreground">
              {item.key_parts_ready}/{item.key_parts_total}
            </span>
          </span>
          <span>
            零件总数{' '}
            <span className="font-mono font-medium text-foreground">
              {item.part_count}
            </span>
          </span>
        </div>

        {/* 缺件清单（仅 blocked / warning 展示） */}
        {item.missing_parts.length > 0 && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="text-xs font-medium text-foreground mb-2">
              缺件清单（{item.missing_parts.length} 项）
            </p>
            <div className="space-y-1.5">
              {item.missing_parts.map((mp) => (
                <div
                  key={mp.part_code}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block size-1.5 rounded-full bg-[hsl(4_65%_48%)] shrink-0" />
                    <span className="font-mono text-muted-foreground shrink-0">
                      {mp.part_code}
                    </span>
                    <span className="text-foreground truncate">
                      {mp.part_name}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      缺口{' '}
                      <span className="font-mono font-medium text-[hsl(4_60%_28%)]">
                        {mp.shortage_qty}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                    <CalendarClockIcon className="size-3" />
                    <span className="font-mono">{mp.estimated_arrival}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .drag-handle-zone {
          position: relative;
        }
        .drag-handle-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

// ─── 主 Section ──────────────────────────────────────────

export default function RecommendationListSection() {
  const [items, setItems] = useState(initialRecommendations);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hasImportedPlan, setHasImportedPlan] = useState(false);
  const [originalOrder] = useState(() =>
    initialRecommendations.map((i) => i.id)
  );

  // ── 监听导入计划数据 ──────────────
  useEffect(() => {
    const applyImportedPlan = () => {
      try {
        const raw = sessionStorage.getItem('__global_dfmc_importedPlan');
        if (!raw) {
          setHasImportedPlan(false);
          setItems(initialRecommendations);
          return;
        }
        const { rows } = JSON.parse(raw) as { rows: Array<Record<string, string | number>> };
        if (!rows || rows.length === 0) return;

        setHasImportedPlan(true);

        // 将导入计划数据与现有推荐配置匹配
        setItems((prev) =>
          prev.map((item) => {
            // 尝试用 config_name 匹配样车编号或 MSK 编码
            const match = rows.find(
              (r) =>
                String(r.vehicle_id || '').includes(item.config_name) ||
                String(r.msk_code || '').includes(item.config_name) ||
                String(r.vehicle_id || '').includes(item.config_alias) ||
                String(r.msk_code || '').includes(item.config_alias)
            );
            if (match) {
              return {
                ...item,
                vehicle_type: String(match.vehicle_type || ''),
                purpose: String(match.purpose || ''),
                requester: String(match.requester || ''),
                location: String(match.location || ''),
                plan_status: String(match.status || ''),
                has_plan_match: true,
              };
            }
            return { ...item, has_plan_match: false };
          })
        );
      } catch { /* ignore */ }
    };

    applyImportedPlan();

    const handler = (e: StorageEvent) => {
      if (e.key === '__global_dfmc_importedPlan') {
        applyImportedPlan();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ── 权重联动：监听 localStorage 变化并重新排序 ──
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === '__global_dfmc_assemblyWeights' && e.newValue) {
        try {
          const w = JSON.parse(e.newValue);
          const alpha = w.completeness ?? 0.5;
          const beta = w.workload_balance ?? 0.3;
          setItems((prev) =>
            [...prev].sort((a, b) => {
              const scoreA = alpha * a.ready_rate + beta * (100 - a.key_parts_total + a.key_parts_ready) + (1 - alpha - beta) * (a.status === 'safe' ? 100 : a.status === 'warning' ? 50 : 0);
              const scoreB = alpha * b.ready_rate + beta * (100 - b.key_parts_total + b.key_parts_ready) + (1 - alpha - beta) * (b.status === 'safe' ? 100 : b.status === 'warning' ? 50 : 0);
              return scoreB - scoreA;
            })
          );
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isReordered = useMemo(() => {
    return items.some((item, idx) => item.id !== originalOrder[idx]);
  }, [items, originalOrder]);

  /** Framer Motion drag：onDragEnd 计算新位置 */
  const handleDragEnd = (
    draggedId: number,
    _e: unknown,
    info: { offset: { y: number }; point?: { y?: number } }
  ) => {
    const dragOffset = info.offset.y;
    if (Math.abs(dragOffset) < 10) return;

    setItems((prev) => {
      const currentIdx = prev.findIndex((i) => i.id === draggedId);
      if (currentIdx === -1) return prev;

      // 估算卡片高度（含间距）
      const cardHeight = 160;
      const positionDelta = Math.round(dragOffset / cardHeight);
      const newIdx = Math.max(
        0,
        Math.min(prev.length - 1, currentIdx + positionDelta)
      );

      if (newIdx === currentIdx) return prev;

      const next = [...prev];
      const [dragged] = next.splice(currentIdx, 1);
      next.splice(newIdx, 0, dragged);
      return next;
    });
  };

  const handleReset = () => {
    setItems(initialRecommendations);
  };

  return (
    <section className="w-full">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            装配顺序推荐
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasImportedPlan
              ? '已结合导入的装车计划信息，综合齐套率与车型需求生成推荐顺序'
              : '拖拽卡片调整优先级，或导入装车计划后 AI 将结合实际需求生成建议'}
          </p>
        </div>

        {/* 重置按钮（顺序变化时显示） */}
        <AnimatePresence>
          {isReordered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <RotateCcwIcon className="size-3" />
              恢复 AI 推荐顺序
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 重排提示 */}
      <AnimatePresence>
        {isReordered && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="mb-4 flex items-center gap-2 px-3 py-2 rounded-sm border-l-3 border-l-[hsl(42_96%_52%)] bg-[hsl(42_96%_52%/0.06)] text-xs text-foreground"
          >
            <AlertTriangleIcon className="size-3.5 text-[hsl(40_70%_50%)] shrink-0" />
            <span>
              已手动调整排序 — 当前为 What-if 模拟模式，非 AI 推荐顺序
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* What-if 对比面板 */}
      <AnimatePresence>
        {isReordered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4 rounded-sm border border-border bg-card p-4 overflow-hidden"
          >
            <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">调整前后对比</h4>
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                const aiAvg = initialRecommendations.reduce((s, i, idx) => s + i.ready_rate * (1 - idx * 0.02), 0) / initialRecommendations.length;
                const manualAvg = items.reduce((s, i, idx) => s + i.ready_rate * (1 - idx * 0.02), 0) / items.length;
                const aiReady = initialRecommendations.filter((i) => toAssemblyStatus(i.status) === 'ready').length;
                const manualReady = items.filter((i) => toAssemblyStatus(i.status) === 'ready').length;
                const aiBlocked = initialRecommendations.filter((i) => toAssemblyStatus(i.status) === 'blocked').length;
                const manualBlocked = items.filter((i) => toAssemblyStatus(i.status) === 'blocked').length;
                const diff = manualAvg - aiAvg;
                return (
                  <>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">加权齐套率</p>
                      <p className="font-mono text-lg font-bold text-foreground">{manualAvg.toFixed(1)}%</p>
                      <p className={`text-[10px] font-medium mt-0.5 flex items-center justify-center gap-0.5 ${diff >= 0 ? 'text-[hsl(152_60%_22%)]' : 'text-[hsl(4_60%_28%)]'}`}>
                        {diff >= 0 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
                        {Math.abs(diff).toFixed(1)}% vs AI
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">可装配置</p>
                      <p className="font-mono text-lg font-bold text-[hsl(152_60%_22%)]">{manualReady}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">AI: {aiReady}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">阻塞配置</p>
                      <p className="font-mono text-lg font-bold text-[hsl(4_60%_28%)]">{manualBlocked}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">AI: {aiBlocked}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 可拖拽卡片列表 */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layout
            layoutId={`rec-card-${item.id}`}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            dragMomentum={false}
            onDragStart={() => setDraggingId(item.id)}
            onDragEnd={(e, info) =>
              handleDragEnd(item.id, e, info)
            }
            onDrag={() => {}}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: draggingId === item.id ? 1.015 : 1,
              zIndex: draggingId === item.id ? 50 : 0,
            }}
            exit={{ opacity: 0, y: -12 }}
            transition={{
              layout: { type: 'spring', stiffness: 400, damping: 32 },
              default: { duration: 0.15 },
            }}
            className="group relative flex items-stretch cursor-grab active:cursor-grabbing"
            style={{
              boxShadow:
                draggingId === item.id
                  ? '0 8px 25px -5px hsl(0 0% 0% / 0.1), 0 4px 10px -5px hsl(0 0% 0% / 0.04)'
                  : 'none',
            }}
          >
            {/* 拖拽手柄 */}
            <div className="flex w-6 shrink-0 items-center justify-center rounded-l-sm bg-accent/50 border-y border-l border-border">
              <GripVerticalIcon className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </div>

            {/* 卡片内容 */}
            <div className="flex-1 min-w-0">
              <RecommendationCard
                item={item}
                rank={index + 1}
                isDragging={draggingId === item.id}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 底部统计 */}
      <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground border-t border-border pt-3">
        <span>
          共{' '}
          <span className="font-mono font-medium text-foreground">
            {items.length}
          </span>{' '}
          个配置
        </span>
        <span>
          可装{' '}
          <span className="font-mono font-medium text-[hsl(152_60%_22%)]">
            {items.filter((i) => toAssemblyStatus(i.status) === 'ready').length}
          </span>
        </span>
        <span>
          预警{' '}
          <span className="font-mono font-medium text-[hsl(40_65%_25%)]">
            {items.filter((i) => i.status === 'warning').length}
          </span>
        </span>
        <span>
          阻塞{' '}
          <span className="font-mono font-medium text-[hsl(4_60%_28%)]">
            {items.filter((i) => toAssemblyStatus(i.status) === 'blocked').length}
          </span>
        </span>
      </div>
    </section>
  );
}
