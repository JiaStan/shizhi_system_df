import { useState, useMemo } from 'react';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import {
  FileTextIcon,
  FilterIcon,
  DownloadIcon,
  SearchIcon,
  PlusCircleIcon,
  PencilIcon,
  Trash2Icon,
  RefreshCwIcon,
  Settings2Icon,
  UploadIcon,
  ShieldIcon,
  KeyIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exportToExcel } from '@/lib/export';

/* ─── 类型定义 ─── */
interface IAuditLog {
  id: number;
  timestamp: string;
  operator: string;
  type: string;
  target: string;
  detail: string;
  ip: string;
}

/* ─── 操作类型配置 ─── */
const OP_TYPE_CONFIG: Record<
  string,
  { label: string; Icon: React.ElementType; bg: string; text: string; border: string }
> = {
  create_project: {
    label: '创建项目',
    Icon: PlusCircleIcon,
    bg: 'bg-[hsl(152_45%_95%)]',
    text: 'text-[hsl(152_60%_22%)]',
    border: 'border-[hsl(152_55%_40%)]',
  },
  edit_project: {
    label: '编辑项目',
    Icon: PencilIcon,
    bg: 'bg-[hsl(210_55%_95%)]',
    text: 'text-[hsl(210_55%_25%)]',
    border: 'border-[hsl(210_60%_48%)]',
  },
  delete_project: {
    label: '删除项目',
    Icon: Trash2Icon,
    bg: 'bg-[hsl(4_55%_95%)]',
    text: 'text-[hsl(4_60%_28%)]',
    border: 'border-[hsl(4_65%_48%)]',
  },
  trigger_sync: {
    label: '触发同步',
    Icon: RefreshCwIcon,
    bg: 'bg-[hsl(210_55%_95%)]',
    text: 'text-[hsl(210_55%_25%)]',
    border: 'border-[hsl(210_60%_48%)]',
  },
  modify_threshold: {
    label: '修改阈值',
    Icon: Settings2Icon,
    bg: 'bg-[hsl(40_75%_94%)]',
    text: 'text-[hsl(40_65%_25%)]',
    border: 'border-[hsl(40_70%_50%)]',
  },
  upload_pbom: {
    label: '上传PBOM',
    Icon: UploadIcon,
    bg: 'bg-[hsl(152_45%_95%)]',
    text: 'text-[hsl(152_60%_22%)]',
    border: 'border-[hsl(152_55%_40%)]',
  },
  modify_credentials: {
    label: '修改凭证',
    Icon: KeyIcon,
    bg: 'bg-[hsl(40_75%_94%)]',
    text: 'text-[hsl(40_65%_25%)]',
    border: 'border-[hsl(40_70%_50%)]',
  },
  export_report: {
    label: '导出报表',
    Icon: ShieldIcon,
    bg: 'bg-[hsl(215_10%_95%)]',
    text: 'text-[hsl(215_14%_38%)]',
    border: 'border-[hsl(215_12%_75%)]',
  },
};

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: '全部类型' },
  ...Object.entries(OP_TYPE_CONFIG).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  })),
];

const TIME_RANGE_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '最近7天' },
  { value: 'month', label: '最近30天' },
];

/* ─── Mock 数据 ─── */
const MOCK_LOGS: IAuditLog[] = [];

/* ─── 时间范围过滤工具 ─── */
function filterByTimeRange(logs: IAuditLog[], range: string): IAuditLog[] {
  if (range === 'all') return logs;
  const now = new Date('2026-06-23T15:00:00');
  const daysMap: Record<string, number> = { today: 1, week: 7, month: 30 };
  const days = daysMap[range] || 999;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return logs.filter((log) => new Date(log.timestamp) >= cutoff);
}

