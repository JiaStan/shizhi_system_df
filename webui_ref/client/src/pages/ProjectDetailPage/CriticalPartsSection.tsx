import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { BrainIcon, ShieldIcon, BoxIcon, PackageSearchIcon, WrenchIcon, SparklesIcon } from 'lucide-react';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { IPart } from '@/types';
import allParts from '@shared/static/parts.json';

/** 关键件等级判定 */
function getCriticalLevel(score: number): 'critical' | 'sub-critical' | 'normal' {
  if (score >= 4.0) return 'critical';
  if (score >= 3.0) return 'sub-critical';
  return 'normal';
}

/** 关键件等级样式映射 */
const LEVEL_STYLES = {
  critical: {
    badge: 'bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] border border-[hsl(4_65%_48%)]',
    row: 'bg-[hsl(4_55%_95%)]',
    label: '关键件',
    barColor: '#ef4444',
  },
  'sub-critical': {
    badge: 'bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)] border border-[hsl(40_70%_50%)]',
    row: 'bg-[hsl(40_75%_94%)]',
    label: '次关键',
    barColor: '#f59e0b',
  },
  normal: {
    badge: 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border border-[hsl(152_55%_40%)]',
    row: '',
    label: '常规',
    barColor: '#22c55e',
  },
} as const;

