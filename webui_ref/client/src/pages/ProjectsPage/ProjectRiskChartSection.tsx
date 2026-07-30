import { useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { Card, CardContent } from '@/components/ui/card';
import projectsData from '@shared/static/projects.json';
import type { IProject } from '@/types';

const projects: IProject[] = projectsData as IProject[];

/* ─── 风险等级判定 ─── */
function getRiskLevel(rate: number): 'safe' | 'warning' | 'danger' {
  if (rate >= 95) return 'safe';
  if (rate >= 80) return 'warning';
  return 'danger';
}

const RISK_META = {
  safe: { label: '正常', color: '#4a9e6f', bg: 'bg-[hsl(152_45%_95%)]', text: 'text-[hsl(152_60%_22%)]', border: 'border-[hsl(152_55%_40%)]' },
  warning: { label: '预警', color: '#d4a033', bg: 'bg-[hsl(40_75%_94%)]', text: 'text-[hsl(40_65%_25%)]', border: 'border-[hsl(40_70%_50%)]' },
  danger: { label: '风险', color: '#c94545', bg: 'bg-[hsl(4_55%_95%)]', text: 'text-[hsl(4_60%_28%)]', border: 'border-[hsl(4_65%_48%)]' },
} as const;

/* ─── 动画 ─── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'tween', duration: 0.25, ease: 'easeOut' } },
};

/* ─── 组件 ─── */
export default function ProjectRiskChartSection() {
  /* ── 风险分布数据 ── */
  const { riskDistribution, totalProjects } = useMemo(() => {
    const counts = { safe: 0, warning: 0, danger: 0 };
    projects.forEach((p) => {
      counts[getRiskLevel(p.delivery_rate)] += 1;
    });
    const dist = (['safe', 'warning', 'danger'] as const)
      .filter((key) => counts[key] > 0)
      .map((key) => ({
        name: RISK_META[key].label,
        value: counts[key],
        color: RISK_META[key].color,
      }));
    return { riskDistribution: dist, totalProjects: projects.length };
  }, []);

  /* ── 到货率柱状图数据 ── */
  const barData = useMemo(() => {
    const sorted = [...projects].sort((a, b) => b.delivery_rate - a.delivery_rate);
    return sorted.map((p) => ({
      name: p.project_name || p.project_code,
      rate: p.delivery_rate,
      critical: p.critical_ready_rate,
    }));
  }, []);

  /* ── 饼图配置 ── */
  const pieOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (params: TopLevelFormatterParams) => {
          const p = params as { name: string; value: number; percent: number };
          return `<div style="font-size:13px;line-height:1.8">
            <span style="font-weight:600">${p.name}</span><br/>
            项目数：<span style="font-family:monospace;font-weight:600">${p.value}</span> 个<br/>
            占比：<span style="font-family:monospace;font-weight:600">${p.percent}%</span>
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
          radius: ['42%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: { show: false },
          emphasis: {
            label: { show: false },
            scaleSize: 5,
          },
          data: riskDistribution.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: item.color },
          })),
        },
      ],
    }),
    [riskDistribution],
  );

  /* ── 柱状图配置 ── */
  const barOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: TopLevelFormatterParams) => {
          const list = Array.isArray(params) ? params : [params];
          const name = list[0]?.name || '';
          let html = `<div style="font-size:13px;line-height:1.8"><span style="font-weight:600">${name}</span><br/>`;
          list.forEach((p) => {
            const marker = p.marker || '';
            html += `${marker} ${p.seriesName}：<span style="font-family:monospace;font-weight:600">${p.value}%</span><br/>`;
          });
          html += '</div>';
          return html;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { fontSize: 12, color: '#6b7685' },
        itemWidth: 12,
        itemHeight: 10,
        itemGap: 16,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: barData.map((d) => d.name),
        boundaryGap: true,
        axisLabel: {
          fontSize: 11,
          color: '#8b95a5',
          interval: 0,
          rotate: barData.length > 4 ? 20 : 0,
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e5ea' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          fontSize: 11,
          color: '#8b95a5',
          formatter: (value: number) => `${value}%`,
        },
        splitLine: { lineStyle: { color: '#f0f2f5', type: 'dashed' } },
      },
      series: [
        {
          name: '到货率',
          type: 'bar',
          barWidth: barData.length > 4 ? '28%' : '36%',
          data: barData.map((d) => ({
            value: d.rate,
            itemStyle: {
              color: d.rate >= 95 ? '#4a9e6f' : d.rate >= 80 ? '#d4a033' : '#c94545',
              borderRadius: [3, 3, 0, 0],
            },
          })),
        },
        {
          name: '关键件齐套率',
          type: 'bar',
          barWidth: barData.length > 4 ? '28%' : '36%',
          data: barData.map((d) => ({
            value: d.critical,
            itemStyle: {
              color: '#3d7ec4',
              borderRadius: [3, 3, 0, 0],
              opacity: 0.65,
            },
          })),
        },
      ],
    }),
    [barData],
  );

  if (totalProjects === 0) return null;

  return (
    <motion.section
      className="w-full grid grid-cols-1 gap-4 lg:grid-cols-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── 风险分布饼图 ── */}
      <motion.div className="lg:col-span-2" variants={cardVariants}>
        <Card className="rounded-sm border border-border h-full">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  项目风险分布
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  按到货率划分的项目健康度
                </p>
              </div>
              <span className="font-mono text-sm font-medium text-muted-foreground">
                共 {totalProjects} 个
              </span>
            </div>

            <ReactECharts
              option={pieOption}
              theme="ud"
              className="h-[300px] w-full"
            />

            {/* 底部汇总标签 */}
            <div className="flex items-center justify-center gap-4 mt-2">
              {riskDistribution.map((item) => (
                <span
                  key={item.name}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                  <span className="font-mono font-medium text-foreground">
                    {item.value}
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 到货率柱状图 ── */}
      <motion.div className="lg:col-span-3" variants={cardVariants}>
        <Card className="rounded-sm border border-border h-full">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  到货率 & 关键件齐套率
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  各项目核心指标对比
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-3 rounded-sm bg-[hsl(215_16%_90%)]" />
                  阈值 95%
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-3 rounded-sm bg-[hsl(40_75%_94%)]" />
                  阈值 80%
                </span>
              </div>
            </div>

            <ReactECharts
              option={barOption}
              theme="ud"
              className="h-[300px] w-full"
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.section>
  );
}
