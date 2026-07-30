import React, { useState, useMemo } from 'react';
import { Table, TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { AlertCircleIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import deliveryData from '@shared/static/delivery.json';
import type { IUnqualifiedItem, IDeliveryRecord } from '@/types';
import { exportToExcel } from '@/lib/export';

const STORAGE_KEY = '__global_dfmc_currentProject';

function getCurrentProjectId(): number {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.id) return parsed.id;
    }
  } catch { /* ignore */ }
  return 1;
}

function buildUnqualifiedData(projectId: number): IUnqualifiedItem[] {
  const records = (deliveryData as IDeliveryRecord[]).filter(
    (r) => r.project_id === projectId && r.state === '不合格待判定'
  );
  return records.map((r) => ({
    delivery_code: r.delivery_code,
    part_code: r.part_code,
    part_name: r.part_name,
    professional: r.professional,
    unqualified_qty: r.unqualified_qty,
    order_qty: r.order_qty,
    unqualified_rate: r.order_qty > 0 ? Math.round((r.unqualified_qty / r.order_qty) * 100) : 0,
  }));
}

function getRowBg(rate: number): string | undefined {
  if (rate >= 40) return 'hsl(4 55% 95%)';
  if (rate >= 20) return 'hsl(40 75% 94%)';
  return undefined;
}

const PROFESSIONAL_FILTER_OPTIONS = [
  { value: 'all', label: '全部专业师' },
];