/* ─── 组件 ─── */
export default function AuditLogListSection() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = MOCK_LOGS;
    if (typeFilter !== 'all') {
      result = result.filter((r) => r.type === typeFilter);
    }
    result = filterByTimeRange(result, timeRange);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.operator.toLowerCase().includes(q) ||
          r.target.toLowerCase().includes(q) ||
          r.detail.toLowerCase().includes(q) ||
          r.ip.includes(q),
      );
    }
    return result;
  }, [typeFilter, timeRange, search]);

  const handleExport = () => {
    const columns = [
      { key: 'timestamp', title: '操作时间', width: 20 },
      { key: 'operator', title: '操作人', width: 12 },
      {
        key: 'type',
        title: '操作类型',
        width: 12,
      },
      { key: 'target', title: '操作对象', width: 18 },
      { key: 'detail', title: '详情', width: 50 },
      { key: 'ip', title: 'IP 地址', width: 15 },
    ];
    const exportData = filtered.map((r) => ({
      ...r,
      type: OP_TYPE_CONFIG[r.type]?.label || r.type,
    }));
    exportToExcel(
      exportData as unknown as Record<string, unknown>[],
      columns,
      `操作日志_${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const columns: Array<Record<string, unknown>> = [
    {
      title: '操作时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (text: string) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{text}</span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
      render: (text: string) => (
        <span className="text-sm font-medium text-foreground">{text}</span>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const cfg = OP_TYPE_CONFIG[type];
        if (!cfg) return <span className="text-xs">{type}</span>;
        const { Icon } = cfg;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            <Icon className="size-3" />
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: '操作对象',
      dataIndex: 'target',
      key: 'target',
      width: 160,
      render: (text: string) => (
        <span className="text-sm text-foreground">{text}</span>
      ),
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (text: string) => (
        <span className="text-sm text-muted-foreground">{text}</span>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
      render: (text: string) => (
        <span className="font-mono text-xs text-muted-foreground">{text}</span>
      ),
    },
  ];

  /* ─── 统计 ─── */
  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    MOCK_LOGS.forEach((l) => {
      typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
    });
    return { total: MOCK_LOGS.length, typeCounts };
  }, []);

  return (
    <section className="w-full">
      {/* ── 区块标题 ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-sm bg-accent">
            <FileTextIcon className="size-4 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">操作日志</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              记录系统内所有关键操作的审计轨迹
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <DownloadIcon className="size-3.5 mr-1.5" />
            导出
          </Button>
        </div>
      </div>

      {/* ── 类型分布摘要 ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          共{' '}
          <span className="font-mono font-medium text-foreground">{stats.total}</span>{' '}
          条记录
        </span>
        <span className="h-3 w-px bg-border" />
        {Object.entries(OP_TYPE_CONFIG).map(([key, cfg]) => {
          const count = stats.typeCounts[key] || 0;
          if (count === 0) return null;
          const { Icon } = cfg;
          return (
            <span key={key} className="inline-flex items-center gap-1">
              <Icon className="size-3" />
              <span>{cfg.label}</span>
              <span className="font-mono font-medium text-foreground">{count}</span>
            </span>
          );
        })}
      </div>

      {/* ── 筛选栏 ── */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索操作人、对象、详情..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <FilterIcon className="size-3.5 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="h-9 w-[130px] text-xs bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtered.length !== MOCK_LOGS.length && (
          <span className="text-xs text-muted-foreground ml-auto">
            筛选结果:{' '}
            <span className="font-mono font-medium text-foreground">{filtered.length}</span>{' '}
            / {MOCK_LOGS.length} 条
          </span>
        )}
      </div>

      {/* ── 数据表格 ── */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <Table
          columns={columns}
          dataSource={filtered.map((r) => ({ ...r, key: r.id }))}
          className="auditlog-table"
          scroll={{ x: 900, y: 480 }}
          size="small"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '25', '50'],
            showTotal: (total: number) => `共 ${total} 条`,
            size: 'small',
          }}
        />
      </div>

      {/* ── antd-table 样式覆盖 ── */}
      <style jsx>{`
        :global(.auditlog-table .ant-table) {
          font-family: var(--font-sans);
        }
        :global(.auditlog-table .ant-table-thead > tr > th) {
          background-color: hsl(215 14% 93% / 0.5) !important;
          border-bottom: 1px solid hsl(215 16% 90%) !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: hsl(215 30% 14%) !important;
          padding: 10px 16px !important;
        }
        :global(.auditlog-table .ant-table-tbody > tr > td) {
          border-bottom: 1px solid hsl(215 16% 90% / 0.6) !important;
          padding: 10px 16px !important;
        }
        :global(.auditlog-table .ant-table-tbody > tr:hover > td) {
          background-color: hsl(215 14% 93% / 0.3) !important;
        }
        :global(.auditlog-table .ant-pagination) {
          margin-top: 16px !important;
        }
        :global(.auditlog-table .ant-pagination .ant-pagination-item-active) {
          border-color: hsl(42 96% 52%) !important;
        }
        :global(.auditlog-table .ant-pagination .ant-pagination-item-active a) {
          color: hsl(42 96% 52%) !important;
        }
      `}</style>
    </section>
  );
}
