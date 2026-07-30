import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  ActivityIcon,
  TimerIcon,
  TerminalIcon,
  AlertCircleIcon,
  CalendarIcon,
  DatabaseIcon,
  ZapIcon,
  Settings2Icon,
  HistoryIcon,
  FileSpreadsheetIcon,
  CopyIcon,
  CheckIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ISpiderLog, SpiderStatus } from '@/types';

const MOCK_LOGS: ISpiderLog[] = [];

const STATUS_CONFIG: Record<SpiderStatus, { label: string; emoji: string; color: string; bgClass: string; dotClass: string }> = {
  running: { label: '运行中', emoji: '🟢', color: 'text-[hsl(152_60%_22%)]', bgClass: 'bg-[hsl(152_45%_95%)] border border-[hsl(152_55%_40%)]', dotClass: 'bg-[hsl(152_55%_40%)]' },
  idle: { label: '空闲', emoji: '⚪', color: 'text-muted-foreground', bgClass: 'bg-[hsl(215_10%_95%)] border border-[hsl(215_12%_75%)]', dotClass: 'bg-[hsl(215_12%_75%)]' },
  error: { label: '异常', emoji: '🔴', color: 'text-[hsl(4_60%_28%)]', bgClass: 'bg-[hsl(4_55%_95%)] border border-[hsl(4_65%_48%)]', dotClass: 'bg-[hsl(4_65%_48%)]' },
  paused: { label: '已暂停', emoji: '🟡', color: 'text-[hsl(40_65%_25%)]', bgClass: 'bg-[hsl(40_75%_94%)] border border-[hsl(40_70%_50%)]', dotClass: 'bg-[hsl(40_70%_50%)]' },
};

const LOG_LEVEL_STYLES: Record<string, { badge: string; text: string }> = {
  INFO: { badge: 'bg-[hsl(210_55%_95%)] text-[hsl(210_55%_25%)] border border-[hsl(210_60%_48%)]', text: 'text-[hsl(210_60%_48%)]' },
  WARN: { badge: 'bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)] border border-[hsl(40_70%_50%)]', text: 'text-[hsl(40_70%_50%)]' },
  ERROR: { badge: 'bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] border border-[hsl(4_65%_48%)]', text: 'text-[hsl(4_65%_48%)]' },
};

type SyncMode = 'full' | 'incremental';
type SyncSource = 'warehouse' | 'feishu';

interface ISyncRecord {
  time: string;
  source: SyncSource;
  mode: SyncMode;
  added: number;
  updated: number;
  duration: string;
  success: boolean;
}

const MOCK_SYNC_HISTORY: ISyncRecord[] = [];

const INTERVAL_OPTIONS = [
  { value: '30', label: '30 分钟' },
  { value: '60', label: '1 小时' },
  { value: '120', label: '2 小时' },
  { value: '360', label: '6 小时' },
  { value: '720', label: '12 小时' },
  { value: '1440', label: '24 小时' },
];

/* ── 单行日志组件（含复制按钮 + 错误高亮） ── */
function LogRow({
  log,
  ls,
  isError,
  isWarn,
  rowText,
}: {
  log: ISpiderLog;
  ls: { badge: string; text: string };
  isError: boolean;
  isWarn: boolean;
  rowText: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rowText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-2 py-1 px-2 -mx-2 rounded-sm transition-colors',
        isError && 'bg-[hsl(4_55%_92%)]',
        isWarn && !isError && 'bg-[hsl(40_75%_90%)]',
        !isError && !isWarn && 'hover:bg-[hsl(215_24%_18%)]'
      )}
    >
      <span className="shrink-0 text-[hsl(215_14%_48%)] tabular-nums select-all">{log.timestamp}</span>
      <span className={cn('shrink-0 inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold tracking-wide', ls.badge)}>{log.level}</span>
      <span className={cn('break-all flex-1 min-w-0', log.level === 'ERROR' ? ls.text : 'text-[hsl(215_12%_76%)]')}>{log.content}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[hsl(215_24%_24%)] text-[hsl(215_12%_56%)] hover:text-[hsl(215_10%_90%)]"
        title="复制此行"
      >
        {copied ? <CheckIcon className="size-3 text-[hsl(152_55%_40%)]" /> : <CopyIcon className="size-3" />}
      </button>
    </div>
  );
}

