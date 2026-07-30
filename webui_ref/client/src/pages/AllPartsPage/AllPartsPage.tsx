import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  PackageIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  WarehouseIcon,
  FileSpreadsheetIcon,
  CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import deliveryRecords from '@shared/static/delivery.json';
import type { IDeliveryRecord } from '@/types';
import AllPartsTableSection from '../ProjectsPage/AllPartsTableSection';

const records: IDeliveryRecord[] = deliveryRecords as IDeliveryRecord[];

const NOW = new Date('2026-06-23T15:00:00');

const TIME_RANGES = [
  { key: 'all', label: '全部' },
  { key: '24h', label: '24小时' },
  { key: '3d', label: '最近3天' },
  { key: '7d', label: '最近一周' },
  { key: '30d', label: '最近一月' },
  { key: '1y', label: '最近一年' },
] as const;

type TimeRangeKey = (typeof TIME_RANGES)[number]['key'];

function filterByTimeRange(data: IDeliveryRecord[], range: TimeRangeKey): IDeliveryRecord[] {
  if (range === 'all') return data;
  const msMap: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  };
  const ms = msMap[range];
  if (!ms) return data;
  const cutoff = new Date(NOW.getTime() - ms);
  return data.filter((r) => new Date(r.recive_time) >= cutoff);
}

const STATE_COLORS: Record<string, string> = {
  '入库完成': '#4a9e6f',
  '已检待入库': '#3d7ec4',
  '待检': '#d4a033',
  '不合格待判定': '#c94545',
};

const SOURCE_COLORS: Record<string, string> = {
  warehouse: '#3d7ec4',
  feishu: '#d4a033',
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'tween', duration: 0.22, ease: 'easeOut' } },
};

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  },
};