const UnqualifiedListSection: React.FC = () => {
  const projectId = getCurrentProjectId();
  const allItems = useMemo(() => buildUnqualifiedData(projectId), [projectId]);
  const [filterProfessional, setFilterProfessional] = useState<string>('all');

  const professionals = useMemo(() => {
    const set = new Set(allItems.map((i) => i.professional));
    return Array.from(set);
  }, [allItems]);

  const professionalOptions = useMemo(() => {
    return [
      ...PROFESSIONAL_FILTER_OPTIONS,
      ...professionals.map((p) => ({ value: p, label: p })),
    ];
  }, [professionals]);

  const filteredItems = useMemo(() => {
    if (filterProfessional === 'all') return allItems;
    return allItems.filter((i) => i.professional === filterProfessional);
  }, [allItems, filterProfessional]);

  const totalUnqualified = useMemo(
    () => filteredItems.reduce((sum, i) => sum + i.unqualified_qty, 0),
    [filteredItems]
  );

  const columns: TableProps['columns'] = [
    {
      title: '送货单号',
      dataIndex: 'delivery_code',
      key: 'delivery_code',
      width: 160,
      fixed: 'left',
      render: (val: string) => (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">{val}</span>
      ),
    },
    {
      title: '零件号',
      dataIndex: 'part_code',
      key: 'part_code',
      width: 160,
      render: (val: string) => (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">{val}</span>
      ),
    },
    {
      title: '零件名',
      dataIndex: 'part_name',
      key: 'part_name',
      width: 200,
      ellipsis: true,
      render: (val: string) => <span className="text-sm text-foreground">{val}</span>,
    },
    {
      title: '专业师',
      dataIndex: 'professional',
      key: 'professional',
      width: 100,
      render: (val: string) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
          {val}
        </span>
      ),
    },
    {
      title: '不合格数量',
      dataIndex: 'unqualified_qty',
      key: 'unqualified_qty',
      width: 110,
      sorter: (a: IUnqualifiedItem, b: IUnqualifiedItem) => a.unqualified_qty - b.unqualified_qty,
      render: (val: number) => (
        <span className="font-mono text-sm font-medium tracking-tight text-[hsl(4_60%_28%)]">
          {val}
        </span>
      ),
    },
    {
      title: '订单数量',
      dataIndex: 'order_qty',
      key: 'order_qty',
      width: 100,
      render: (val: number) => (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">{val}</span>
      ),
    },
    {
      title: '不合格率',
      dataIndex: 'unqualified_rate',
      key: 'unqualified_rate',
      width: 110,
      fixed: 'right',
      sorter: (a: IUnqualifiedItem, b: IUnqualifiedItem) => a.unqualified_rate - b.unqualified_rate,
      defaultSortOrder: 'descend',
      render: (val: number) => {
        let colorClass = 'text-foreground';
        let bgClass = '';
        if (val >= 40) {
          colorClass = 'text-[hsl(4_60%_28%)]';
          bgClass = 'bg-[hsl(4_55%_95%)] border border-[hsl(4_65%_48%)]';
        } else if (val >= 20) {
          colorClass = 'text-[hsl(40_65%_25%)]';
          bgClass = 'bg-[hsl(40_75%_94%)] border border-[hsl(40_70%_50%)]';
        }
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${colorClass} ${bgClass}`}
          >
            {val}%
          </span>
        );
      },
    },
  ];

  if (allItems.length === 0) {
    return (
      <section className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircleIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">不合格明细列表</h2>
        </div>
        <div className="rounded-sm border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">当前项目暂无不合格待判定记录</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {/* 标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertCircleIcon className="size-5 text-[hsl(4_65%_48%)]" />
          <h2 className="text-lg font-semibold text-foreground">不合格明细列表</h2>
          <span className="font-mono text-xs font-medium text-muted-foreground ml-1">
            共 {filteredItems.length} 条 · 不合格 {totalUnqualified} 件
          </span>
        </div>

        {/* 专业师筛选 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">专业师：</label>
          <select
            value={filterProfessional}
            onChange={(e) => setFilterProfessional(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 focus:outline-none transition-colors"
          >
            {professionalOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

        {/* 导出按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={() =>
            exportToExcel(
              filteredItems as unknown as Record<string, unknown>[],
              [
                { key: 'delivery_code', title: '送货单号', width: 18 },
                { key: 'part_code', title: '零件号', width: 16 },
                { key: 'part_name', title: '零件名称', width: 20 },
                { key: 'professional', title: '专业师', width: 10 },
                { key: 'unqualified_qty', title: '不合格数量', width: 12 },
                { key: 'order_qty', title: '订单数量', width: 10 },
                { key: 'unqualified_rate', title: '不合格率', width: 10 },
              ],
              '不合格待判定明细',
            )
          }
        >
          <DownloadIcon className="size-3.5 mr-1" />
          导出
        </Button>

      {/* 表格 */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="delivery_code"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total: number) => (
              <span className="text-xs text-muted-foreground">
                共 <span className="font-mono font-medium text-foreground">{total}</span> 条
              </span>
            ),
          }}
          className="unqualified-table"
          scroll={{ x: 900 }}
          onRow={(record: IUnqualifiedItem) => {
            const bg = getRowBg(record.unqualified_rate);
            return {
              style: bg ? { backgroundColor: bg } : undefined,
            };
          }}
        />
      </div>

      <style jsx>{`
        :global(.unqualified-table .ant-table) {
          background: transparent !important;
        }
        :global(.unqualified-table .ant-table-thead > tr > th),
        :global(.unqualified-table .ant-table-thead > tr > td) {
          background: hsl(215 14% 93% / 0.5) !important;
          border-bottom: 1px solid hsl(215 16% 90%) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: hsl(215 30% 14%) !important;
          padding: 10px 16px !important;
        }
        :global(.unqualified-table .ant-table-tbody > tr > td) {
          border-bottom: 1px solid hsl(215 16% 90% / 0.6) !important;
          padding: 10px 16px !important;
        }
        :global(.unqualified-table .ant-table-tbody > tr:hover > td) {
          background: hsl(215 14% 93% / 0.3) !important;
        }
        :global(.unqualified-table .ant-pagination) {
          margin: 12px 16px !important;
        }
      `}</style>
    </section>
  );
};

export default UnqualifiedListSection;
