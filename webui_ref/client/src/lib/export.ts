import * as XLSX from 'xlsx';
import { toast } from 'sonner';

/**
 * 将数据导出为 Excel 文件
 * @param data 数据数组
 * @param columns 列配置 { key, title, width? }
 * @param filename 文件名（不含后缀）
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: Array<{ key: string; title: string; width?: number }>,
  filename: string,
) {
  toast.info('正在导出...');

  try {
    const header = columns.map((c) => c.title);
    const rows = data.map((row) => columns.map((c) => row[c.key] ?? ''));
    const wsData = [header, ...rows];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = columns.map((c) => ({ wch: c.width || 14 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);

    toast.success(`已导出 ${data.length} 条记录`);
  } catch {
    toast.error('导出失败，请重试');
  }
}
