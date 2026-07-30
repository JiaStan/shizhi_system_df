import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { ColumnsType } from 'antd/es/table';
import { FactoryIcon, FileSpreadsheetIcon, DownloadIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  IDeliveryRecord,
  DeliveryState,
  DeliverySource,
  MatchLevel,
} from '@/types';
import allDeliveryData from '@shared/static/delivery.json';
import { exportToExcel } from '@/lib/export';
import { Button } from '@/components/ui/button';

// ─── 常量映射 ──────────────────────────────────────────────────

const STATE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: '入库完成', label: '🟢 入库完成' },
  { value: '已检待入库', label: '🔵 已检待入库' },
  { value: '待检', label: '🟡 待检' },
  { value: '不合格待判定', label: '🔴 不合格待判定' },
];

const STATE_STYLE_MAP: Record<DeliveryState, { bg: string; text: string; border: string }> = {
  '入库完成': { bg: 'bg-[hsl(152_45%_95%)]', text: 'text-[hsl(152_60%_22%)]', border: 'border-[hsl(152_55%_40%)]' },
  '已检待入库': { bg: 'bg-[hsl(210_55%_95%)]', text: 'text-[hsl(210_55%_25%)]', border: 'border-[hsl(210_60%_48%)]' },
  '待检': { bg: 'bg-[hsl(40_75%_94%)]', text: 'text-[hsl(40_65%_25%)]', border: 'border-[hsl(40_70%_50%)]' },
  '不合格待判定': { bg: 'bg-[hsl(4_55%_95%)]', text: 'text-[hsl(4_60%_28%)]', border: 'border-[hsl(4_65%_48%)]' },
  '其他': { bg: 'bg-[hsl(215_10%_95%)]', text: 'text-[hsl(215_14%_38%)]', border: 'border-[hsl(215_12%_75%)]' },
};

const MATCH_LEVEL_MAP: Record<MatchLevel, { label: string; emoji: string; cls: string }> = {
  strong: { label: '强匹配', emoji: '🟢', cls: 'text-[hsl(152_60%_22%)]' },
  weak: { label: '弱匹配', emoji: '🟡', cls: 'text-[hsl(40_65%_25%)]' },
  fuzzy: { label: '模糊匹配', emoji: '🔴', cls: 'text-[hsl(4_60%_28%)]' },
  unique: { label: '唯一源', emoji: '⚪', cls: 'text-[hsl(215_14%_38%)]' },
};

const SOURCE_MAP: Record<DeliverySource, { label: string; Icon: typeof FactoryIcon }> = {
  warehouse: { label: '仓库系统', Icon: FactoryIcon },
  feishu: { label: '飞书共享表', Icon: FileSpreadsheetIcon },
};

// ─── 行底色逻辑 ─────────────────────────────────────────────────

function getRowClassName(state: DeliveryState): string {
  if (state === '不合格待判定') return 'bg-[hsl(4_55%_95%)]';
  if (state === '待检') return 'bg-[hsl(40_75%_94%)]';
  return '';
}

// ─── Section 组件 ───────────────────────────────────────────────

