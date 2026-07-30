import { useState, useCallback } from 'react';
import { SaveIcon, RotateCcwIcon, ShieldCheckIcon, PackageIcon, AlertTriangleIcon, TrendingUpIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { ISystemThresholds } from '@/types';

/* ── 默认阈值 ───────────────────────────────────────────── */
const DEFAULT_THRESHOLDS: ISystemThresholds = {
  critical_min: 4.0,
  sub_critical_min: 3.0,
  delivery_safe: 95,
  delivery_warning: 80,
};

const STORAGE_KEY = '__global_dfmc_systemThresholds';

function loadThresholds(): ISystemThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_THRESHOLDS;
}

/* ── 辅助：风险颜色映射 ─────────────────────────────────── */
function deliveryColor(rate: number, safe: number, warning: number): string {
  if (rate >= safe) return 'text-[hsl(152_60%_22%)]';
  if (rate >= warning) return 'text-[hsl(40_65%_25%)]';
  return 'text-[hsl(4_60%_28%)]';
}

function criticalColor(score: number, criticalMin: number, subMin: number): string {
  if (score >= criticalMin) return 'bg-[hsl(4_55%_95%)] border-[hsl(4_65%_48%)] text-[hsl(4_60%_28%)]';
  if (score >= subMin) return 'bg-[hsl(40_75%_94%)] border-[hsl(40_70%_50%)] text-[hsl(40_65%_25%)]';
  return 'bg-[hsl(152_45%_95%)] border-[hsl(152_55%_40%)] text-[hsl(152_60%_22%)]';
}

