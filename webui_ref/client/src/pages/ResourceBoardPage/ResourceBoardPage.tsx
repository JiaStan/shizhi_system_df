// 资源占用看板页面
// 需求文档V6 3.4：试制排程矩阵（场地 × 项目 × 周度甘特）+ KPI + 利用率趋势 + 设备利用率排名
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent } from '@client/src/components/ui/card';
import {
  getUtilizationBoard,
  getUtilizationTrend,
  getEquipmentUtilizationRank,
  SCHED_CELL_STATUS_MAP,
  PROJECT_CAT_MAP,
  AREA_TYPE_MAP,
  type UtilizationBoardData,
  type UtilizationTrendData,
  type EquipmentRankData,
  type BoardArea,
  type AreaProject,
  type SchedCellStatus,
} from '@client/src/api/resource/utilization';
import {
  RefreshCw,
  Download,
  Maximize2,
  Minimize2,
  Plus,
  MapPin,
  Wrench,
  Gauge,
  TrendingUp,
} from 'lucide-react';

// ==================== 常量 ====================

type AreaTypeFilter = '' | 'assembly' | 'wp' | 'cx';
type CatFilter = '' | 'A' | 'B' | 'C';
type SchedStatusFilter = '' | SchedCellStatus;

const QUICK_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'all', label: '全部场地' },
  { key: 'assembly', label: '装配车间' },
  { key: 'wp', label: '竞品区' },
  { key: 'cx', label: '外委区' },
  { key: 'A', label: 'A类项目' },
  { key: 'B', label: 'B类项目' },
];

// 矩阵行：场地 + 项目（首行携带 rowSpan 渲染场地信息列）
interface MatrixRow {
  area: BoardArea;
  project: AreaProject | null;
  isFirstOfArea: boolean;
  rowSpan: number;
}

// 内联样式：粘性列与周度甘特格颜色语义
const BOARD_STYLE = `
.util-matrix { border-collapse: collapse; min-width: 100%; font-size: 12px; }
.util-matrix th, .util-matrix td { border: 1px solid hsl(var(--border)); padding: 8px 10px; vertical-align: middle; }
.util-matrix thead th { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); font-weight: 600; white-space: nowrap; position: sticky; top: 0; z-index: 10; }
.util-matrix .sticky-col { position: sticky; z-index: 5; background: hsl(var(--card)); }
.util-matrix thead th.sticky-col { z-index: 12; background: hsl(var(--muted)); }
.util-matrix tbody tr:hover td { background: hsl(var(--muted) / 0.5); }
.util-matrix tbody tr:hover td.sticky-col { background: hsl(var(--muted)); }
.util-matrix .week-col { text-align: center; min-width: 76px; width: 76px; padding: 4px; }
.util-matrix .week-col.is-current { background: hsl(var(--primary) / 0.06); }
.sched-inner { width: 100%; height: 34px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; cursor: default; transition: transform .15s; }
.sched-inner:hover { transform: scale(1.06); }
.sched-cell-done { background: rgba(16,185,129,0.75); color: #fff; }
.sched-cell-doing { background: rgba(16,185,129,0.18); border: 1px solid #10B981; color: #047857; }
.sched-cell-wait { background: rgba(245,158,11,0.45); color: #78350F; }
.sched-cell-plan { background: rgba(239,68,68,0.45); color: #7F1D1D; }
.dark .sched-cell-doing { color: #6EE7B7; }
.dark .sched-cell-wait { color: #FDE68A; }
.dark .sched-cell-plan { color: #FECACA; }
`;

// 粘性列宽度定义（左侧 8 列滚动时固定）
const STICKY_COLS = [
  { key: 'areaId', label: '试料阵地', width: 72, left: 0 },
  { key: 'areaName', label: '单元机台 / 设备', width: 150, left: 72 },
  { key: 'capacity', label: '试制能力', width: 150, left: 222 },
  { key: 'project', label: '项目', width: 130, left: 372 },
  { key: 'budget', label: '零件费总预算(万)', width: 90, left: 502 },
  { key: 'qty', label: '采购数量', width: 72, left: 592 },
  { key: 'done', label: '累计已完成(套)', width: 90, left: 664 },
  { key: 'resource', label: '占用资源', width: 120, left: 754 },
];