export default function SpiderControlSection() {
  const [status, setStatus] = useState<SpiderStatus>('running');
  const [isTriggering, setIsTriggering] = useState(false);
  const [interval, setInterval] = useState('60');
  const [isAutoEnabled, setIsAutoEnabled] = useState(true);
  const [logs, setLogs] = useState<ISpiderLog[]>(MOCK_LOGS);
  const [showHistory, setShowHistory] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const config = STATUS_CONFIG[status];

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const appendLog = useCallback((level: 'INFO' | 'WARN' | 'ERROR', content: string) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setLogs((prev) => [...prev, { timestamp: ts, level, content }]);
  }, []);

  const handleSync = (_mode: SyncMode, _source: SyncSource) => {
    if (status === 'running') return;
    toast.info('后端接口未对接，同步功能待接入');
  };

  const handlePause = () => {
    if (status === 'paused') {
      setStatus('running');
      setIsAutoEnabled(true);
      appendLog('INFO', '定时调度已恢复，下次按计划执行');
    } else {
      setStatus('paused');
      setIsAutoEnabled(false);
      appendLog('WARN', '定时调度已暂停，不会自动执行爬虫任务');
    }
  };

  const isRunning = status === 'running';

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <ActivityIcon className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground tracking-tight">爬虫控制台</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ═══ 左栏 ═══ */}
        <div className="lg:col-span-4 space-y-4">
          {/* 运行状态 */}
          <div className="rounded-sm border border-border bg-card p-5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">运行状态</span>
            <div className="mt-3 flex items-center gap-3">
              <span className="relative flex size-3 shrink-0">
                {status === 'running' && <span className="absolute inset-0 rounded-full bg-[hsl(152_55%_40%)] opacity-40 animate-ping" />}
                <span className={cn('relative inline-flex size-3 rounded-full', config.dotClass)} />
              </span>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', config.bgClass, config.color)}>
                <span>{config.emoji}</span>{config.label}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><HistoryIcon className="size-3" />上次执行</span>
                <span className="font-mono font-medium text-foreground">06-23 10:00</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><TimerIcon className="size-3" />下次执行</span>
                <span className="font-mono font-medium text-foreground">{status === 'paused' ? '—' : '06-23 11:00'}</span>
              </div>
            </div>
          </div>

          {/* 自动调度 */}
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <CalendarIcon className="size-3.5" />自动调度
              </span>
              <button
                onClick={() => {
                  const next = !isAutoEnabled;
                  setIsAutoEnabled(next);
                  if (!next) { setStatus('paused'); appendLog('WARN', '自动调度已关闭'); }
                  else { setStatus('idle'); appendLog('INFO', '自动调度已开启'); }
                }}
                className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200', isAutoEnabled ? 'bg-primary' : 'bg-border')}
              >
                <span className={cn('inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5', isAutoEnabled ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">执行频率</label>
              <div className="grid grid-cols-3 gap-1.5">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setInterval(opt.value); appendLog('INFO', `调度频率已更新为每 ${opt.label} 执行`); }}
                    disabled={!isAutoEnabled}
                    className={cn('px-2 py-1.5 rounded-sm text-xs font-medium border transition-colors', interval === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground', !isAutoEnabled && 'opacity-40 cursor-not-allowed')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {isAutoEnabled && (
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Settings2Icon className="size-3" />
                <span>每 <span className="font-mono font-medium text-foreground">{interval}</span> 分钟执行一次增量同步</span>
              </div>
            )}
          </div>

          {/* 🏭 仓库系统同步 */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              <DatabaseIcon className="size-3" />🏭 仓库系统
            </span>
            <Button onClick={() => handleSync('incremental', 'warehouse')} disabled={isRunning} variant="outline" className="w-full justify-start gap-3 h-auto px-4 py-3">
              <ZapIcon className="size-4 text-[hsl(152_60%_22%)]" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">增量同步</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">仅抓取上次同步后的新增/变更记录</p>
              </div>
            </Button>
            <Button onClick={() => handleSync('full', 'warehouse')} disabled={isRunning} variant="outline" className="w-full justify-start gap-3 h-auto px-4 py-3">
              <DatabaseIcon className="size-4 text-[hsl(210_55%_25%)]" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">全量同步</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">抓取全部历史到货数据，覆盖更新</p>
              </div>
            </Button>
          </div>

          {/* 📋 飞书共享表同步 */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              <FileSpreadsheetIcon className="size-3" />📋 飞书共享表
            </span>
            <Button onClick={() => handleSync('incremental', 'feishu')} disabled={isRunning} variant="outline" className="w-full justify-start gap-3 h-auto px-4 py-3">
              <ZapIcon className="size-4 text-[hsl(152_60%_22%)]" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">飞书增量同步</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">从飞书共享表拉取最新到货记录</p>
              </div>
            </Button>
            <Button onClick={() => handleSync('full', 'feishu')} disabled={isRunning} variant="outline" className="w-full justify-start gap-3 h-auto px-4 py-3">
              <DatabaseIcon className="size-4 text-[hsl(210_55%_25%)]" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">飞书全量同步</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">重新拉取飞书共享表全部数据</p>
              </div>
            </Button>
          </div>

          {/* 暂停/恢复 */}
          <Button onClick={handlePause} disabled={isRunning} variant={status === 'paused' ? 'default' : 'outline'} className={cn('w-full justify-start gap-3 h-auto px-4 py-3', status === 'paused' && 'bg-[hsl(40_70%_50%)] text-white hover:bg-[hsl(40_70%_45%)]')}>
            {status === 'paused' ? (
              <><PlayIcon className="size-4" /><div className="flex-1 min-w-0 text-left"><p className="text-sm font-medium">恢复调度</p><p className="text-[11px] opacity-80 leading-tight mt-0.5">重新启动定时自动执行</p></div></>
            ) : (
              <><PauseIcon className="size-4 text-[hsl(40_65%_25%)]" /><div className="flex-1 min-w-0 text-left"><p className="text-sm font-medium text-foreground">暂停调度</p><p className="text-[11px] text-muted-foreground leading-tight mt-0.5">暂停所有定时任务，可手动恢复</p></div></>
            )}
          </Button>
        </div>

        {/* ═══ 右栏 ═══ */}
        <div className="lg:col-span-8 space-y-4">
          {/* 终端日志 */}
          <div className="rounded-sm border border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-[hsl(215_28%_12%)]">
              <TerminalIcon className="size-3.5 text-[hsl(215_12%_56%)]" />
              <span className="text-xs font-medium text-[hsl(215_12%_76%)] font-mono">spider.log</span>
              {isRunning && <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[hsl(152_60%_22%)]"><span className="size-1.5 rounded-full bg-[hsl(152_55%_40%)] animate-pulse" />执行中</span>}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(4_65%_48%)]" />
                <span className="size-2 rounded-full bg-[hsl(40_70%_50%)]" />
                <span className="size-2 rounded-full bg-[hsl(152_55%_40%)]" />
              </div>
            </div>
            <ScrollArea className="h-[380px]">
              <div className="p-4 font-mono text-xs leading-relaxed space-y-0.5">
                {logs.map((log, idx) => {
                  const ls = LOG_LEVEL_STYLES[log.level] || LOG_LEVEL_STYLES.INFO;
                  const isError = log.level === 'ERROR';
                  const isWarn = log.level === 'WARN';
                  const rowText = `${log.timestamp} [${log.level}] ${log.content}`;
                  return (
                    <LogRow
                      key={idx}
                      log={log}
                      ls={ls}
                      isError={isError}
                      isWarn={isWarn}
                      rowText={rowText}
                    />
                  );
                })}
                {isRunning && <div className="flex items-center gap-2 py-1 text-[hsl(42_96%_52%)]"><RefreshCwIcon className="size-3 animate-spin" /><span className="animate-pulse">等待爬虫响应...</span></div>}
                <div ref={logEndRef} />
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-[hsl(215_28%_12%)]">
              <span className="font-mono text-[10px] text-[hsl(215_12%_56%)]">共 {logs.length} 条日志</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const allText = logs.map((l) => `${l.timestamp} [${l.level}] ${l.content}`).join('\n');
                    navigator.clipboard.writeText(allText).then(() => toast.success('已复制全部日志'));
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(215_12%_56%)] hover:text-[hsl(215_10%_90%)] transition-colors"
                >
                  <CopyIcon className="size-3" />
                  复制全部
                </button>
                {logs.some(l => l.level === 'WARN') && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(40_65%_25%)]"><AlertCircleIcon className="size-3" />{logs.filter(l => l.level === 'WARN').length} 条警告</span>}
                {logs.some(l => l.level === 'ERROR') && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(4_60%_28%)]"><AlertCircleIcon className="size-3" />{logs.filter(l => l.level === 'ERROR').length} 条错误</span>}
              </div>
            </div>
          </div>

          {/* 同步历史 */}
          <div className="rounded-sm border border-border bg-card overflow-hidden">
            <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-accent/30 transition-colors">
              <span className="flex items-center gap-2"><HistoryIcon className="size-4 text-muted-foreground" />同步历史</span>
              <span className="text-muted-foreground">{showHistory ? '▾' : '▸'}</span>
            </button>
            {showHistory && (
              <div className="border-t border-border">
                <div className="px-5 py-3 space-y-2">
                  {MOCK_SYNC_HISTORY.map((rec, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/40 last:border-0">
                      <span className="font-mono text-muted-foreground w-20 shrink-0">{rec.time}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', rec.source === 'warehouse' ? 'bg-[hsl(210_55%_95%)] text-[hsl(210_55%_25%)] border-[hsl(210_60%_48%)]' : 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border-[hsl(152_55%_40%)]')}>
                        {rec.source === 'warehouse' ? '🏭 仓库' : '📋 飞书'}
                      </span>
                      <span className="text-muted-foreground w-10">{rec.mode === 'full' ? '全量' : '增量'}</span>
                      <span className="text-muted-foreground">+<span className="font-mono text-foreground">{rec.added}</span></span>
                      <span className="text-muted-foreground">~<span className="font-mono text-foreground">{rec.updated}</span></span>
                      <span className="font-mono text-muted-foreground ml-auto">{rec.duration}</span>
                      <span className={cn('size-2 rounded-full', rec.success ? 'bg-[hsl(152_55%_40%)]' : 'bg-[hsl(4_65%_48%)]')} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
