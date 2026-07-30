import React from 'react';
import deliveryData from '@shared/static/delivery.json';
import type { IDeliveryRecord, IProfessionalSummary } from '@/types';
import { AlertTriangleIcon, UsersIcon, PackageIcon } from 'lucide-react';

function getUnqualifiedSummaries(): IProfessionalSummary[] {
  const records = (deliveryData as IDeliveryRecord[]).filter(
    (r) => r.state === '不合格待判定'
  );

  const groupedMap = new Map<
    string,
    { quantity: number; deliveryCodes: Set<string> }
  >();

  records.forEach((r) => {
    const existing = groupedMap.get(r.professional);
    if (existing) {
      existing.quantity += r.unqualified_qty;
      existing.deliveryCodes.add(r.delivery_code);
    } else {
      groupedMap.set(r.professional, {
        quantity: r.unqualified_qty,
        deliveryCodes: new Set([r.delivery_code]),
      });
    }
  });

  return Array.from(groupedMap.entries())
    .map(([professional, data]) => ({
      professional,
      quantity: data.quantity,
      delivery_count: data.deliveryCodes.size,
    }))
    .sort((a, b) => b.quantity - a.quantity);
}

const UnqualifiedSummarySection: React.FC = () => {
  const summaries = getUnqualifiedSummaries();
  const totalUnqualified = summaries.reduce((sum, s) => sum + s.quantity, 0);
  const totalDeliveryCodes = new Set(
    (deliveryData as IDeliveryRecord[])
      .filter((r) => r.state === '不合格待判定')
      .map((r) => r.delivery_code)
  ).size;

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangleIcon className="size-4.5 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">
          按专业室汇总
        </h2>
        <span className="text-sm text-muted-foreground ml-2">
          共{' '}
          <span className="font-mono font-medium text-foreground">
            {totalUnqualified}
          </span>{' '}
          件不合格，涉及{' '}
          <span className="font-mono font-medium text-foreground">
            {totalDeliveryCodes}
          </span>{' '}
          个送货单
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.length === 0 && (
          <div className="col-span-full rounded-sm border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            暂无不合格待判定记录
          </div>
        )}

        {summaries.map((summary) => {
          const rate =
            totalUnqualified > 0
              ? ((summary.quantity / totalUnqualified) * 100).toFixed(1)
              : '0.0';

          return (
            <div
              key={summary.professional}
              className="rounded-sm border border-border bg-card p-5 transition-colors hover:border-border/80"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-8 items-center justify-center rounded-sm bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)]">
                  <UsersIcon className="size-4" />
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {summary.professional}
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold font-mono tracking-tight text-[hsl(4_60%_28%)]">
                  {summary.quantity}
                </span>
                <span className="text-xs text-muted-foreground">件</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <PackageIcon className="size-3" />
                  <span>
                    <span className="font-mono font-medium">
                      {summary.delivery_count}
                    </span>{' '}
                    个送货单
                  </span>
                </div>
                <span className="font-mono font-medium">
                  {rate}%
                </span>
              </div>

              {/* 占比条 */}
              <div className="mt-3 h-1 w-full rounded-full bg-accent overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(4_65%_48%)] transition-all"
                  style={{
                    width: `${Math.min(parseFloat(rate), 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default UnqualifiedSummarySection;