export default function DeliveryDetailSection() {
  const { id } = useParams<{ id: string }>();
  const [stateFilter, setStateFilter] = useState<string>('all');

  const projectId = Number(id);
  const records = (allDeliveryData as IDeliveryRecord[]).filter(
    (r) => r.project_id === projectId
  );

  const filteredRecords = useMemo(() => {
    if (stateFilter === 'all') return records;
    return records.filter((r) => r.state === stateFilter);
  }, [records, stateFilter]);

  // ─── 列定义 ───────────────────────────────────────────────────

  const columns: ColumnsType<IDeliveryRecord> = [
    {
      title: '送货单号',
      dataIndex: 'delivery_code',
      key: 'delivery_code',
      width: 160,
      fixed: 'left',
      render: (val: string) => (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">
          {val}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 130,
      render: (val: DeliveryState) => {
        const style = STATE_STYLE_MAP[val] || STATE_STYLE_MAP['其他'];
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
          >
            {val}
          </span>
        );
      },
    },
    {
      title: '零件号',
      dataIndex: 'part_code',
      key: 'part_code',
      width: 160,
      render: (val: string) => (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">
          {val}
        </span>
      ),
    },
    {
      title: '零件名称',
      dataIndex: 'part_name',
      key: 'part_name',
      width: 180,
      ellipsis: true,
      render: (val: string) => (
        <span className="text-sm text-foreground">{val}</span>
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
      title: '入库数量',
      dataIndex: 'in_qty',
      key: 'in_qty',
      width: 100,
      align: 'right',
      render: (val: number) => (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">
          {val}
        </span>
      ),
    },
    {
      title: '到货仓库',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 120,
      render: (val: string) => (
        <span className="text-sm text-muted-foreground">{val}</span>
      ),
    },
    {
      title: '专业师',
      dataIndex: 'professional',
      key: 'professional',
      width: 100,
      render: (val: string) => (
        <span className="text-sm text-foreground">{val}</span>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 130,
      render: (val: DeliverySource) => {
        const info = SOURCE_MAP[val];
        if (!info) return null;
        const { label, Icon } = info;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5" />
            {label}
          </span>
        );
      },
    },
    {
      title: '匹配级别',
      dataIndex: 'match_level',
      key: 'match_level',
      width: 120,
      fixed: 'right',
      render: (val: MatchLevel) => {
        const info = MATCH_LEVEL_MAP[val];
        if (!info) return null;
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${info.cls}`}>
            <span>{info.emoji}</span>
            {info.label}
          </span>
        );
      },
    },
  ];

  // ─── 汇总统计 ─────────────────────────────────────────────────

  const summaryStats = useMemo(() => {
    const total = records.length;
    const byState: Record<string, number> = {};
    for (const r of records) {
      byState[r.state] = (byState[r.state] || 0) + 1;
    }
    return { total, byState };
  }, [records]);

  return (
    <section className="w-full">
      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-semibold text-foreground">
                到货明细
              </CardTitle>
              <span className="font-mono text-xs font-medium text-muted-foreground">
                共 {summaryStats.total} 条
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToExcel(
                    filteredRecords as unknown as Record<string, unknown>[],
                    [
                      { key: 'delivery_code', title: '送货单号', width: 18 },
                      { key: 'state', title: '状态', width: 12 },
                      { key: 'part_code', title: '零件号', width: 16 },
                      { key: 'part_name', title: '零件名称', width: 20 },
                      { key: 'order_qty', title: '订单数量', width: 10 },
                      { key: 'received_qty', title: '收货数量', width: 10 },
                      { key: 'in_qty', title: '入库数量', width: 10 },
                      { key: 'warehouse', title: '仓库', width: 14 },
                      { key: 'professional', title: '专业师', width: 10 },
                    ],
                    '到货明细',
                  )
                }
              >
                <DownloadIcon className="size-3.5 mr-1" />
                导出
              </Button>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="按状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  {STATE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 状态快速统计 */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {(['入库完成', '已检待入库', '待检', '不合格待判定'] as DeliveryState[]).map(
              (st) => {
                const count = summaryStats.byState[st] || 0;
                if (count === 0) return null;
                const style = STATE_STYLE_MAP[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStateFilter(stateFilter === st ? 'all' : st)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${style.bg} ${style.text} ${style.border} ${
                      stateFilter === st ? 'opacity-100 ring-2 ring-ring/30' : 'opacity-70'
                    }`}
                  >
                    {st}
                    <span className="font-mono font-bold">{count}</span>
                  </button>
                );
              }
            )}
            {stateFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStateFilter('all')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              dataSource={filteredRecords}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total: number) => `共 ${total} 条记录`,
                size: 'small',
              }}
              scroll={{ x: 1400 }}
              rowClassName={(record) => getRowClassName(record.state as DeliveryState)}
              className="delivery-detail-table"
            />
          </div>

          {filteredRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileSpreadsheetIcon className="mb-2 size-8 opacity-40" />
              <p className="text-sm">暂无符合条件的到货记录</p>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        :global(.delivery-detail-table .ant-table-thead > tr > th) {
          background: hsl(215 14% 93% / 0.5);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: hsl(215 30% 14%);
          border-bottom: 1px solid hsl(215 16% 90%);
          padding: 10px 16px;
        }
        :global(.delivery-detail-table .ant-table-tbody > tr > td) {
          padding: 12px 16px;
          border-bottom: 1px solid hsl(215 16% 90% / 0.6);
        }
        :global(.delivery-detail-table .ant-table-tbody > tr:hover > td) {
          background: hsl(215 14% 93% / 0.3) !important;
        }
        :global(.delivery-detail-table .ant-table-tbody > tr.bg-\\[hsl\\(4_55%_95%\\)\\] > td) {
          background: hsl(4 55% 95%) !important;
        }
        :global(.delivery-detail-table .ant-table-tbody > tr.bg-\\[hsl\\(4_55%_95%\\)\\]:hover > td) {
          background: hsl(4 55% 92%) !important;
        }
        :global(.delivery-detail-table .ant-table-tbody > tr.bg-\\[hsl\\(40_75%_94%\\)\\] > td) {
          background: hsl(40 75% 94%) !important;
        }
        :global(.delivery-detail-table .ant-table-tbody > tr.bg-\\[hsl\\(40_75%_94%\\)\\]:hover > td) {
          background: hsl(40 75% 91%) !important;
        }
        :global(.delivery-detail-table .ant-pagination) {
          padding: 12px 16px;
          margin: 0;
        }
        :global(.delivery-detail-table .ant-table) {
          font-family: var(--font-sans);
        }
      `}</style>
    </section>
  );
}