/** 维度分数条 */
function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color =
    value >= 4 ? '#ef4444' : value >= 3 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm font-medium tracking-tight w-3 text-right">
        {value}
      </span>
      <div className="w-[60px] h-1.5 bg-[hsl(215_16%_90%)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function CriticalPartsSection() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const projectParts = useMemo(
    () => (allParts as IPart[]).filter((p) => p.project_id === projectId),
    [projectId]
  );

  const [isScoring, setIsScoring] = useState(false);
  const [scoringStatus, setScoringStatus] = useState<'idle' | 'scored'>('scored');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  /* ── 统计 ── */
  const stats = useMemo(() => {
    const critical = projectParts.filter((p) => p.critical_level >= 4.0).length;
    const sub = projectParts.filter(
      (p) => p.critical_level >= 3.0 && p.critical_level < 4.0
    ).length;
    const normal = projectParts.filter((p) => p.critical_level < 3.0).length;
    return { critical, sub, normal, total: projectParts.length };
  }, [projectParts]);

  /* ── 筛选 ── */
  const filteredParts = useMemo(() => {
    if (filterLevel === 'all') return projectParts;
    return projectParts.filter((p) => getCriticalLevel(p.critical_level) === filterLevel);
  }, [projectParts, filterLevel]);

  /* ── AI 评分 ── */
  const handleAiScore = async () => {
    setIsScoring(true);
    try {
      const text = projectParts
        .map((p) => `[${p.part_code}] ${p.part_name}`)
        .join('\n');
      await capabilityClient
        .load('critical_part_4d_scoring_1')
        .call('textToJson', { parts_list_text: text });
      setScoringStatus('scored');
    } catch {
      // 插件调用失败保留现有评分数据
    } finally {
      setIsScoring(false);
    }
  };

  /* ── 列定义 ── */
  const columns = [
    {
      title: '零件号',
      dataIndex: 'part_code',
      key: 'part_code',
      width: 170,
      fixed: 'left' as const,
      render: (text: string) => (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">
          {text}
        </span>
      ),
    },
    {
      title: '零件名称',
      dataIndex: 'part_name',
      key: 'part_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: (
        <span className="inline-flex items-center gap-1">
          <ShieldIcon className="size-3 text-[hsl(4_65%_48%)]" />
          安全
        </span>
      ),
      dataIndex: 'safety',
      key: 'safety',
      width: 90,
      sorter: (a: IPart, b: IPart) => a.safety - b.safety,
      render: (v: number) => <ScoreBar value={v} />,
    },
    {
      title: (
        <span className="inline-flex items-center gap-1">
          <BoxIcon className="size-3 text-[hsl(215_14%_48%)]" />
          大件
        </span>
      ),
      dataIndex: 'size',
      key: 'size',
      width: 90,
      sorter: (a: IPart, b: IPart) => a.size - b.size,
      render: (v: number) => <ScoreBar value={v} />,
    },
    {
      title: (
        <span className="inline-flex items-center gap-1">
          <PackageSearchIcon className="size-3 text-[hsl(40_70%_50%)]" />
          紧缺
        </span>
      ),
      dataIndex: 'scarcity',
      key: 'scarcity',
      width: 90,
      sorter: (a: IPart, b: IPart) => a.scarcity - b.scarcity,
      render: (v: number) => <ScoreBar value={v} />,
    },
    {
      title: (
        <span className="inline-flex items-center gap-1">
          <WrenchIcon className="size-3 text-[hsl(210_60%_48%)]" />
          工艺
        </span>
      ),
      dataIndex: 'process',
      key: 'process',
      width: 90,
      sorter: (a: IPart, b: IPart) => a.process - b.process,
      render: (v: number) => <ScoreBar value={v} />,
    },
    {
      title: '加权总分',
      dataIndex: 'critical_level',
      key: 'critical_level',
      width: 110,
      sorter: (a: IPart, b: IPart) => a.critical_level - b.critical_level,
      defaultSortOrder: 'descend' as const,
      render: (score: number) => {
        const pct = (score / 5) * 100;
        const level = getCriticalLevel(score);
        const style = LEVEL_STYLES[level];
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tracking-tight w-8">
              {score.toFixed(1)}
            </span>
            <div className="w-[72px] h-1.5 bg-[hsl(215_16%_90%)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: style.barColor,
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: '等级',
      key: 'level',
      width: 90,
      filters: [
        { text: '关键件', value: 'critical' },
        { text: '次关键', value: 'sub-critical' },
        { text: '常规', value: 'normal' },
      ],
      onFilter: (value: unknown, record: IPart) =>
        getCriticalLevel(record.critical_level) === value,
      render: (_: unknown, record: IPart) => {
        const level = getCriticalLevel(record.critical_level);
        const style = LEVEL_STYLES[level];
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.badge}`}
          >
            {style.label}
          </span>
        );
      },
    },
    {
      title: '评分理由',
      dataIndex: 'critical_reason',
      key: 'critical_reason',
      width: 260,
      ellipsis: true,
      render: (text: string) => (
        <span className="text-xs text-muted-foreground leading-relaxed">
          {text || '—'}
        </span>
      ),
    },
  ];

  /* ── 加载中 ── */
  if (projectParts.length === 0) {
    return (
      <section className="w-full">
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BrainIcon className="size-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">关键件评分卡</h3>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-accent rounded-sm" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {/* AI 内容标识：琥珀色左边框 */}
      <div className="bg-card border border-border rounded-sm border-l-3 border-l-[hsl(42_96%_52%)]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-sm bg-[hsl(42_96%_52%)]/10">
              <BrainIcon className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                关键件评分卡
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI 四维度加权评分 · 安全 30% / 大件 20% / 紧缺 30% / 工艺 20%
              </p>
            </div>
          </div>
          <Button
            onClick={handleAiScore}
            disabled={isScoring}
            className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] rounded-md px-4 py-2 text-sm font-medium transition-transform"
          >
            {isScoring ? (
              <>
                <span className="size-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                评分中...
              </>
            ) : (
              <>
                <SparklesIcon className="size-3.5 mr-1.5" />
                {scoringStatus === 'scored' ? '重新评分' : 'AI 评分'}
              </>
            )}
          </Button>
        </div>

        {/* 统计摘要 + 筛选器 */}
        <div className="flex items-center gap-6 px-5 py-3 border-b border-border/60 flex-wrap">
          {/* 统计胶囊 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterLevel('all')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterLevel === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              全部
              <span className="font-mono font-semibold">{stats.total}</span>
            </button>
            <button
              onClick={() => setFilterLevel('critical')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterLevel === 'critical'
                  ? 'bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <span className="size-1.5 rounded-full bg-[hsl(4_65%_48%)]" />
              关键件
              <span className="font-mono font-semibold">{stats.critical}</span>
            </button>
            <button
              onClick={() => setFilterLevel('sub-critical')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterLevel === 'sub-critical'
                  ? 'bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <span className="size-1.5 rounded-full bg-[hsl(40_70%_50%)]" />
              次关键
              <span className="font-mono font-semibold">{stats.sub}</span>
            </button>
            <button
              onClick={() => setFilterLevel('normal')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterLevel === 'normal'
                  ? 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <span className="size-1.5 rounded-full bg-[hsl(152_55%_40%)]" />
              常规
              <span className="font-mono font-semibold">{stats.normal}</span>
            </button>
          </div>

          {/* 权重说明 */}
          <div className="ml-auto text-xs text-muted-foreground">
            满分 5.0 · ≥4.0 关键 · 3.0–3.9 次关键 · &lt;3.0 常规
          </div>
        </div>

        {/* 评分表格 */}
        <div className="critical-parts-table">
          <Table
            columns={columns}
            dataSource={filteredParts}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total: number) => `共 ${total} 个零件`,
              size: 'small',
            }}
            scroll={{ x: 1100 }}
            rowClassName={(record: IPart) => {
              const level = getCriticalLevel(record.critical_level);
              return LEVEL_STYLES[level].row;
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .critical-parts-table :global(.ant-table) {
          background: transparent;
          font-size: 14px;
        }
        .critical-parts-table :global(.ant-table-thead > tr > th) {
          background: hsl(215 14% 93% / 0.5);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: hsl(215 30% 14%);
          border-bottom: 1px solid hsl(215 16% 90%);
          padding: 10px 12px;
        }
        .critical-parts-table :global(.ant-table-tbody > tr > td) {
          padding: 10px 12px;
          border-bottom: 1px solid hsl(215 16% 90% / 0.6);
          vertical-align: middle;
        }
        .critical-parts-table :global(.ant-table-tbody > tr:hover > td) {
          background: hsl(215 14% 93% / 0.3);
        }
        .critical-parts-table :global(.ant-pagination) {
          padding: 12px 16px;
          margin: 0;
        }
        .critical-parts-table :global(.ant-table-fixed-left) {
          box-shadow: 2px 0 4px hsl(0 0% 0% / 0.04);
        }
      `}</style>
    </section>
  );
}