/* ── 组件 ───────────────────────────────────────────────── */
export default function SystemParamsSection() {
  const [thresholds, setThresholds] = useState<ISystemThresholds>(loadThresholds);
  const [draft, setDraft] = useState<ISystemThresholds>(loadThresholds);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    draft.critical_min !== thresholds.critical_min ||
    draft.sub_critical_min !== thresholds.sub_critical_min ||
    draft.delivery_safe !== thresholds.delivery_safe ||
    draft.delivery_warning !== thresholds.delivery_warning;

  const updateField = useCallback(
    <K extends keyof ISystemThresholds>(key: K, value: number) => {
      setDraft(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = () => {
    // 基础校验
    if (draft.critical_min <= draft.sub_critical_min) {
      toast.error('关键件阈值必须大于次关键件阈值');
      return;
    }
    if (draft.delivery_safe <= draft.delivery_warning) {
      toast.error('安全阈值必须大于预警阈值');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setThresholds(draft);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSaving(false);
      toast.success('系统参数已保存');
    }, 400);
  };

  const handleReset = () => {
    setDraft(DEFAULT_THRESHOLDS);
    setThresholds(DEFAULT_THRESHOLDS);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('已恢复默认参数');
  };

  /* ── 示例数据：用于阈值可视化预览 ──────────────────── */
  const sampleDeliveryRates = [98, 91, 72, 85, 96, 63];
  const sampleCriticalScores = [4.8, 3.5, 2.1, 4.2, 3.0, 1.6];

  return (
    <section className="w-full space-y-6">
      {/* ── 区块标题 ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">系统参数配置</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            调整关键件评分阈值与到货率阈值，影响项目详情页的风险标识与分类
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="rounded-md text-xs"
          >
            <RotateCcwIcon className="size-3.5 mr-1.5" />
            恢复默认
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <SaveIcon className="size-3.5 mr-1.5" />
            {saving ? '保存中…' : '保存配置'}
          </Button>
        </div>
      </div>

      {/* ── 两列配置面板 ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 关键件评分阈值 ───────────────────────── */}
        <div className="bg-card border border-border rounded-sm p-5 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-sm bg-[hsl(4_55%_95%)]">
              <ShieldCheckIcon className="size-4 text-[hsl(4_60%_28%)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">关键件评分阈值</h3>
              <p className="text-xs text-muted-foreground">四维加权评分 1-5 分制</p>
            </div>
          </div>

          {/* 关键件阈值输入 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-[hsl(4_65%_48%)]" />
                关键件（红色）分数下限
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={draft.critical_min}
                  onChange={e => updateField('critical_min', parseFloat(e.target.value) || 0)}
                  className="font-mono text-sm h-9 w-24 rounded-md"
                />
                <span className="text-xs text-muted-foreground">
                  ≥ {draft.critical_min.toFixed(1)} 分 → 🔴 关键件
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-[hsl(40_70%_50%)]" />
                次关键件（黄色）分数下限
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={draft.sub_critical_min}
                  onChange={e => updateField('sub_critical_min', parseFloat(e.target.value) || 0)}
                  className="font-mono text-sm h-9 w-24 rounded-md"
                />
                <span className="text-xs text-muted-foreground">
                  {draft.sub_critical_min.toFixed(1)} – {draft.critical_min.toFixed(1)} 分 → 🟡 次关键
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-[hsl(152_55%_40%)]" />
                常规件（绿色）
              </Label>
              <p className="text-xs text-muted-foreground pl-3.5">
                &lt; {draft.sub_critical_min.toFixed(1)} 分 → 🟢 常规件
              </p>
            </div>
          </div>

          {/* 可视化预览 */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2.5 flex items-center gap-1">
              <PackageIcon className="size-3" />
              评分预览
            </p>
            <div className="flex flex-wrap gap-2">
              {sampleCriticalScores.map((score, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-mono border ${criticalColor(score, draft.critical_min, draft.sub_critical_min)}`}
                >
                  {score.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── 到货率阈值 ───────────────────────────── */}
        <div className="bg-card border border-border rounded-sm p-5 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-sm bg-[hsl(152_45%_95%)]">
              <TrendingUpIcon className="size-4 text-[hsl(152_60%_22%)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">到货率阈值</h3>
              <p className="text-xs text-muted-foreground">项目到货率与关键件齐套率</p>
            </div>
          </div>

          {/* 到货率阈值输入 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-[hsl(152_55%_40%)]" />
                安全阈值（绿色）
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.delivery_safe}
                  onChange={e => updateField('delivery_safe', parseInt(e.target.value) || 0)}
                  className="font-mono text-sm h-9 w-24 rounded-md"
                />
                <span className="text-xs text-muted-foreground">
                  ≥ {draft.delivery_safe}% → 🟢 可装
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-[hsl(40_70%_50%)]" />
                预警阈值（黄色）
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.delivery_warning}
                  onChange={e => updateField('delivery_warning', parseInt(e.target.value) || 0)}
                  className="font-mono text-sm h-9 w-24 rounded-md"
                />
                <span className="text-xs text-muted-foreground">
                  {draft.delivery_warning}% – {draft.delivery_safe}% → 🟡 预警
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-[hsl(4_65%_48%)]" />
                阻塞（红色）
              </Label>
              <p className="text-xs text-muted-foreground pl-3.5">
                &lt; {draft.delivery_warning}% → 🔴 阻塞
              </p>
            </div>
          </div>

          {/* 可视化预览 */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2.5 flex items-center gap-1">
              <AlertTriangleIcon className="size-3" />
              到货率预览
            </p>
            <div className="flex flex-wrap gap-2">
              {sampleDeliveryRates.map((rate, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-mono border ${
                    rate >= draft.delivery_safe
                      ? 'bg-[hsl(152_45%_95%)] border-[hsl(152_55%_40%)] text-[hsl(152_60%_22%)]'
                      : rate >= draft.delivery_warning
                        ? 'bg-[hsl(40_75%_94%)] border-[hsl(40_70%_50%)] text-[hsl(40_65%_25%)]'
                        : 'bg-[hsl(4_55%_95%)] border-[hsl(4_65%_48%)] text-[hsl(4_60%_28%)]'
                  }`}
                >
                  {rate}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 阈值范围示意图 ──────────────────────────── */}
      <div className="bg-card border border-border rounded-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">阈值范围示意</h3>
        <div className="space-y-5">
          {/* 到货率条 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">到货率 / 齐套率</p>
            <div className="relative h-6 rounded-sm overflow-hidden flex">
              <div
                className="h-full bg-[hsl(4_55%_95%)] flex items-center justify-center text-[10px] font-mono font-medium text-[hsl(4_60%_28%)]"
                style={{ width: `${draft.delivery_warning}%` }}
              >
                &lt;{draft.delivery_warning}%
              </div>
              <div
                className="h-full bg-[hsl(40_75%_94%)] flex items-center justify-center text-[10px] font-mono font-medium text-[hsl(40_65%_25%)]"
                style={{ width: `${draft.delivery_safe - draft.delivery_warning}%` }}
              >
                {draft.delivery_warning}–{draft.delivery_safe}%
              </div>
              <div
                className="h-full bg-[hsl(152_45%_95%)] flex items-center justify-center text-[10px] font-mono font-medium text-[hsl(152_60%_22%)]"
                style={{ width: `${100 - draft.delivery_safe}%` }}
              >
                ≥{draft.delivery_safe}%
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground font-mono">0%</span>
              <span className="text-[10px] text-muted-foreground font-mono">100%</span>
            </div>
          </div>

          {/* 评分条 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">关键件评分</p>
            <div className="relative h-6 rounded-sm overflow-hidden flex">
              <div
                className="h-full bg-[hsl(152_45%_95%)] flex items-center justify-center text-[10px] font-mono font-medium text-[hsl(152_60%_22%)]"
                style={{ width: `${(draft.sub_critical_min / 5) * 100}%` }}
              >
                &lt;{draft.sub_critical_min.toFixed(1)}
              </div>
              <div
                className="h-full bg-[hsl(40_75%_94%)] flex items-center justify-center text-[10px] font-mono font-medium text-[hsl(40_65%_25%)]"
                style={{ width: `${((draft.critical_min - draft.sub_critical_min) / 5) * 100}%` }}
              >
                {draft.sub_critical_min.toFixed(1)}–{draft.critical_min.toFixed(1)}
              </div>
              <div
                className="h-full bg-[hsl(4_55%_95%)] flex items-center justify-center text-[10px] font-mono font-medium text-[hsl(4_60%_28%)]"
                style={{ width: `${((5 - draft.critical_min) / 5) * 100}%` }}
              >
                ≥{draft.critical_min.toFixed(1)}
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground font-mono">1 分</span>
              <span className="text-[10px] text-muted-foreground font-mono">5 分</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 底部说明 ────────────────────────────────── */}
      <div className="border-l-3 border-l-[hsl(42_96%_52%)] pl-4 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          阈值调整后，项目概览页的风险高亮、项目详情页的关键件评分卡与到货率仪表盘将实时生效。
          建议调整后在测试项目上验证效果，确认符合预期后再推广应用。
        </p>
      </div>
    </section>
  );
}
