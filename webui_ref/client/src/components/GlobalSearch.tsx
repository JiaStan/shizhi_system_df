import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  SearchIcon,
  XIcon,
  FolderOpenIcon,
  PackageIcon,
  TruckIcon,
  ArrowRightIcon,
  CornerDownLeftIcon,
  HashIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IProject, IPart, IDeliveryRecord } from '@/types';
import projectsData from '@shared/static/projects.json';
import partsData from '@shared/static/parts.json';
import deliveryData from '@shared/static/delivery.json';

const projects: IProject[] = projectsData as IProject[];
const parts: IPart[] = partsData as IPart[];
const delivery: IDeliveryRecord[] = deliveryData as IDeliveryRecord[];

/* ─── 风险等级工具 ─── */
function getRiskLevel(rate: number): 'danger' | 'warning' | 'safe' {
  if (rate < 80) return 'danger';
  if (rate < 95) return 'warning';
  return 'safe';
}

const riskColors = {
  danger: 'text-[hsl(4_60%_28%)]',
  warning: 'text-[hsl(40_65%_25%)]',
  safe: 'text-[hsl(152_60%_22%)]',
} as const;

/* ─── 状态配置 ─── */
const STATE_BADGE: Record<string, { emoji: string; bg: string; text: string }> = {
  '入库完成': { emoji: '🟢', bg: 'bg-[hsl(152_45%_95%)]', text: 'text-[hsl(152_60%_22%)]' },
  '已检待入库': { emoji: '🔵', bg: 'bg-[hsl(210_55%_95%)]', text: 'text-[hsl(210_55%_25%)]' },
  '待检': { emoji: '🟡', bg: 'bg-[hsl(40_75%_94%)]', text: 'text-[hsl(40_65%_25%)]' },
  '不合格待判定': { emoji: '🔴', bg: 'bg-[hsl(4_55%_95%)]', text: 'text-[hsl(4_60%_28%)]' },
};

/* ─── 搜索结果类型 ─── */
interface IProjectResult {
  type: 'project';
  id: number;
  title: string;
  subtitle: string;
  meta: string;
  route: string;
}

interface IPartResult {
  type: 'part';
  id: number;
  title: string;
  subtitle: string;
  meta: string;
  projectId: number;
  route: string;
}

interface IDeliveryResult {
  type: 'delivery';
  id: number;
  title: string;
  subtitle: string;
  meta: string;
  state: string;
  projectId: number;
  route: string;
}

type SearchResult = IProjectResult | IPartResult | IDeliveryResult;

/* ─── 高亮匹配文字 ─── */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-primary/20 text-primary-foreground rounded-sm px-0.5 font-semibold">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ─── 分组标题 ─── */
function GroupHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[10px] font-mono font-medium text-muted-foreground/70 bg-accent px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
}

/* ─── 结果行 ─── */
function ResultRow({
  result,
  query,
  isActive,
  onNavigate,
}: {
  result: SearchResult;
  query: string;
  isActive: boolean;
  onNavigate: (route: string) => void;
}) {
  const iconMap = {
    project: FolderOpenIcon,
    part: PackageIcon,
    delivery: TruckIcon,
  };
  const Icon = iconMap[result.type];

  return (
    <button
      onClick={() => onNavigate(result.route)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-left transition-colors group',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 text-foreground',
      )}
    >
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-sm border',
          isActive
            ? 'bg-primary/10 border-primary/30'
            : 'bg-accent/50 border-border/60',
        )}
      >
        <Icon className="size-3.5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          <Highlight text={result.title} query={query} />
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
          <Highlight text={result.subtitle} query={query} />
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {result.type === 'delivery' && (() => {
          const badge = STATE_BADGE[result.state];
          return badge ? (
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', badge.bg, badge.text)}>
              {badge.emoji} {result.state}
            </span>
          ) : null;
        })()}

        {result.type === 'project' && (() => {
          const p = projects.find((pr) => pr.id === result.id);
          if (!p) return null;
          const level = getRiskLevel(p.delivery_rate);
          return (
            <span className={cn('font-mono text-xs font-medium', riskColors[level])}>
              {p.delivery_rate}%
            </span>
          );
        })()}

        {result.type === 'part' && (() => {
          const p = parts.find((pt) => pt.id === result.id);
          if (!p || !p.critical_level) return null;
          const level = getRiskLevel(
            p.critical_level >= 4 ? 60 : p.critical_level >= 3 ? 85 : 100,
          );
          return (
            <span className={cn('font-mono text-xs font-medium', riskColors[level])}>
              {p.critical_level.toFixed(1)}
            </span>
          );
        })()}

        <span className="text-xs text-muted-foreground truncate max-w-[80px]">
          {result.meta}
        </span>

        <ArrowRightIcon
          className={cn(
            'size-3.5 transition-opacity',
            isActive ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-50',
          )}
        />
      </div>
    </button>
  );
}