export default function AllPartsPage() {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('all');

  const filtered = useMemo(() => filterByTimeRange(records, timeRange), [timeRange]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const stateCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    let totalIn = 0;
    let totalUnqualified = 0;
    let totalOrder = 0;

    filtered.forEach((r) => {
      stateCounts[r.state] = (stateCounts[r.state] || 0) + 1;
      sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
      totalIn += r.in_qty;
      totalUnqualified += r.unqualified_qty;
      totalOrder += r.order_qty;
    });

    return { total, stateCounts, sourceCounts, totalIn, totalUnqualified, totalOrder };
  }, [filtered]);

  const deliveryRate = stats.totalOrder > 0 ? Math.round((stats.totalIn / stats.totalOrder) * 1000) / 10 : 0;
  const deliveryColor = deliveryRate >= 95
    ? { top: 'border-t-[hsl(152_55%_40%)]', bg: 'bg-[hsl(152_45%_95%)]', text: 'text-[hsl(152_60%_22%)]' }
    : deliveryRate >= 80
      ? { top: 'border-t-[hsl(40_70%_50%)]', bg: 'bg-[hsl(40_75%_94%)]', text: 'text-[hsl(40_65%_25%)]' }
      : { top: 'border-t-[hsl(4_65%_48%)]', bg: 'bg-[hsl(4_55%_95%)]', text: 'text-[hsl(4_60%_28%)]' };

  const pendingInspection = stats.stateCounts['待检'] || 0;
  const unqualifiedPending = stats.stateCounts['不合格待判定'] || 0;

  const kpiCards = [
    { label: '到货记录', value: stats.total, unit: '条', icon: PackageIcon, topColor: 'border-t-[hsl(210_60%_48%)]', iconBg: 'bg-[hsl(210_55%_95%)]', iconColor: 'text-[hsl(210_55%_35%)]' },
    { label: '已入库', value: stats.totalIn, unit: '件', icon: CheckCircle2Icon, topColor: deliveryColor.top, iconBg: deliveryColor.bg, iconColor: deliveryColor.text },
    { label: '待检', value: pendingInspection, unit: '条', icon: ClockIcon, topColor: pendingInspection > 0 ? 'border-t-[hsl(40_70%_50%)]' : 'border-t-[hsl(152_55%_40%)]', iconBg: pendingInspection > 0 ? 'bg-[hsl(40_75%_94%)]' : 'bg-[hsl(152_45%_95%)]', iconColor: pendingInspection > 0 ? 'text-[hsl(40_65%_25%)]' : 'text-[hsl(152_60%_22%)]' },
    { label: '不合格待判定', value: unqualifiedPending, unit: '条', icon: AlertTriangleIcon, topColor: unqualifiedPending > 0 ? 'border-t-[hsl(4_65%_48%)]' : 'border-t-[hsl(152_55%_40%)]', iconBg: unqualifiedPending > 0 ? 'bg-[hsl(4_55%_95%)]' : 'bg-[hsl(152_45%_95%)]', iconColor: unqualifiedPending > 0 ? 'text-[hsl(4_60%_28%)]' : 'text-[hsl(152_60%_22%)]' },
  ];

  const statePieData = Object.entries(stats.stateCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, itemStyle: { color: STATE_COLORS[name] || '#a8b0bd' } }));

  const statePieOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<div style="font-size:13px;line-height:1.6"><span style="font-weight:600">${p.name}</span><br/>数量：<span style="font-family:monospace;font-weight:500">${p.value}</span> 条<br/>占比：<span style="font-family:monospace;font-weight:500">${p.percent}%</span></div>`;
      },
    },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11, color: '#6b7685' }, itemWidth: 10, itemHeight: 10, itemGap: 12 },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: false }, scaleSize: 5 },
      data: statePieData,
    }],
  };

  const sourceLabels: Record<string, string> = { warehouse: '仓库系统', feishu: '飞书共享表' };
  const sourcePieData = Object.entries(stats.sourceCounts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: sourceLabels[key] || key, value, itemStyle: { color: SOURCE_COLORS[key] || '#a8b0bd' } }));

  const sourcePieOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<div style="font-size:13px;line-height:1.6"><span style="font-weight:600">${p.name}</span><br/>数量：<span style="font-family:monospace;font-weight:500">${p.value}</span> 条<br/>占比：<span style="font-family:monospace;font-weight:500">${p.percent}%</span></div>`;
      },
    },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11, color: '#6b7685' }, itemWidth: 10, itemHeight: 10, itemGap: 12 },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: false }, scaleSize: 5 },
      data: sourcePieData,
    }],
  };

  return (
    <motion.div
      className="w-full space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── 到货统计总览 ── */}
      <section className="w-full space-y-5">
        {/* 时间范围选择器 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-sm bg-accent">
              <PackageIcon className="size-4 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">到货统计总览</h2>
              <p className="text-xs text-muted-foreground mt-0.5">全量到货数据的统计概览与分布可视化</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
            {TIME_RANGES.map((t) => (
              <Button
                key={t.key}
                variant={timeRange === t.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(t.key)}
                className={`h-7 px-2.5 text-xs ${timeRange === t.key ? 'bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI 统计卡片 */}
        {records.length > 0 && (
          <motion.div
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`kpi-${timeRange}`}
          >
            {kpiCards.map((card) => (
              <motion.div
                key={card.label}
                variants={cardVariants}
                className={`bg-card border border-border rounded-sm border-t-2 ${card.topColor} p-4 hover:border-border/80 hover:shadow-sm transition-shadow duration-150`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-bold tracking-tight text-foreground">{card.value.toLocaleString()}</span>
                      <span className="text-xs font-medium text-muted-foreground">{card.unit}</span>
                    </div>
                  </div>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${card.iconBg}`}>
                    <card.icon className={`size-3.5 ${card.iconColor}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* 图表区域 */}
        {records.length > 0 && (
          <motion.div
            className="grid grid-cols-1 gap-4 lg:grid-cols-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`charts-${timeRange}`}
          >
            {/* 状态分布饼图 */}
            <motion.div variants={cardVariants} className="bg-card border border-border rounded-sm p-4 lg:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">到货状态分布</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">按 STATE 字段分类统计</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-foreground">{filtered.length}</span>
                  <span className="text-[11px] text-muted-foreground">条</span>
                </div>
              </div>
              {statePieData.length > 0 ? (
                <ReactECharts option={statePieOption} theme="ud" className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">当前时间范围内无数据</div>
              )}
            </motion.div>

            {/* 来源分布饼图 */}
            <motion.div variants={cardVariants} className="bg-card border border-border rounded-sm p-4 lg:col-span-2">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-foreground">数据来源分布</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">仓库系统 vs 飞书共享表</p>
              </div>
              {sourcePieData.length > 0 ? (
                <ReactECharts option={sourcePieOption} theme="ud" className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">当前时间范围内无数据</div>
              )}
              {sourcePieData.length > 0 && (
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  {(stats.sourceCounts['warehouse'] || 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <WarehouseIcon className="size-3 text-[hsl(210_55%_35%)]" />
                      仓库系统
                      <span className="font-mono font-medium text-foreground">{stats.sourceCounts['warehouse'] || 0}</span>
                    </span>
                  )}
                  {(stats.sourceCounts['feishu'] || 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileSpreadsheetIcon className="size-3 text-[hsl(40_65%_25%)]" />
                      飞书共享表
                      <span className="font-mono font-medium text-foreground">{stats.sourceCounts['feishu'] || 0}</span>
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {records.length === 0 && (
          <div className="bg-card border border-border rounded-sm p-8 text-center">
            <PackageIcon className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">暂无到货数据</p>
          </div>
        )}
      </section>

      {/* ── 到货零件明细表格 ── */}
      <section className="w-full">
        <AllPartsTableSection />
      </section>
    </motion.div>
  );
}
