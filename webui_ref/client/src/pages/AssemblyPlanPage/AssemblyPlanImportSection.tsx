import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloudIcon,
  FileSpreadsheetIcon,
  Trash2Icon,
  DownloadIcon,
  Settings2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IPlanRow {
  key: number;
  sequence: number;
  vehicle_id: string;
  vin: string;
  msk_code: string;
  purpose: string;
  vehicle_type: string;
  location: string;
  requester: string;
  status: string;
  [key: string]: string | number;
}

const COLUMNS_MAP: Record<string, keyof IPlanRow> = {
  '装车顺序': 'sequence',
  '样车编号': 'vehicle_id',
  'VIN': 'vin',
  'MSK编码': 'msk_code',
  '用途': 'purpose',
  '基础车车型信息': 'vehicle_type',
  '装配地点': 'location',
  '用车需求人': 'requester',
  '状态': 'status',
};

function parseExcelRows(rows: unknown[][]): IPlanRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h || '').trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''))
    .map((row, idx) => {
      const obj: Record<string, string | number> = { key: idx + 1 };
      headers.forEach((h, ci) => {
        const mapped = COLUMNS_MAP[h];
        const val = row[ci];
        if (mapped) {
          obj[mapped] = h === '装车顺序' ? Number(val) || ci : String(val || '');
        } else {
          obj[h || `col_${ci}`] = String(val || '');
        }
      });
      return obj as unknown as IPlanRow;
    });
}

export default function AssemblyPlanImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<IPlanRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setIsParsing(true);

    try {
      const XLSX = await import('xlsx');
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      const planSheet = wb.SheetNames.find((n: string) => n.includes('装车计划') || n.includes('装车'));
      const ws = wb.Sheets[planSheet || wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });

      if (raw.length > 0) {
        const h = (raw[0] as unknown[]).map((v) => String(v || '').trim()).filter(Boolean);
        setHeaders(h);
        const parsed = parseExcelRows(raw as unknown[][]);
        setRows(parsed);
        // 存入 sessionStorage，供 AI 推荐排序 Section 读取
        try {
          sessionStorage.setItem('__global_dfmc_importedPlan', JSON.stringify({ headers: h, rows: parsed }));
          // 触发 storage 事件让其他 Section 感知变化
          window.dispatchEvent(new StorageEvent('storage', {
            key: '__global_dfmc_importedPlan',
            newValue: JSON.stringify({ headers: h, rows: parsed }),
          }));
        } catch { /* ignore */ }
        toast.success(`已导入 ${parsed.length} 条装车计划`);
      }
    } catch {
      toast.error('文件解析失败，请检查格式');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleClear = useCallback(() => {
    setFile(null);
    setRows([]);
    setHeaders([]);
    try {
      sessionStorage.removeItem('__global_dfmc_importedPlan');
      window.dispatchEvent(new StorageEvent('storage', {
        key: '__global_dfmc_importedPlan',
        newValue: null,
      }));
    } catch { /* ignore */ }
  }, []);

  const handleExport = useCallback(async () => {
    if (rows.length === 0) return;
    const XLSX = await import('xlsx');

    const exportHeaders = headers.filter((h) => h && h.trim());
    const exportRows = rows.map((r) =>
      exportHeaders.map((h) => {
        const mapped = COLUMNS_MAP[h];
        return mapped ? r[mapped] : (r as Record<string, unknown>)[h] ?? '';
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportRows]);
    ws['!cols'] = exportHeaders.map((h) => ({ wch: Math.max(h.length * 2, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '装车计划及执行');
    XLSX.writeFile(wb, `装车计划_导出_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`已导出 ${rows.length} 条记录`);
  }, [rows, headers]);

  const tableColumns = headers
    .filter((h) => h && h.trim())
    .slice(0, 12)
    .map((h) => {
      const mapped = COLUMNS_MAP[h];
      return {
        title: h,
        dataIndex: mapped || h,
        key: mapped || h,
        width: h === '用途' ? 200 : h === 'VIN' ? 180 : h === '样车编号' ? 180 : 120,
        ellipsis: true,
        render: (val: unknown) => {
          if (mapped === 'sequence') {
            return <span className="font-mono text-sm font-medium text-foreground">{val as number}</span>;
          }
          if (mapped === 'vehicle_type') {
            const isRev = String(val).toUpperCase() === 'REV';
            return (
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                isRev
                  ? 'bg-[hsl(210_55%_95%)] text-[hsl(210_55%_25%)] border-[hsl(210_60%_48%)]'
                  : 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border-[hsl(152_55%_40%)]'
              )}>
                {String(val)}
              </span>
            );
          }
          return <span className="text-sm text-foreground">{String(val)}</span>;
        },
      };
    });

  return (
    <section className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            装车计划导入
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
                onClick={handleClear}
                className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                type="button"
              >
                <Trash2Icon className="size-3" />
              </button>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <DownloadIcon className="mr-1.5 size-3.5" />
              导出计划
            </Button>
          )}
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              <UploadCloudIcon className="mr-1.5 size-3.5" />
              重新导入
            </Button>
          )}
        </div>
      </div>

      {rows.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            {...getRootProps()}
            className={cn(
              'group cursor-pointer rounded-sm border-2 border-dashed border-border bg-card p-10',
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
                  <p className="text-sm font-medium text-foreground">正在解析装车计划...</p>
                </>
              ) : (
                <>
                  <UploadCloudIcon className="size-10 text-muted-foreground transition-colors group-hover:text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      拖拽装车计划 Excel 到此处，或
                      <span className="text-primary">点击选择文件</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      支持 .xlsx 格式，自动识别「装车计划及执行」工作表
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {rows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-sm overflow-hidden"
        >
          <Table
            columns={tableColumns}
            dataSource={rows}
            rowKey="key"
            className="assembly-plan-table"
            scroll={{ x: 1200 }}
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total: number) => `共 ${total} 条`,
              size: 'small',
            }}
          />
        </motion.div>
      )}

      <style jsx>{`
        :global(.assembly-plan-table .ant-table-thead > tr > th) {
          background: hsl(215 14% 93% / 0.5) !important;
          border-bottom: 1px solid hsl(215 16% 90%) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: hsl(215 30% 14%) !important;
          padding: 10px 12px !important;
        }
        :global(.assembly-plan-table .ant-table-tbody > tr > td) {
          border-bottom: 1px solid hsl(215 16% 90% / 0.6) !important;
          padding: 8px 12px !important;
        }
        :global(.assembly-plan-table .ant-table-tbody > tr:hover > td) {
          background: hsl(215 14% 93% / 0.3) !important;
        }
        :global(.assembly-plan-table .ant-pagination) {
          margin: 12px 16px !important;
        }
      `}</style>
    </section>
  );
}
