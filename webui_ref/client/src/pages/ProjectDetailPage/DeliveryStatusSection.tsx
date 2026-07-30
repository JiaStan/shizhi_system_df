import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { ChevronRightIcon } from 'lucide-react';
import deliveryRecords from '@shared/static/delivery.json';
import type { IDeliveryRecord, DeliveryState } from '@/types';

/** 状态语义色（ECharts 仅支持 hex） */
const STATE_META: Record<
  DeliveryState,
  { color: string; bg: string; text: string; border: string; label: string; emoji: string }
> = {
  '入库完成': {
    color: '#4a9e6f',
    bg: 'bg-[hsl(152_45%_95%)]',
    text: 'text-[hsl(152_60%_22%)]',
    border: 'border-[hsl(152_55%_40%)]',
    label: '入库完成',
    emoji: '🟢',
  },
  '已检待入库': {
    color: '#3d7ec4',
    bg: 'bg-[hsl(210_55%_95%)]',
    text: 'text-[hsl(210_55%_25%)]',
    border: 'border-[hsl(210_60%_48%)]',
    label: '已检待入库',
    emoji: '🔵',
  },
  '待检': {
    color: '#d4a033',
    bg: 'bg-[hsl(40_75%_94%)]',
    text: 'text-[hsl(40_65%_25%)]',
    border: 'border-[hsl(40_70%_50%)]',
    label: '待检',
    emoji: '🟡',
  },
  '不合格待判定': {
    color: '#c94545',
    bg: 'bg-[hsl(4_55%_95%)]',
    text: 'text-[hsl(4_60%_28%)]',
    border: 'border-[hsl(4_65%_48%)]',
    label: '不合格待判定',
    emoji: '🔴',
  },
  '其他': {
    color: '#a8b0bd',
    bg: 'bg-[hsl(215_10%_95%)]',
    text: 'text-[hsl(215_14%_38%)]',
    border: 'border-[hsl(215_12%_75%)]',
    label: '其他',
    emoji: '⚪',
  },
};

/** 可跳转的扇区 → 目标路由后缀 */
const NAVIGABLE_STATES: Partial<Record<DeliveryState, string>> = {
  '待检': 'pending-inspection',
  '不合格待判定': 'unqualified-pending',
};

const STATE_ORDER: DeliveryState[] = [
  '入库完成',
  '已检待入库',
  '待检',
  '不合格待判定',
  '其他',
];

export default function DeliveryStatusSection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /* ── 数据聚合 ──────────────────────────────────────── */
  const projectRecords = useMemo(
    () => (deliveryRecords as IDeliveryRecord[]).filter((r) => r.project_id === Number(id)),
    [id],
  );

  const { distribution, totalCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const state of STATE_ORDER) counts[state] = 0;
    let total = 0;

    for (const record of projectRecords) {
      const key = STATE_ORDER.includes(record.state as DeliveryState)
        ? record.state
        : '其他';
      counts[key] = (counts[key] || 0) + 1;
      total += 1;
    }

    const dist = STATE_ORDER
      .filter((s) => counts[s] > 0)
      .map((state) => ({
        name: state,
        value: counts[state],
        percentage: total > 0 ? Math.round((counts[state] / total) * 1000) / 10 : 0,
        meta: STATE_META[state],
      }));

    return { distribution: dist, totalCount: total };
  }, [projectRecords]);

  /* ── ECharts 配置 ─────────────────────────────────── */
  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (params: TopLevelFormatterParams) => {
          const p = params as { name: string; value: number; percent: number };
          return `<div style="font-size:13px;line-height:1.6">
            <span style="font-weight:600">${p.name}</span><br/>
            数量：<span style="font-family:monospace;font-weight:500">${p.value}</span> 条<br/>
            占比：<span style="font-family:monospace;font-weight:500">${p.percent}%</span>
          </div>`;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { fontSize: 12, color: '#6b7685' },
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: { show: false },
          emphasis: {
            label: { show: false },
            scaleSize: 6,
          },
          data: distribution.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: item.meta.color },
          })),
        },
      ],
    }),
    [distribution],
  );

  /* ── 交互处理 ─────────────────────────────────────── */
  const onChartEvents = useMemo(
    () => ({
      click: (params: TopLevelFormatterParams) => {
        const name = (params as { name: string }).name as DeliveryState;
        const target = NAVIGABLE_STATES[name];
        if (target) navigate(`/projects/${id}/${target}`);
      },
    }),
    [id, navigate],
  );

  /* ── 空状态 ─────────────────────────────────────── */
  if (totalCount === 0) {
    return (
      <section className="w-full">
        <Card className="rounded-sm border border-border">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-foreground">到货状态分布</h3>
            <p className="mt-4 text-sm text-muted-foreground">
              当前项目暂无到货数据，请先上传 PBOM 并等待数据匹配。
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  /* ── 渲染 ─────────────────────────────────────────── */
  return (
    <section className="w-full">
      <Card className="rounded-sm border border-border">
        <CardContent className="p-5">
          {/* 标题 */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">到货状态分布</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                基于 delivery_detail 的 STATE 字段分类统计
              </p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-foreground">
                {totalCount}
              </span>
              <span className="text-xs text-muted-foreground">条记录</span>
            </div>
          </div>

          {/* 饼状图 + 状态列表 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* 饼状图（左 3 列） */}
            <div className="lg:col-span-3">
              <ReactECharts
                option={option}
                theme="ud"
                className="h-[300px] w-full"
                onEvents={onChartEvents}
              />
            </div>

            {/* 状态汇总列表（右 2 列） */}
            <div className="flex flex-col justify-center space-y-2.5 lg:col-span-2">
              {distribution.map((item) => {
                const isNavigable = !!NAVIGABLE_STATES[item.name as DeliveryState];

                if (isNavigable) {
                  const target = NAVIGABLE_STATES[item.name as DeliveryState]!;
                  return (
                    <Link
                      key={item.name}
                      to={`/projects/${id}/${target}`}
                      className="group flex items-center gap-3 rounded-sm border border-border px-3.5 py-2.5 transition-colors hover:bg-accent/40 hover:border-accent"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.meta.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.meta.emoji} {item.meta.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {item.value}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.percentage}%
                        </span>
                        <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-sm border border-border/60 px-3.5 py-2.5"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.meta.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.meta.emoji} {item.meta.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-foreground">
                        {item.value}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* 操作提示 */}
              <p className="pt-1 text-center text-xs text-muted-foreground">
                点击
                <span className="mx-0.5 text-[hsl(40_65%_25%)]">待检</span>或
                <span className="mx-0.5 text-[hsl(4_60%_28%)]">不合格待判定</span>
                可跳转查看明细
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