/* ─── 主组件 ─── */
interface IGlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: IGlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [resultsRef] = useAutoAnimate<HTMLDivElement>({ duration: 120, easing: 'ease-in-out' });

  /* 聚焦输入框 */
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  /* 搜索逻辑 */
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const matchedProjects: IProjectResult[] = projects
      .filter(
        (p) =>
          (p.project_name || '').toLowerCase().includes(q) ||
          p.project_code.toLowerCase().includes(q) ||
          p.apply_code.toLowerCase().includes(q),
      )
      .map((p) => ({
        type: 'project' as const,
        id: p.id,
        title: p.project_name || '未命名项目',
        subtitle: p.project_code,
        meta: `${p.parts_count} 零件`,
        route: `/projects/${p.id}`,
      }));

    const matchedParts: IPartResult[] = parts
      .filter(
        (p) =>
          p.part_code.toLowerCase().includes(q) ||
          p.part_name.toLowerCase().includes(q),
      )
      .map((p) => {
        const proj = projects.find((pr) => pr.id === p.project_id);
        return {
          type: 'part' as const,
          id: p.id,
          title: p.part_name,
          subtitle: p.part_code,
          meta: proj?.project_code || '',
          projectId: p.project_id,
          route: `/projects/${p.project_id}`,
        };
      });

    const matchedDelivery: IDeliveryResult[] = delivery
      .filter(
        (d) =>
          d.delivery_code.toLowerCase().includes(q) ||
          d.part_code.toLowerCase().includes(q) ||
          d.part_name.toLowerCase().includes(q),
      )
      .map((d) => ({
        type: 'delivery' as const,
        id: d.id,
        title: d.part_name,
        subtitle: d.delivery_code,
        meta: d.professional,
        state: d.state,
        projectId: d.project_id,
        route: `/projects/${d.project_id}`,
      }));

    return [...matchedProjects, ...matchedParts, ...matchedDelivery];
  }, [query]);

  /* 重置选中 */
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  /* 键盘导航 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        handleNavigate(results[activeIndex].route);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [results, activeIndex, onClose],
  );

  const handleNavigate = useCallback(
    (route: string) => {
      navigate(route);
      onClose();
    },
    [navigate, onClose],
  );

  /* 分组统计 */
  const groupCounts = useMemo(() => {
    const projects_ = results.filter((r) => r.type === 'project');
    const parts_ = results.filter((r) => r.type === 'part');
    const delivery_ = results.filter((r) => r.type === 'delivery');
    return { projects: projects_, parts: parts_, delivery: delivery_ };
  }, [results]);

  /* 分组渲染 */
  const groupedResults = useMemo(() => {
    const groups: Array<{
      icon: React.ElementType;
      label: string;
      items: SearchResult[];
    }> = [];
    if (groupCounts.projects.length > 0) {
      groups.push({
        icon: FolderOpenIcon,
        label: '项目',
        items: groupCounts.projects,
      });
    }
    if (groupCounts.parts.length > 0) {
      groups.push({
        icon: PackageIcon,
        label: '零件',
        items: groupCounts.parts,
      });
    }
    if (groupCounts.delivery.length > 0) {
      groups.push({
        icon: TruckIcon,
        label: '到货记录',
        items: groupCounts.delivery,
      });
    }
    return groups;
  }, [groupCounts]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩层 */}
          <motion.div
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 搜索弹层 */}
          <motion.div
            key="search-modal"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-x-0 top-[12vh] z-50 mx-auto w-full max-w-2xl px-4"
          >
            <div className="rounded-md border border-border bg-card shadow-2xl overflow-hidden">
              {/* 搜索输入区 */}
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <SearchIcon className="size-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="搜索项目名、项目号、零件号、零件名、送货单号..."
                  className="flex-1 min-w-0 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                    className="flex size-6 items-center justify-center rounded-sm hover:bg-accent transition-colors"
                  >
                    <XIcon className="size-3.5 text-muted-foreground" />
                  </button>
                )}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                  <kbd className="px-1.5 py-0.5 rounded-sm border border-border bg-accent/50 font-mono">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* 结果区 */}
              <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
                {query && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex size-12 items-center justify-center rounded-sm border border-border bg-accent/30 mb-3">
                      <SearchIcon className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">无匹配结果</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      未找到与「{query}」相关的项目、零件或到货记录
                    </p>
                  </div>
                )}

                {!query && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <HashIcon className="size-5 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">
                      输入关键词开始搜索
                    </p>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="py-2 px-2 space-y-1">
                    {groupedResults.map((group) => (
                      <div key={group.label}>
                        <GroupHeader
                          icon={group.icon}
                          label={group.label}
                          count={group.items.length}
                        />
                        {group.items.map((item) => {
                          flatIndex++;
                          const idx = flatIndex;
                          return (
                            <ResultRow
                              key={`${item.type}-${item.id}`}
                              result={item}
                              query={query}
                              isActive={idx === activeIndex}
                              onNavigate={handleNavigate}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 底栏操作提示 */}
              {results.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-accent/30">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded-sm border border-border bg-card font-mono">↑↓</kbd>
                      导航
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded-sm border border-border bg-card font-mono">↵</kbd>
                      打开
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded-sm border border-border bg-card font-mono">ESC</kbd>
                      关闭
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {results.length} 条结果
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
