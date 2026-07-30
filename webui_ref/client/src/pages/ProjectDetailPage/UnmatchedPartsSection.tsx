import React, { useState, useMemo } from 'react';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangleIcon, PackageIcon, ClockIcon, FilterIcon } from 'lucide-react';
import partsData from '@shared/static/parts.json';
import deliveryData from '@shared/static/delivery.json';

interface IUnmatchedPart {
  part_code: string;
  part_name: string;
  demand_quantity: number;
  received_quantity: number;
  in_quantity: number;
  shortage: number;
  critical_level: number;
  critical_reason: string;
  is_critical: boolean;
  estimated_arrival: string;
  project_id: number;
}

const UnmatchedPartsSection: React.FC = () => {
  const [filterCritical, setFilterCritical] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // 计算每个零件的到货情况
  const unmatchedParts = useMemo(() => {
    const deliveryByPart: Record<string, { received: number; in: number }> = {};
    
    deliveryData.forEach((record) => {
      if (!deliveryByPart[record.part_code]) {
        deliveryByPart[record.part_code] = { received: 0, in: 0 };
      }
      deliveryByPart[record.part_code].received += record.received_qty;
      deliveryByPart[record.part_code].in += record.in_qty;
    });

    const unmatched: IUnmatchedPart[] = partsData
      .map((part) => {
        const delivery = deliveryByPart[part.part_code] || { received: 0, in: 0 };
        const shortage = part.demand_quantity - delivery.in;
        const is_critical = part.critical_level >= 4.0;

        // 模拟预计到货日期（实际应从后端获取）
        const estimated_arrival = shortage > 0 
          ? `2026-06-${String(Math.floor(Math.random() * 10) + 25).padStart(2, '0')}`
          : '';

        return {
          part_code: part.part_code,
          part_name: part.part_name,
          demand_quantity: part.demand_quantity,
          received_quantity: delivery.received,
          in_quantity: delivery.in,
          shortage,
          critical_level: part.critical_level,
          critical_reason: part.critical_reason,
          is_critical,
          estimated_arrival,
          project_id: part.project_id,
        };
      })
      .filter((item) => item.shortage > 0);

    return unmatched;
  }, []);

  // 过滤后的数据
  const filteredParts = useMemo(() => {
    let result = unmatchedParts;
    
    if (selectedProjectId !== null) {
      result = result.filter((p) => p.project_id === selectedProjectId);
    }
    
    if (filterCritical) {
      result = result.filter((p) => p.is_critical);
    }
    
    return result;
  }, [unmatchedParts, selectedProjectId, filterCritical]);

  // 统计关键件缺料数量
  const criticalShortageCount = unmatchedParts.filter((p) => p.is_critical).length;

  const columns = [
    {
      title: '零件号',
      dataIndex: 'part_code',
      key: 'part_code',
      width: 160,
      fixed: 'left' as const,
      render: (text: string) => (
        <span className="font-mono text-sm font-medium text-foreground">{text}</span>
      ),
    },
    {
      title: '零件名称',
      dataIndex: 'part_name',
      key: 'part_name',
      width: 200,
      render: (text: string, record: IUnmatchedPart) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{text}</span>
          {record.is_critical && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
              关键件
            </Badge>
          )}
        </div>
      ),
    },
    {
      title: '需求量',
      dataIndex: 'demand_quantity',
      key: 'demand_quantity',
      width: 100,
      align: 'right' as const,
      render: (text: number) => (
        <span className="font-mono text-sm font-medium text-foreground">{text}</span>
      ),
    },
    {
      title: '已入库',
      dataIndex: 'in_quantity',
      key: 'in_quantity',
      width: 100,
      align: 'right' as const,
      render: (text: number) => (
        <span className="font-mono text-sm font-medium text-foreground">{text}</span>
      ),
    },
    {
      title: '缺口',
      dataIndex: 'shortage',
      key: 'shortage',
      width: 100,
      align: 'right' as const,
      render: (text: number) => (
        <span className="font-mono text-sm font-bold text-destructive">{text}</span>
      ),
    },
    {
      title: '关键度',
      dataIndex: 'critical_level',
      key: 'critical_level',
      width: 120,
      render: (level: number) => {
        const tag = level >= 4.0 ? 'critical' : level >= 3.0 ? 'sub-critical' : 'normal';
        const colors = {
          critical: 'bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] border-[hsl(4_65%_48%)]',
          'sub-critical': 'bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)] border-[hsl(40_70%_50%)]',
          normal: 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border-[hsl(152_55%_40%)]',
        };

        return (
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[tag]}`}
          >
            <span className="font-mono font-semibold">{level.toFixed(1)}</span>
          </div>
        );
      },
    },
    {
      title: '预计到货',
      dataIndex: 'estimated_arrival',
      key: 'estimated_arrival',
      width: 120,
      render: (date: string) =>
        date ? (
          <div className="flex items-center gap-1.5">
            <ClockIcon className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-xs text-foreground">{date}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <section className="w-full">
      <Card className="border border-border rounded-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-sm bg-destructive/10">
                <PackageIcon className="size-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  未到货零件追踪
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  需求量 − 已入库数量 &gt; 0 的零件清单
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {criticalShortageCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-destructive/10 border border-destructive/20">
                  <AlertTriangleIcon className="size-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    关键件缺料 {criticalShortageCount} 项
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 筛选器 */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <FilterIcon className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">筛选：</span>
            <button
              onClick={() => setFilterCritical(!filterCritical)}
              className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                filterCritical
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-card border border-border text-foreground hover:bg-accent'
              }`}
            >
              仅显示关键件
            </button>
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-1.5 rounded-sm text-sm border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            >
              <option value="">全部项目</option>
              <option value="1">E70 迭代改款</option>
              <option value="2">G59 海外版</option>
              <option value="3">S597 MT 试制</option>
              <option value="4">V58 电驱验证</option>
            </select>
          </div>

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={filteredParts}
            rowKey="part_code"
            scroll={{ x: 900 }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
            rowClassName={(record: IUnmatchedPart) => {
              if (record.is_critical) {
                return 'bg-[hsl(4_55%_95%)]';
              } else if (record.critical_level >= 3.0) {
                return 'bg-[hsl(40_75%_94%)]';
              }
              return '';
            }}
            size="middle"
            locale={{ emptyText: '暂无未到货零件' }}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default UnmatchedPartsSection;