// ==================== 子组件 ====================

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: React.ReactNode; color?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3.5">
        <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
        <div className="text-2xl font-bold font-mono leading-tight" style={color ? { color } : undefined}>
          {value}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function CatTag({ cat }: { cat: string }) {
  const info = PROJECT_CAT_MAP[cat] || PROJECT_CAT_MAP.sporadic;
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
      style={{ color: info.color, backgroundColor: info.bgColor }}
    >
      {info.label}
    </span>
  );
}

function FilterItem({
  active,
  label,
  count,
  dotColor,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  dotColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {dotColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>
  );
}

// ==================== 主页面 ====================

export default function ResourceBoardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<UtilizationBoardData | null>(null);
  const [trend, setTrend] = useState<UtilizationTrendData | null>(null);
  const [rank, setRank] = useState<EquipmentRankData | null>(null);

  // 筛选状态
  const [areaType, setAreaType] = useState<AreaTypeFilter>('');
  const [cat, setCat] = useState<CatFilter>('');
  const [schedStatus, setSchedStatus] = useState<SchedStatusFilter>('');
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [boardRes, trendRes, rankRes] = await Promise.all([
        getUtilizationBoard(10),
        getUtilizationTrend(10),
        getEquipmentUtilizationRank(28, 10),
      ]);
      if (boardRes.code === 200) setBoard(boardRes.data);
      if (trendRes.code === 200) setTrend(trendRes.data);
      if (rankRes.code === 200) setRank(rankRes.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`加载资源占用数据失败: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---------- 筛选与矩阵行构建 ----------
  const matrixRows = useMemo<MatrixRow[]>(() => {
    if (!board) return [];
    const rows: MatrixRow[] = [];
    board.areas.forEach((area) => {
      if (areaType && area.area_type !== areaType) return;
      let projects = area.projects;
      if (cat) projects = projects.filter((p) => p.cat === cat);
      if (schedStatus) {
        projects = projects.filter((p) => p.cells.some((c) => c && c.status === schedStatus));
      }
      // 有类别/状态筛选时隐藏无匹配项目的场地
      if ((cat || schedStatus) && projects.length === 0) return;
      const list = projects.length > 0 ? projects : [null];
      list.forEach((p, idx) => {
        rows.push({
          area,
          project: p,
          isFirstOfArea: idx === 0,
          rowSpan: list.length,
        });
      });
    });
    return rows;
  }, [board, areaType, cat, schedStatus]);

  // 筛选统计
  const filterStats = useMemo(() => {
    const areas = new Set(matrixRows.map((r) => r.area.zone_code));
    const projects = matrixRows.filter((r) => r.project).map((r) => r.project!) ;
    return {
      areaCount: areas.size,
      projectCount: projects.length,
      budgetTotal: projects.reduce((s, p) => s + p.budget, 0),
    };
  }, [matrixRows]);

  // ---------- 图表配置 ----------
  const trendOption = useMemo(() => {
    if (!trend) return null;
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['场地占用率', '排程项目数'], textStyle: { fontSize: 11 } },
      grid: { left: 46, right: 40, top: 40, bottom: 28 },
      xAxis: { type: 'category', data: trend.trend.map((t) => t.week), axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontSize: 10 } },
        { type: 'value', axisLabel: { fontSize: 10 } },
      ],
      series: [
        {
          name: '场地占用率',
          type: 'line',
          smooth: true,
          data: trend.trend.map((t) => t.occupancy_rate),
          itemStyle: { color: '#1677FF' },
          areaStyle: { opacity: 0.12 },
        },
        {
          name: '排程项目数',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: 14,
          data: trend.trend.map((t) => t.project_count),
          itemStyle: { color: 'rgba(22,119,255,0.35)', borderRadius: [2, 2, 0, 0] },
        },
      ],
    };
  }, [trend]);

  const rankOption = useMemo(() => {
    if (!rank) return null;
    const items = [...rank.ranking].reverse();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          const item = items.find((i) => i.equipment_code === p.name);
          return `${p.name} ${item?.equipment_name || ''}<br/>利用率: ${p.value}%<br/>占用时长: ${item?.occupied_hours || 0}h`;
        },
      },
      grid: { left: 80, right: 56, top: 12, bottom: 24 },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontSize: 10 } },
      yAxis: { type: 'category', data: items.map((i) => i.equipment_code), axisLabel: { fontSize: 10 } },
      series: [
        {
          type: 'bar',
          data: items.map((i) => i.utilization_rate),
          barWidth: 12,
          itemStyle: {
            borderRadius: [0, 2, 2, 0],
            color: (p: { value: number }) =>
              p.value >= 80 ? '#EF4444' : p.value >= 50 ? '#F59E0B' : '#10B981',
          },
          label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 },
        },
      ],
    };
  }, [rank]);

  const kpis = board?.kpis;

  // ---------- 交互 ----------
  const handleQuickChip = (key: string) => {
    if (key === 'all') {
      setAreaType('');
      setCat('');
    } else if (key === 'A' || key === 'B') {
      setCat(key);
      setAreaType('');
    } else {
      setAreaType(key as AreaTypeFilter);
      setCat('');
    }
    setSchedStatus('');
  };

  const handleExport = () => {
    toast.info('导出Excel功能开发中');
  };

  const chipActive = (key: string) => {
    if (key === 'all') return !areaType && !cat;
    if (key === 'A' || key === 'B') return cat === key && !areaType;
    return areaType === key && !cat;
  };

  return (
    <div className="p-4 space-y-3">
      <style>{BOARD_STYLE}</style>

      {/* KPI 条 */}
      {kpis && (
        <div className="grid grid-cols-6 gap-3">
          <KpiCard
            label="场地总数"
            value={kpis.area_count}
            sub={
              <>
                装配 <b>{kpis.area_assembly}</b> · 竞品 <b>{kpis.area_wp}</b> · 外委 <b>{kpis.area_cx}</b>
              </>
            }
          />
          <KpiCard
            label="项目排程"
            value={kpis.project_count}
            sub={
              <>
                已完成 <b className="text-green-500">{kpis.project_done}</b> · 进行中{' '}
                <b className="text-blue-500">{kpis.project_doing}</b>
              </>
            }
          />
          <KpiCard
            label="设备/机台数"
            value={kpis.eq_count}
            sub={
              <>
                举升机 <b>{kpis.lift_count}</b> 台
              </>
            }
          />
          <KpiCard label="预算总额" value={kpis.budget_total} sub="万元" />
          <KpiCard
            label="累计采购(套)"
            value={kpis.qty_total}
            sub={
              <>
                已完成 <b className="text-green-500">{kpis.done_total}</b> 套
              </>
            }
          />
          <KpiCard
            label="场地占用率"
            value={`${kpis.occupancy_rate}%`}
            color="#1677FF"
            sub={
              <>
                本周 <b>{kpis.occupancy_current_week}%</b> · 下周 <b>{kpis.occupancy_next_week}%</b>
              </>
            }
          />
        </div>
      )}

      {/* 图例 */}
      <Card className="bg-card border-border">
        <CardContent className="p-2.5 flex items-center gap-4 flex-wrap">
          <span className="text-xs text-muted-foreground font-semibold">排程状态图例：</span>
          {(Object.keys(SCHED_CELL_STATUS_MAP) as SchedCellStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-4 h-4 rounded sched-inner sched-cell-${s}`} style={{ cursor: 'default' }} />
              {SCHED_CELL_STATUS_MAP[s].label}
            </span>
          ))}
          <span className="flex-1" />
          <span className="text-xs text-muted-foreground">资源优先级：</span>
          {(['A', 'B', 'C'] as const).map((c) => (
            <CatTag key={c} cat={c} />
          ))}
        </CardContent>
      </Card>

      {/* 工具条 */}
      <Card className="bg-card border-border">
        <CardContent className="p-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {QUICK_CHIPS.map((c) => (
              <button
                key={c.key}
                onClick={() => handleQuickChip(c.key)}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  chipActive(c.key)
                    ? 'bg-primary/15 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSidebarHidden(!sidebarHidden)}>
              {sidebarHidden ? <Minimize2 className="w-3.5 h-3.5 mr-1" /> : <Maximize2 className="w-3.5 h-3.5 mr-1" />}
              {sidebarHidden ? '恢复侧栏' : '全宽显示'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 mr-1" />
              导出Excel
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button size="sm" onClick={() => navigate('/resource/gantt')}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              新增排程
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 侧栏 + 矩阵 */}
      <div className="flex gap-3 items-start">
        {!sidebarHidden && (
          <Card className="bg-card border-border w-52 shrink-0">
            <CardContent className="p-3 space-y-4">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">场地类型</div>
                <FilterItem active={areaType === ''} label="全部" count={board?.areas.length} onClick={() => setAreaType('')} />
                {Object.entries(AREA_TYPE_MAP).map(([key, info]) => (
                  <FilterItem
                    key={key}
                    active={areaType === key}
                    label={info.label}
                    dotColor={info.color}
                    count={board?.areas.filter((a) => a.area_type === key).length}
                    onClick={() => setAreaType(key as AreaTypeFilter)}
                  />
                ))}
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">项目类别</div>
                <FilterItem active={cat === ''} label="全部类别" onClick={() => setCat('')} />
                {(['A', 'B', 'C'] as const).map((c) => (
                  <FilterItem
                    key={c}
                    active={cat === c}
                    label={`${c}类项目`}
                    dotColor={PROJECT_CAT_MAP[c].color}
                    onClick={() => setCat(c)}
                  />
                ))}
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">排程状态</div>
                <FilterItem active={schedStatus === ''} label="全部状态" onClick={() => setSchedStatus('')} />
                {(Object.keys(SCHED_CELL_STATUS_MAP) as SchedCellStatus[]).map((s) => (
                  <FilterItem
                    key={s}
                    active={schedStatus === s}
                    label={SCHED_CELL_STATUS_MAP[s].label}
                    onClick={() => setSchedStatus(s)}
                  />
                ))}
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">筛选统计</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between px-2.5 py-1.5 bg-muted rounded">
                    <span className="text-muted-foreground">场地总数</span>
                    <span className="text-primary font-semibold">{filterStats.areaCount}</span>
                  </div>
                  <div className="flex justify-between px-2.5 py-1.5 bg-muted rounded">
                    <span className="text-muted-foreground">项目总数</span>
                    <span className="text-primary font-semibold">{filterStats.projectCount}</span>
                  </div>
                  <div className="flex justify-between px-2.5 py-1.5 bg-muted rounded">
                    <span className="text-muted-foreground">总预算(万)</span>
                    <span className="text-primary font-semibold">{filterStats.budgetTotal}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 排程矩阵 */}
        <Card className="bg-card border-border flex-1 min-w-0">
          <div className="overflow-auto max-h-[calc(100vh-280px)]">
            <table className="util-matrix w-full">
              <thead>
                <tr>
                  {STICKY_COLS.map((col) => (
                    <th
                      key={col.key}
                      className="sticky-col text-left"
                      style={{ width: col.width, minWidth: col.width, left: col.left, textAlign: ['budget', 'qty', 'done'].includes(col.key) ? 'right' : 'left' }}
                    >
                      {col.label}
                    </th>
                  ))}
                  {board?.weeks.map((w) => (
                    <th key={w.index} className={`week-col ${w.is_current ? 'is-current' : ''}`}>
                      <div className="text-[13px] font-bold text-primary">{w.label}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">{w.range}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, rowIdx) => {
                  const { area, project, isFirstOfArea, rowSpan } = row;
                  return (
                    <tr key={`${area.zone_code}-${project?.schedule_id ?? 'empty'}-${rowIdx}`}>
                      {isFirstOfArea && (
                        <>
                          {/* 试料阵地 */}
                          <td rowSpan={rowSpan} className="sticky-col" style={{ left: STICKY_COLS[0].left, width: 72, minWidth: 72 }}>
                            <span
                              className="inline-flex px-2 py-0.5 rounded font-mono text-[11px] font-bold"
                              style={{
                                color: AREA_TYPE_MAP[area.area_type]?.color,
                                backgroundColor: `${AREA_TYPE_MAP[area.area_type]?.color}22`,
                              }}
                            >
                              {area.zone_code}
                            </span>
                            {area.multi_project && (
                              <div className="text-[10px] text-muted-foreground mt-1">多项目并行</div>
                            )}
                          </td>
                          {/* 单元机台/设备 */}
                          <td rowSpan={rowSpan} className="sticky-col" style={{ left: STICKY_COLS[1].left, width: 150, minWidth: 150 }}>
                            <div className="font-semibold text-foreground mb-1">{area.short_name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 inline" />
                              {area.location} · {area.manager}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Wrench className="w-3 h-3 inline" />
                              {area.mat_desc}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              设备 <span className="text-primary font-semibold">{area.eq_count}</span> 台
                            </div>
                          </td>
                          {/* 试制能力 */}
                          <td rowSpan={rowSpan} className="sticky-col" style={{ left: STICKY_COLS[2].left, width: 150, minWidth: 150 }}>
                            <div className="text-[11px] text-muted-foreground">B类当量</div>
                            <div className="text-xs text-foreground mt-0.5">{area.capacity}</div>
                          </td>
                        </>
                      )}
                      {/* 项目 */}
                      <td className="sticky-col" style={{ left: STICKY_COLS[3].left, width: 130, minWidth: 130 }}>
                        {project ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <CatTag cat={project.cat} />
                              <span className="font-semibold text-foreground truncate">{project.project_code}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{project.project_name}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">——</span>
                        )}
                      </td>
                      {/* 预算 */}
                      <td className="sticky-col text-right font-mono text-primary font-semibold" style={{ left: STICKY_COLS[4].left, width: 90, minWidth: 90 }}>
                        {project ? project.budget : '——'}
                      </td>
                      {/* 采购数量 */}
                      <td className="sticky-col text-right font-mono text-primary font-semibold" style={{ left: STICKY_COLS[5].left, width: 72, minWidth: 72 }}>
                        {project ? project.qty : '——'}
                      </td>
                      {/* 累计已完成 */}
                      <td className="sticky-col text-right font-mono text-green-500 font-semibold" style={{ left: STICKY_COLS[6].left, width: 90, minWidth: 90 }}>
                        {project ? (project.qty ? `${project.done} / ${project.qty}` : project.done) : '——'}
                      </td>
                      {/* 占用资源 */}
                      <td className="sticky-col text-[11px] text-muted-foreground" style={{ left: STICKY_COLS[7].left, width: 120, minWidth: 120 }}>
                        {project ? project.lift_desc || '——' : '——'}
                      </td>
                      {/* 周度甘特格 */}
                      {board?.weeks.map((w) => {
                        const cell = project?.cells[w.index] ?? null;
                        return (
                          <td key={w.index} className={`week-col ${w.is_current ? 'is-current' : ''}`}>
                            {cell && (
                              <div
                                className={`sched-inner sched-cell-${cell.status}`}
                                title={`${project?.project_code ?? ''} ${project?.project_name ?? ''} · ${SCHED_CELL_STATUS_MAP[cell.status].label} ${cell.text}`}
                              >
                                {cell.text}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {matrixRows.length === 0 && (
                  <tr>
                    <td colSpan={STICKY_COLS.length + (board?.weeks.length ?? 0)} className="text-center text-muted-foreground py-10">
                      {loading ? '加载中...' : '暂无匹配的排程数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 利用率趋势 + 设备利用率排名 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">场地占用率趋势（周度）</span>
            </div>
            {trendOption ? (
              <ReactECharts option={trendOption} theme="ud" className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">设备利用率排名</span>
              {rank && (
                <span className="text-xs text-muted-foreground ml-auto">
                  窗口 {rank.window_start}~{rank.window_end} · 平均 {rank.avg_utilization_rate}%
                </span>
              )}
            </div>
            {rankOption ? (
              <ReactECharts option={rankOption} theme="ud" className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
