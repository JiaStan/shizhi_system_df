import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import {
  UploadCloudIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  XCircleIcon,
  SparklesIcon,
  Settings2Icon,
  AlertTriangleIcon,
  Trash2Icon,
  BrainIcon,
  TagIcon,
  DownloadIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

type ColType = 'known' | 'config' | 'metadata';

interface IDetectionItem {
  column_name: string;
  column_type: ColType;
  confidence: number;
  reason: string;
  part_count?: number;
  value_range?: string;
}

interface IPartRow {
  key: number;
  seq: number;
  line: string;
  process: string;
  part_code: string;
  part_name: string;
  total_consumption: number;
  [configKey: string]: number | string;
}

// ════════════════════════════════════════════════════════════
// Constants — 三层检测规则
// ════════════════════════════════════════════════════════════

const KNOWN_COL_PATTERNS = [
  /序号/,
  /线别/,
  /工序/,
  /零件号/,
  /物料编码/,
  /零件名称/,
  /总消耗/,
  /零件接收/,
];
const META_COL_PATTERNS = [
  /力矩/,
  /备注/,
  /自检/,
  /追溯/,
  /NM/i,
  /★/,
];
const CONFIG_COL_REGEX = /^[A-Z]\d{2,4}$/;

// Mock 数据已清空，等待后端接口对接
const MOCK_PARTS: IPartRow[] = [];

const MOCK_DETECTION: IDetectionItem[] = [];

// ════════════════════════════════════════════════════════════
// 规则引擎（Layer 1）
// ════════════════════════════════════════════════════════════

function detectColumnType(name: string): { type: ColType; conf: number; reason: string } {
  for (const p of KNOWN_COL_PATTERNS) {
    if (p.test(name)) return { type: 'known', conf: 1.0, reason: 'PBOM 标准列' };
  }
  for (const p of META_COL_PATTERNS) {
    if (p.test(name)) return { type: 'metadata', conf: 0.9, reason: `匹配元数据关键词「${name}」` };
  }
  if (CONFIG_COL_REGEX.test(name)) {
    return { type: 'config', conf: 0.95, reason: '匹配配置列编码格式（字母+数字）' };
  }
  return { type: 'unknown' as ColType, conf: 0.5, reason: '未匹配已知规则，需 AI 辅助识别' };
}

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export default function PbomUploadSection() {
  const [parts, setParts] = useState<IPartRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [detection, setDetection] = useState<IDetectionItem[]>([]);
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set());
  const [configAliases, setConfigAliases] = useState<Record<string, string>>({});
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [tableRef] = useAutoAnimate<HTMLTableElement>();

  // ── File Drop ──────────────────────────────────────────

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setIsParsing(true);

    // 等待后端接口对接，当前不填充数据
    setIsParsing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  // ── 配置列操作 ─────────────────────────────────────────

  const toggleConfig = useCallback((name: string) => {
    setSelectedConfigs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const updateAlias = useCallback((name: string, alias: string) => {
    setConfigAliases((prev) => ({ ...prev, [name]: alias }));
  }, []);

  // ── Layer 2: AI 辅助分析不确定列 ──────────────────────

  const runAiDetection = useCallback(async () => {
    setAiAnalyzing(true);
    try {
      const { capabilityClient } = await import('@lark-apaas/client-toolkit');
      const uncertainCols = detection
        .filter((d) => d.confidence < 0.7)
        .map((d) => d.column_name);
      if (uncertainCols.length === 0) return;

      const result = await capabilityClient
        .load('pbom_column_header_recognition_1')
        .call<{ column_list: Array<{ column_name: string; column_type: string; confidence: number; reason: string }> }>('textToJson', {
          excel_column_names: uncertainCols.join(', '),
        });

      if (result?.column_list && Array.isArray(result.column_list)) {
        setDetection((prev) =>
          prev.map((d) => {
            const ai = result.column_list.find(
              (item) => item.column_name === d.column_name
            );
            if (ai && d.confidence < 0.7) {
              const newType =
                ai.column_type === 'config'
                  ? 'config'
                  : ai.column_type === 'metadata'
                    ? 'metadata'
                    : d.column_type;
              return {
                ...d,
                column_type: newType as ColType,
                confidence: ai.confidence,
                reason: `AI: ${ai.reason}`,
              };
            }
            return d;
          })
        );
      }
    } catch {
      // AI 服务不可用时静默降级，用户可手动确认
    } finally {
      setAiAnalyzing(false);
    }
  }, [detection]);

  const confirmConfigs = useCallback(() => {
    setShowDialog(false);
  }, []);

  const handleReupload = useCallback(() => {
    setParts([]);
    setFile(null);
    setDetection([]);
    setSelectedConfigs(new Set());
    setConfigAliases({});
  }, []);

  // ── 下载 PBOM 模板 ────────────────────────────────
  const handleDownloadTemplate = useCallback(() => {
    import('xlsx').then((XLSX) => {
      const headers = ['序号', '线别', '安装工序', '零件号', '零件名称', '总消耗', 'M101', 'M102', 'M103'];
      const exampleRow = [1, '内饰', '仪表板安装', '96780-B2000', '仪表板总成', 1, 1, 0, 0];
      const exampleRow2 = [2, '底盘', '前桥安装', '54010-B1000', '前桥总成', 1, 1, 1, 1];
      const exampleRow3 = [3, '发动机', '动力总成安装', '21010-B0001', '增程器总成', 1, 1, 0, 0];

      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow, exampleRow2, exampleRow3]);
      ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length * 2 + 2, 12) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'PBOM消耗清单');
      XLSX.writeFile(wb, 'PBOM消耗清单模板.xlsx');
    });
  }, []);

  // ── 表格列定义 ────────────────────────────────────────

  const tableColumns: Array<Record<string, unknown>> = useMemo(
    () => [
      {
        title: '序号',
        dataIndex: 'seq',
        width: 60,
        align: 'center',
        render: (v: number) => (
          <span className="font-mono text-xs text-muted-foreground">{v}</span>
        ),
      },
      {
        title: '线别',
        dataIndex: 'line',
        width: 80,
      },
      {
        title: '安装工序',
        dataIndex: 'process',
        width: 200,
        ellipsis: true,
      },
      {
        title: '零件号',
        dataIndex: 'part_code',
        width: 160,
        render: (v: string) => (
          <span className="font-mono text-sm font-medium tracking-tight">{v}</span>
        ),
      },
      {
        title: '零件名称',
        dataIndex: 'part_name',
        width: 180,
        ellipsis: true,
      },
      {
        title: '总消耗',
        dataIndex: 'total_consumption',
        width: 80,
        align: 'right',
        render: (v: number) => (
          <span className="font-mono text-sm font-medium">{v}</span>
        ),
      },
      ...Array.from(selectedConfigs).map((cfg) => ({
        title: (
          <span className="inline-flex items-center gap-1">
            {configAliases[cfg] || cfg}
            <span className="font-mono text-[10px] font-normal text-muted-foreground">
              ({cfg})
            </span>
          </span>
        ),
        dataIndex: cfg,
        width: 110,
        align: 'right' as const,
        render: (v: number) => (
          <span className="font-mono text-sm font-medium">{v ?? '-'}</span>
        ),
      })),
    ],
    [selectedConfigs, configAliases]
  );

  // ── Derived Data ──────────────────────────────────────

  const configCandidates = detection.filter((d) => d.column_type === 'config' || d.column_type === ('unknown' as ColType));
  const metadataExcluded = detection.filter((d) => d.column_type === 'metadata');
  const hasUncertain = detection.some((d) => d.confidence < 0.7);
  const confirmedConfigList = Array.from(selectedConfigs).map(
    (name) => configAliases[name] || name
  );

  // ── Render ────────────────────────────────────────────

  return (
    <section className="w-full space-y-5">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            PBOM 消耗清单
          </h2>
          {file && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground"
            >
              <FileSpreadsheetIcon className="size-3.5 shrink-0" />
              <span className="max-w-[200px] truncate">{file.name}</span>
              <button
                onClick={handleReupload}
                className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                type="button"
              >
                <Trash2Icon className="size-3" />
              </button>
            </motion.div>
          )}
        </div>
        {parts.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleReupload}>
            <UploadCloudIcon className="mr-1.5 size-3.5" />
            重新上传
          </Button>
        )}
        {parts.length === 0 && (
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <DownloadIcon className="mr-1.5 size-3.5" />
            下载模板
          </Button>
        )}
      </div>

      {/* ── Upload Zone ── */}
      {parts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            {...getRootProps()}
            className={cn(
              'group cursor-pointer rounded-sm border-2 border-dashed border-border bg-card p-12',
              'transition-colors duration-200',
              'hover:border-primary/50 hover:bg-accent/20',
              isDragActive && 'border-primary bg-accent/30',
              isParsing && 'pointer-events-none opacity-60'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3 text-center">
              {isParsing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Settings2Icon className="size-10 text-primary" />
                  </motion.div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">正在解析 PBOM 文件...</p>
                    <p className="text-xs text-muted-foreground">
                      提取零件号、零件名、需求量，执行三层配置列检测
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloudIcon
                    className={cn(
                      'size-10 text-muted-foreground transition-colors duration-200',
                      'group-hover:text-primary'
                    )}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {isDragActive ? '释放文件开始解析' : '拖放 PBOM 文件到此处，或点击选择'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支持 .xlsx 格式 · 自动识别配置列 · 相同零件号自动合并
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Parts Table ── */}
      {parts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-sm border border-border bg-card"
        >
          {/* Table Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-foreground">解析结果</h3>
              <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 font-mono text-xs font-medium text-accent-foreground">
                {parts.length} 项零件
              </span>
              {confirmedConfigList.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {confirmedConfigList.map((cfg) => (
                    <span
                      key={cfg}
                      className="inline-flex items-center gap-1 rounded-full border border-[hsl(42_96%_52%)]/30 bg-[hsl(42_96%_52%)]/8 px-2 py-0.5 text-xs font-medium text-primary-foreground"
                    >
                      <TagIcon className="size-2.5" />
                      {cfg}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowDialog(true)}>
              <Settings2Icon className="mr-1.5 size-3.5" />
              修改配置列
            </Button>
          </div>

          {/* Antd Table */}
          <div ref={tableRef}>
            <Table
              columns={tableColumns}
              dataSource={parts}
              size="small"
              pagination={parts.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
              scroll={{ y: 420 }}
            />
          </div>
        </motion.div>
      )}

      {/* ── Configuration Column Detection Dialog ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <BrainIcon className="size-5 text-primary" />
              配置列检测确认
            </DialogTitle>
            <DialogDescription className="text-sm">
              三层递进检测：① 规则引擎排除法 → ② AI 辅助分析不确定列 → ③ 人工确认兜底
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* ── 候选配置列 ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  候选配置列
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedConfigs.size} / {configCandidates.length} 已选中
                </span>
              </div>

              <div className="space-y-2">
                {configCandidates.map((item, idx) => {
                  const isSelected = selectedConfigs.has(item.column_name);
                  const isUncertain = item.confidence < 0.7;

                  return (
                    <motion.div
                      key={item.column_name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className={cn(
                        'rounded-sm border p-4 transition-colors',
                        isSelected
                          ? 'border-primary/40 bg-[hsl(42_96%_52%)]/[0.04]'
                          : 'border-border bg-muted/30',
                        isUncertain && !isSelected && 'border-[hsl(40_70%_50%)]/40'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleConfig(item.column_name)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-2.5">
                          {/* 第一行：列名 + 置信度 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {item.column_name}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border',
                                item.confidence >= 0.8
                                  ? 'border-[hsl(152_55%_40%)] bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)]'
                                  : item.confidence >= 0.6
                                    ? 'border-[hsl(40_70%_50%)] bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)]'
                                    : 'border-[hsl(4_65%_48%)] bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)]'
                              )}
                            >
                              置信度 {(item.confidence * 100).toFixed(0)}%
                            </span>
                            {isUncertain && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(40_65%_25%)]">
                                <AlertTriangleIcon className="size-3" />
                                需 AI 辅助
                              </span>
                            )}
                          </div>

                          {/* 第二行：统计信息 */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {item.part_count != null && (
                              <span className="font-mono">{item.part_count} 个零件</span>
                            )}
                            {item.value_range && (
                              <span className="font-mono">值域 {item.value_range}</span>
                            )}
                          </div>

                          {/* 第三行：检测理由 */}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.reason}
                          </p>

                          {/* 第四行：别名编辑（仅选中时显示） */}
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                配置名：
                              </span>
                              <Input
                                value={configAliases[item.column_name] ?? item.column_name}
                                onChange={(e) =>
                                  updateAlias(item.column_name, e.target.value)
                                }
                                placeholder="例: 标准续航版"
                                className="h-7 max-w-[180px] text-xs font-mono"
                              />
                              {configAliases[item.column_name] &&
                                configAliases[item.column_name] !== item.column_name && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {item.column_name} →{' '}
                                    <span className="font-medium text-foreground">
                                      {configAliases[item.column_name]}
                                    </span>
                                  </span>
                                )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── AI 分析按钮（不确定列存在时） ── */}
            <AnimatePresence>
              {hasUncertain && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-sm border border-[hsl(40_70%_50%)]/30 bg-[hsl(40_75%_94%)]/50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[hsl(40_70%_50%)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        检测到 {detection.filter((d) => d.confidence < 0.7).length} 个不确定列
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        规则引擎无法确定部分列的类型，可使用 AI 模型辅助判断。
                        AI 将分析列名语义并输出结构化分类结果。
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={runAiDetection}
                        disabled={aiAnalyzing}
                      >
                        {aiAnalyzing ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: 'linear',
                              }}
                              className="mr-1.5 inline-block"
                            >
                              <BrainIcon className="size-3.5" />
                            </motion.span>
                            AI 分析中...
                          </>
                        ) : (
                          <>
                            <BrainIcon className="mr-1.5 size-3.5" />
                            AI 辅助识别不确定列
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 已排除的元数据列 ── */}
            {metadataExcluded.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircleIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    已排除的元数据列
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    （Layer 1 规则引擎自动识别）
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metadataExcluded.map((item) => (
                    <span
                      key={item.column_name}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                      title={item.reason}
                    >
                      <XCircleIcon className="size-3 shrink-0" />
                      {item.column_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                已确认{' '}
                <span className="font-mono font-medium text-foreground">
                  {selectedConfigs.size}
                </span>{' '}
                个配置列
                {confirmedConfigList.length > 0 && (
                  <span className="ml-1">
                    ：{confirmedConfigList.join(' / ')}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>
                  跳过（无配置模式）
                </Button>
                <Button size="sm" onClick={confirmConfigs}>
                  <CheckCircle2Icon className="mr-1.5 size-3.5" />
                  确认配置
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
