import { useState, useMemo } from 'react';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { FilterIcon, PackageIcon, SearchIcon, DownloadIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import deliveryData from '@shared/static/delivery.json';
import type { IDeliveryRecord, IProject } from '@/types';
import { exportToExcel } from '@/lib/export';
import { Button } from '@/components/ui/button';

const allRecords = deliveryData as IDeliveryRecord[];

function getCurrentProject(): IProject | null {
  try {
    const raw = sessionStorage.getItem('__global_dfmc_currentProject');
    if (!raw) return null;
    return JSON.parse(raw) as IProject;
  } catch {
    return null;
  }
}

const columns: TableProps['columns'] = [
  {
    title: '送货单号',
    dataIndex: 'delivery_code',
    key: 'delivery_code',
    width: 180,
    fixed: 'left',
    render: (val: string) => (
      <span className="font-mono text-sm font-medium tracking-tight text-foreground">
        {val}
      </span>
    ),
  },
  {
    title: '零件号',
    dataIndex: 'part_code',
    key: 'part_code',
    width: 170,
    render: (val: string) => (
      <span className="font-mono text-sm font-medium tracking-tight text-foreground">
        {val}
      </span>
    ),
  },
  {
    title: '零件名',
    dataIndex: 'part_name',
    key: 'part_name',
    width: 200,
    ellipsis: true,
    render: (val: string) => (
      <span className="text-sm text-foreground">{val}</span>
    ),
  },
  {
    title: '专业师',
    dataIndex: 'professional',
    key: 'professional',
    width: 110,
    render: (val: string) => (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground border border-border">
        {val}
      </span>
    ),
  },
  {
    title: '订单数量',
    dataIndex: 'order_qty',
    key: 'order_qty',
    width: 100,
    align: 'right',
    render: (val: number) => (
      <span className="font-mono text-sm font-medium tracking-tight text-foreground">
        {val}
      </span>
    ),
  },
  {
    title: '收货数量',
    dataIndex: 'received_qty',
    key: 'received_qty',
    width: 100,
    align: 'right',
    render: (val: number) => (
      <span className="font-mono text-sm font-medium tracking-tight text-foreground">
        {val}
      </span>
    ),
  },
  {
    title: '数据来源',
    dataIndex: 'source',
    key: 'source',
    width: 110,
    render: (val: string) => {
      if (val === 'warehouse') {
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span>🏭</span>
            <span>仓库系统</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span>📋</span>
          <span>飞书共享表</span>
        </span>
      );
    },
  },
];

export default function InspectionListSection() {
  const [tableRef] = useAutoAnimate<HTMLDivElement>({ duration: 150 });
  const project = getCurrentProject();
  const projectId = project?.id;

  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 筛选当前项目的待检记录
  const pendingRecords = useMemo(() => {
    if (projectId == null) return [];
    return allRecords.filter(
      (r) => r.project_id === projectId && r.state === '待检'
    );
  }, [projectId]);

  // 提取专业师列表
  const professionals = useMemo(() => {
    const set = new Set(pendingRecords.map((r) => r.professional));
    return Array.from(set).sort();
  }, [pendingRecords]);

  // 应用筛选
  const filteredRecords = useMemo(() => {
    let result = pendingRecords;

    if (selectedProfessional) {
      result = result.filter((r) => r.professional === selectedProfessional);
    }

    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.delivery_code.toLowerCase().includes(kw) ||
          r.part_code.toLowerCase().includes(kw) ||
          r.part_name.toLowerCase().includes(kw)
      );
    }

    return result;
  }, [pendingRecords, selectedProfessional, searchKeyword]);

  if (!project) {
    return (
      <section className="w-full">
        <Card className="border border-border rounded-sm p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <PackageIcon className="size-8" />
            <p className="text-sm">请先选择一个项目</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="w-full">
      <Card className="border border-border rounded-sm overflow-hidden">
        {/* 筛选工具栏 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() =>
                exportToExcel(
                  filteredRecords as unknown as Record<string, unknown>[],
                  [
                    { key: 'delivery_code', title: '送货单号', width: 18 },
                    { key: 'part_code', title: '零件号', width: 16 },
                    { key: 'part_name', title: '零件名称', width: 20 },
                    { key: 'professional', title: '专业师', width: 10 },
                    { key: 'order_qty', title: '订单数量', width: 10 },
                    { key: 'received_qty', title: '收货数量', width: 10 },
                  ],
                  '待检明细',
                )
              }
            >
              <DownloadIcon className="size-3.5 mr-1" />
              导出
            </Button>
            <FilterIcon className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground">按专业师筛选</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedProfessional('')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  !selectedProfessional
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                全部
              </button>
              {professionals.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedProfessional(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    selectedProfessional === p
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="relative shrink-0">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索单号/零件号/名称..."
              className="pl-8 h-8 w-56 text-sm border border-border bg-card"
            />
          </div>
        </div>

        {/* 表格 */}
        <div ref={tableRef}>
          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey="id"
            scroll={{ x: 960, y: 420 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total: number) => `共 ${total} 条记录`,
              size: 'small',
            }}
            size="small"
            className="inspection-table"
          />
        </div>
      </Card>

      <style jsx>{`
        :global(.inspection-table .ant-table) {
          font-family: var(--font-sans);
        }
        :global(.inspection-table .ant-table-thead > tr > th) {
          background: hsl(215 14% 93% / 0.5) !important;
          border-bottom: 1px solid hsl(215 16% 90%) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: hsl(215 30% 14%) !important;
          padding: 10px 16px !important;
        }
        :global(.inspection-table .ant-table-tbody > tr > td) {
          border-bottom: 1px solid hsl(215 16% 90% / 0.6) !important;
          padding: 10px 16px !important;
        }
        :global(.inspection-table .ant-table-tbody > tr:hover > td) {
          background: hsl(215 14% 93% / 0.3) !important;
        }
        :global(.inspection-table .ant-pagination) {
          padding: 12px 16px !important;
        }
        :global(.inspection-table .ant-pagination .ant-pagination-item-active) {
          border-color: hsl(42 96% 52%) !important;
        }
        :global(.inspection-table .ant-pagination .ant-pagination-item-active a) {
          color: hsl(38 100% 12%) !important;
          background: hsl(42 96% 52%) !important;
          border-radius: 4px !important;
        }
      `}</style>
    </section>
  );
}
