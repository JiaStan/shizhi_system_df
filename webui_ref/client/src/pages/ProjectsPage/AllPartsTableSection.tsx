import { useState, useMemo } from 'react';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import {
  PackageIcon,
  SearchIcon,
  WarehouseIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  XCircleIcon,
  FilterIcon,
  DownloadIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import deliveryRecords from '@shared/static/delivery.json';
import { exportToExcel } from '@/lib/export';
import projectsData from '@shared/static/projects.json';
import type { IDeliveryRecord, IProject, DeliveryState } from '@/types';

const records: IDeliveryRecord[] = deliveryRecords as IDeliveryRecord[];
const projects: IProject[] = projectsData as IProject[];

/* ─── 项目号映射 ─── */
const projectMap = new Map<number, IProject>();
projects.forEach((p) => projectMap.set(p.id, p));

/* ─── 状态配置 ─── */
const STATE_CONFIG: Record<
  string,
  { label: string; emoji: string; bg: string; text: string; border: string }
> = {
  '入库完成': {
    label: '入库完成',
    emoji: '🟢',
    bg: 'bg-[hsl(152_45%_95%)]',
    text: 'text-[hsl(152_60%_22%)]',
    border: 'border-[hsl(152_55%_40%)]',
  },
  '已检待入库': {
    label: '已检待入库',
    emoji: '🔵',
    bg: 'bg-[hsl(210_55%_95%)]',
    text: 'text-[hsl(210_55%_25%)]',
    border: 'border-[hsl(210_60%_48%)]',
  },
  '待检': {
    label: '待检',
    emoji: '🟡',
    bg: 'bg-[hsl(40_75%_94%)]',
    text: 'text-[hsl(40_65%_25%)]',
    border: 'border-[hsl(40_70%_50%)]',
  },
  '不合格待判定': {
    label: '不合格待判定',
    emoji: '🔴',
    bg: 'bg-[hsl(4_55%_95%)]',
    text: 'text-[hsl(4_60%_28%)]',
    border: 'border-[hsl(4_65%_48%)]',
  },
};

/* ─── 匹配级别配置 ─── */
const MATCH_CONFIG: Record<
  string,
  { label: string; emoji: string; bg: string; text: string; border: string }
> = {
  strong: {
    label: '强匹配',
    emoji: '🟢',
    bg: 'bg-[hsl(152_45%_95%)]',
    text: 'text-[hsl(152_60%_22%)]',
    border: 'border-[hsl(152_55%_40%)]',
  },
  weak: {
    label: '弱匹配',
    emoji: '🟡',
    bg: 'bg-[hsl(40_75%_94%)]',
    text: 'text-[hsl(40_65%_25%)]',
    border: 'border-[hsl(40_70%_50%)]',
  },
  fuzzy: {
    label: '模糊匹配',
    emoji: '🔴',
    bg: 'bg-[hsl(4_55%_95%)]',
    text: 'text-[hsl(4_60%_28%)]',
    border: 'border-[hsl(4_65%_48%)]',
  },
  unique: {
    label: '唯一源',
    emoji: '⚪',
    bg: 'bg-[hsl(215_10%_95%)]',
    text: 'text-[hsl(215_14%_38%)]',
    border: 'border-[hsl(215_12%_75%)]',
  },
};

const STATE_FILTERS = [
  { value: 'all', label: '全部状态' },
  { value: '入库完成', label: '🟢 入库完成' },
  { value: '已检待入库', label: '🔵 已检待入库' },
  { value: '待检', label: '🟡 待检' },
  { value: '不合格待判定', label: '🔴 不合格待判定' },
];

const SOURCE_FILTERS = [
  { value: 'all', label: '全部来源' },
  { value: 'warehouse', label: '🏭 仓库系统' },
  { value: 'feishu', label: '📋 飞书共享表' },
];

/* ─── 行背景色 ─── */
function getRowClassName(state: string): string {
  if (state === '不合格待判定') return 'bg-[hsl(4_55%_95%)]';
  if (state === '待检') return 'bg-[hsl(40_75%_94%)]';
  return '';
}

export default function AllPartsTableSection() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  /* ─── 筛选 ─── */
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (stateFilter !== 'all' && r.state !== stateFilter) return false;
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.part_code.toLowerCase().includes(q) ||
          r.part_name.toLowerCase().includes(q) ||
          r.delivery_code.toLowerCase().includes(q) ||
          r.professional.toLowerCase().includes(q) ||
          r.warehouse.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, stateFilter, sourceFilter]);

  /* ─── 汇总统计 ─── */
  const stats = useMemo(() => {
    const total = records.length;
    const stateCounts: Record<string, number> = {};
    let totalOrder = 0;
    let totalReceived = 0;
    let totalIn = 0;
    let totalUnqualified = 0;
    records.forEach((r) => {
      stateCounts[r.state] = (stateCounts[r.state] || 0) + 1;
      totalOrder += r.order_qty;
      totalReceived += r.received_qty;
      totalIn += r.in_qty;
      totalUnqualified += r.unqualified_qty;
    });
    return { total, stateCounts, totalOrder, totalReceived, totalIn, totalUnqualified };
  }, []);

  /* ─── 表格列 ─── */
  const columns: Array<Record<string, unknown>> = [
    {
      title: '零件号',
      dataIndex: 'part_code',
      key: 'part_code',
      width: 160,
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
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <span className="text-sm text-foreground">{text}</span>
      ),
    },
    {
      title: '所属项目',
      dataIndex: 'project_id',
      key: 'project_name',
      width: 150,
      render: (id: number) => {
        const p = projectMap.get(id);
        return (
          <span className="text-sm text-foreground">
            {p?.project_name || p?.project_code || '-'}
          </span>
        );
      },
    },
    {
      title: '送货单号',
      dataIndex: 'delivery_code',
      key: 'delivery_code',
      width: 155,
      render: (text: string) => (
        <span className="font-mono text-xs text-muted-foreground">{text}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 140,
      render: (state: string) => {
        const cfg = STATE_CONFIG[state];
        if (!cfg) return <span className="text-sm">{state}</span>;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            <span>{cfg.emoji}</span>
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: '订单数量',
      dataIndex: 'order_qty',
      key: 'order_qty',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <span className="font-mono text-sm font-medium text-foreground">{v}</span>
      ),
    },
    {
      title: '收货数量',
      dataIndex: 'received_qty',
      key: 'received_qty',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <span className="font-mono text-sm font-medium text-foreground">{v}</span>
      ),
    },
    {
      title: '入库数量',
      dataIndex: 'in_qty',
      key: 'in_qty',
      width: 90,
      align: 'right' as const,
      render: (v: number, record: IDeliveryRecord) => {
        const isComplete = v >= record.order_qty;
        return (
          <span
            className={`font-mono text-sm font-medium ${
              isComplete
                ? 'text-[hsl(152_60%_22%)]'
                : v > 0
                  ? 'text-[hsl(40_65%_25%)]'
                  : 'text-muted-foreground'
            }`}
          >
            {v}
          </span>
        );
      },
    },
    {
      title: '不合格',
      dataIndex: 'unqualified_qty',
      key: 'unqualified_qty',
      width: 80,
      align: 'right' as const,
      render: (v: number) =>
        v > 0 ? (
          <span className="font-mono text-sm font-medium text-[hsl(4_60%_28%)]">
            {v}
          </span>
        ) : (
          <span className="font-mono text-sm text-muted-foreground">0</span>
        ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => {
        if (source === 'warehouse') {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <WarehouseIcon className="size-3" />
              仓库系统
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <FileSpreadsheetIcon className="size-3" />
            飞书共享表
          </span>
        );
      },
    },
    {
      title: '匹配级别',
      dataIndex: 'match_level',
      key: 'match_level',
      width: 105,
      render: (level: string) => {
        const cfg = MATCH_CONFIG[level];
        if (!cfg) return <span className="text-xs">{level}</span>;
        return (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            <span className="text-[10px]">{cfg.emoji}</span>
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: '仓库',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 110,
      render: (text: string) => (
        <span className="text-xs text-muted-foreground">{text}</span>
      ),
    },
    {
      title: '专业师',
      dataIndex: 'professional',
      key: 'professional',
      width: 90,
      render: (text: string) => (
        <span className="text-sm text-foreground">{text}</span>
      ),
    },
    {
      title: '收货时间',
      dataIndex: 'recive_time',
      key: 'recive_time',
      width: 110,
      render: (text: string) => (
        <span className="font-mono text-xs text-muted-foreground">{text}</span>
      ),
    },
  ];

  return (
    <section className="w-full">
      {/* ── 区块标题 ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-sm bg-accent">
            <PackageIcon className="size-4 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              仓库到货零件总览
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              仓库爬取的全部零件到货记录
            </p>
          </div>
        </div>
        {/* 汇总摘要 */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            共{' '}
            <span className="font-mono font-medium text-foreground">
              {stats.total}
            </span>{' '}
            条记录
          </span>
          <span className="h-3 w-px bg-border" />
          <span>
            已入库{' '}
            <span className="font-mono font-medium text-[hsl(152_60%_22%)]">
              {stats.totalIn}
            </span>{' '}
            件
          </span>
          {stats.totalUnqualified > 0 && (
            <>
              <span className="h-3 w-px bg-border" />
              <span>
                不合格{' '}
                <span className="font-mono font-medium text-[hsl(4_60%_28%)]">
                  {stats.totalUnqualified}
                </span>{' '}
                件
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── 筛选栏 ── */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索零件号、零件名、送货单号、专业师..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <FilterIcon className="size-3.5 text-muted-foreground" />
          {STATE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={stateFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStateFilter(f.value)}
              className={`h-7 px-2.5 text-xs ${
                stateFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {SOURCE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={sourceFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSourceFilter(f.value)}
              className={`h-7 px-2.5 text-xs ${
                sourceFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        {/* 筛选后计数 */}
        {filtered.length !== records.length && (
          <span className="text-xs text-muted-foreground">
            筛选结果:{' '}
            <span className="font-mono font-medium text-foreground">
              {filtered.length}
            </span>{' '}
            / {records.length} 条
          </span>
        )}
        {/* 导出按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs ml-auto"
          onClick={() =>
            exportToExcel(
              filtered as unknown as Record<string, unknown>[],
              [
                { key: 'part_code', title: '零件号', width: 16 },
                { key: 'part_name', title: '零件名称', width: 20 },
                { key: 'delivery_code', title: '送货单号', width: 18 },
                { key: 'state', title: '状态', width: 12 },
                { key: 'order_qty', title: '订单数量', width: 10 },
                { key: 'received_qty', title: '收货数量', width: 10 },
                { key: 'in_qty', title: '入库数量', width: 10 },
                { key: 'unqualified_qty', title: '不合格数', width: 10 },
                { key: 'warehouse', title: '仓库', width: 14 },
                { key: 'professional', title: '专业师', width: 10 },
                { key: 'recive_time', title: '收货时间', width: 14 },
              ],
              '仓库到货零件总览',
            )
          }
        >
          <DownloadIcon className="size-3.5 mr-1" />
          导出 Excel
        </Button>
      </div>

      {/* ── 数据表格 ── */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <Table
          columns={columns}
          dataSource={filtered.map((r) => ({ ...r, key: r.id }))}
          scroll={{ x: 1800, y: 520 }}
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total: number) => `共 ${total} 条`,
            size: 'small',
          }}
          rowClassName={(record) =>
            getRowClassName((record as IDeliveryRecord).state)
          }
        />
      </div>

      {/* ── 底部状态分布条 ── */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {Object.entries(STATE_CONFIG).map(([state, cfg]) => {
          const count = stats.stateCounts[state] || 0;
          const pct =
            stats.total > 0
              ? ((count / stats.total) * 100).toFixed(1)
              : '0.0';
          return (
            <span key={state} className="inline-flex items-center gap-1.5">
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
              <span className="font-mono font-medium text-foreground">
                {count}
              </span>
              <span className="text-muted-foreground/60">({pct}%)</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
