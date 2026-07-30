import { useState, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { RotateCcwIcon } from 'lucide-react';
import type { IAssemblyWeights } from '@/types';

const STORAGE_KEY = '__global_dfmc_assemblyWeights';
const DEFAULT_WEIGHTS: IAssemblyWeights = {
  completeness: 0.5,
  workload_balance: 0.3,
  risk_dispersion: 0.2,
};

interface ISliderConfig {
  key: keyof IAssemblyWeights;
  label: string;
  symbol: string;
  description: string;
  color: string;
}

const SLIDERS: ISliderConfig[] = [
  {
    key: 'completeness',
    label: '齐套率权重',
    symbol: 'α',
    description: '优先装配关键件齐套率高的车型',
    color: '#2e8b6e',
  },
  {
    key: 'workload_balance',
    label: '工时均衡权重',
    symbol: 'β',
    description: '相似工序连续装配减少换型时间',
    color: '#2b78c4',
  },
  {
    key: 'risk_dispersion',
    label: '风险分散权重',
    symbol: 'γ',
    description: '避免集中依赖同一供应商',
    color: '#c44040',
  },
];

function loadWeights(): IAssemblyWeights {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return { ...DEFAULT_WEIGHTS };
}

function saveWeights(weights: IAssemblyWeights) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
  } catch {
    // ignore
  }
}

/** 调整一个滑块后，按比例重新分配其余两个使总和 = 1.0 */
function redistribute(
  weights: IAssemblyWeights,
  changedKey: keyof IAssemblyWeights,
  newValue: number,
): IAssemblyWeights {
  const remaining = 1 - newValue;
  const otherKeys = (Object.keys(weights) as (keyof IAssemblyWeights)[]).filter(
    (k) => k !== changedKey,
  );
  const otherSum = otherKeys.reduce((s, k) => s + weights[k], 0);

  const next = { ...weights, [changedKey]: newValue };

  if (otherSum > 0) {
    otherKeys.forEach((k) => {
      next[k] = Math.round(((weights[k] / otherSum) * remaining) * 100) / 100;
    });
  } else {
    const half = Math.round((remaining / 2) * 100) / 100;
    next[otherKeys[0]] = half;
    next[otherKeys[1]] = remaining - half;
  }

  // 修正浮点误差
  const sum = Object.values(next).reduce((s, v) => s + v, 0);
  const diff = Math.round((1 - sum) * 100) / 100;
  if (diff !== 0) {
    const adjustKey = otherKeys[0];
    next[adjustKey] = Math.round((next[adjustKey] + diff) * 100) / 100;
  }

  return next;
}

export default function WeightControlSection() {
  const [weights, setWeights] = useState<IAssemblyWeights>(loadWeights);

  useEffect(() => {
    saveWeights(weights);
  }, [weights]);

  const handleSliderChange = useCallback(
    (key: keyof IAssemblyWeights, val: number[]) => {
      setWeights((prev) => redistribute(prev, key, val[0]));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
  }, []);

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 1) < 0.02;

  return (
    <section className="w-full">
      <div className="rounded-sm border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-foreground">
              多目标权重调节
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${
                isValid
                  ? 'border border-[#2e8b6e] bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)]'
                  : 'border border-[#c44040] bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)]'
              }`}
            >
              Σ = {total.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <RotateCcwIcon className="size-3" />
            重置默认
          </button>
        </div>

        {/* Sliders */}
        <div className="space-y-5 px-5 py-5">
          {SLIDERS.map((slider) => (
            <div key={slider.key} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-7 items-center justify-center rounded-sm font-mono text-sm font-bold text-white"
                    style={{ backgroundColor: slider.color }}
                  >
                    {slider.symbol}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {slider.label}
                  </span>
                </div>
                <span className="font-mono text-lg font-bold tracking-tight text-foreground">
                  {weights[slider.key].toFixed(2)}
                </span>
              </div>

              <Slider
                value={[weights[slider.key]]}
                onValueChange={(val) => handleSliderChange(slider.key, val)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {slider.description}
                </p>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {(weights[slider.key] * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Weight Distribution Bar */}
        <div className="border-t border-border px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">权重分布</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              调整后自动重排推荐顺序
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-sm">
            {SLIDERS.map((slider) => (
              <div
                key={slider.key}
                className="h-full transition-all duration-300 ease-out first:rounded-l-sm last:rounded-r-sm"
                style={{
                  width: `${weights[slider.key] * 100}%`,
                  backgroundColor: slider.color,
                }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex gap-4">
            {SLIDERS.map((slider) => (
              <div key={slider.key} className="flex items-center gap-1.5">
                <div
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: slider.color }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {slider.symbol} {slider.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
