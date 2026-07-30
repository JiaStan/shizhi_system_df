import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheckIcon,
  UsersIcon,
  PackageIcon,
  FileTextIcon,
} from 'lucide-react';
import deliveryData from '@shared/static/delivery.json';
import projectsData from '@shared/static/projects.json';

const STORAGE_KEY = '__global_dfmc_currentProject';

interface IStoredProject {
  id: number;
  project_name: string | null;
}

function getStoredProjectId(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: IStoredProject = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {
    /* ignore */
  }
  return projectsData[0]?.id ?? 1;
}

function getStoredProjectName(id: number): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: IStoredProject = JSON.parse(raw);
      if (parsed?.id === id) return parsed.project_name || '未命名项目';
    }
  } catch {
    /* ignore */
  }
  const p = projectsData.find((x) => x.id === id);
  return p?.project_name || '未命名项目';
}

export default function SummaryStatsSection() {
  const [projectId, setProjectId] = useState(getStoredProjectId);

  useEffect(() => {
    const handleStorage = () => setProjectId(getStoredProjectId());
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 600);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const { projectName, totals, summaries } = useMemo(() => {
    const filtered = deliveryData.filter(
      (d) => d.project_id === projectId && d.state === '待检'
    );

    const grouped = new Map<
      string,
      { quantity: number; codes: Set<string> }
    >();

    for (const record of filtered) {
      const existing = grouped.get(record.professional);
      if (existing) {
        existing.quantity += record.received_qty;
        existing.codes.add(record.delivery_code);
      } else {
        grouped.set(record.professional, {
          quantity: record.received_qty,
          codes: new Set([record.delivery_code]),
        });
      }
    }

    const list = Array.from(grouped.entries())
      .map(([professional, data]) => ({
        professional,
        quantity: data.quantity,
        deliveryCount: data.codes.size,
      }))
      .sort((a, b) => b.quantity - a.quantity);

    const totalQty = list.reduce((s, x) => s + x.quantity, 0);
    const allCodes = new Set(filtered.map((d) => d.delivery_code));

    return {
      projectName: getStoredProjectName(projectId),
      totals: { quantity: totalQty, deliveryCount: allCodes.size },
      summaries: list,
    };
  }, [projectId]);

  const totalCardAccent =
    totals.quantity === 0
      ? 'border-t-[hsl(152_55%_40%)]'
      : 'border-t-[hsl(40_70%_50%)]';

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground tracking-tight">
          按专业室汇总
        </h3>
        <span className="text-sm text-muted-foreground">{projectName}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ── 总待检数量 ── */}
        <div
          className={`bg-card border border-border border-t-2 ${totalCardAccent} rounded-sm p-5`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <ClipboardCheckIcon className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              总待检数量
            </span>
          </div>
          <p className="font-mono text-3xl font-bold text-foreground tracking-tight">
            {totals.quantity}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <FileTextIcon className="size-3" />
            <span className="font-mono">{totals.deliveryCount}</span>
            <span>张送货单</span>
          </p>
        </div>

        {/* ── 涉及专业师数 ── */}
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <UsersIcon className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              涉及专业师
            </span>
          </div>
          <p className="font-mono text-3xl font-bold text-foreground tracking-tight">
            {summaries.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            待分配检验任务
          </p>
        </div>

        {/* ── 各专业师待检卡片 ── */}
        {summaries.map((item) => {
          const isTop = item.quantity === Math.max(...summaries.map((s) => s.quantity));
          return (
            <div
              key={item.professional}
              className={`bg-card border border-border rounded-sm p-5 ${
                isTop ? 'border-l-3 border-l-[hsl(40_70%_50%)]' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <PackageIcon className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  专业师
                </span>
              </div>
              <p className="text-base font-medium text-foreground mb-2">
                {item.professional}
              </p>
              <div className="flex items-baseline gap-4">
                <div>
                  <span className="font-mono text-2xl font-bold text-foreground tracking-tight">
                    {item.quantity}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    件
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono font-medium text-accent-foreground">
                    {item.deliveryCount}
                  </span>
                  <span className="ml-1">单</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 无数据兜底 ── */}
      {summaries.length === 0 && (
        <div className="bg-card border border-border rounded-sm p-8 mt-4 text-center">
          <ClipboardCheckIcon className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            当前项目暂无待检零件
          </p>
        </div>
      )}
    </section>
  );
}
