import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  ArrowRightIcon,
  FolderOpenIcon,
  AlertTriangleIcon,
  PackageIcon,
  CheckCircle2Icon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { IProject, IProjectFormValues } from '@/types';
import projectsData from '@shared/static/projects.json';

/* ────────────────────────────────────────────────
 *  Mock 数据生成：最近更新时间 + 到货率趋势
 * ──────────────────────────────────────────────── */
const UPDATED_AT_MAP: Record<number, string> = {
  1: '2026-06-23 14:30',
  2: '2026-06-23 10:15',
  3: '2026-06-22 18:45',
  4: '2026-06-23 09:20',
  5: '2026-06-21 16:00',
  6: '2026-06-20 11:30',
};

// 每个项目的到货率趋势数据（近 7 天）
const TREND_MAP: Record<number, number[]> = {
  1: [85, 87, 88, 90, 91, 92, 92.3],
  2: [94, 95, 95.5, 96, 96.5, 97, 97.1],
  3: [82, 80, 79, 78, 77, 76.8, 76.4],
  4: [78, 80, 82, 83, 84, 85, 85.7],
  5: [92, 93, 94, 94.5, 95, 95.3, 95.6],
  6: [75, 73, 71, 70, 69.5, 69, 68.9],
};

function getUpdatedAt(id: number): string {
  return UPDATED_AT_MAP[id] || '—';
}

function getTrend(id: number): number[] {
  return TREND_MAP[id] || [];
}

function getTrendDirection(trend: number[]): 'up' | 'down' | 'flat' {
  if (trend.length < 2) return 'flat';
  const diff = trend[trend.length - 1] - trend[trend.length - 2];
  if (diff > 0.5) return 'up';
  if (diff < -0.5) return 'down';
  return 'flat';
}

/* ────────────────────────────────────────────────
 *  迷你折线图 SVG
 * ──────────────────────────────────────────────── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 64;
  const h = 24;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - ((v - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M${points.join(' L')}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 末端圆点 */}
      <circle
        cx={parseFloat(points[points.length - 1].split(',')[0])}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r="2"
        fill={color}
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────
 *  工具函数
 * ──────────────────────────────────────────────── */

function getRiskLevel(rate: number): 'danger' | 'warning' | 'safe' {
  if (rate < 80) return 'danger';
  if (rate < 95) return 'warning';
  return 'safe';
}

/* ────────────────────────────────────────────────
 *  风险状态胶囊标签
 * ──────────────────────────────────────────────── */
function RiskBadge({ rate }: { rate: number }) {
  const level = getRiskLevel(rate);
  const config = {
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-200',
      label: '风险',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
      label: '预警',
    },
    safe: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      label: '正常',
    },
  } as const;
  const c = config[level];
  return (
    <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
              <span className="font-mono text-sm font-medium tracking-tight text-[#1a1a1a]">{rate}%</span>
      <span className="hidden sm:inline">· {c.label}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────
 *  项目表单弹窗（新建 / 编辑复用）
 * ──────────────────────────────────────────────── */
interface IProjectFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: IProjectFormValues;
  title: string;
  onSubmit: (values: IProjectFormValues) => void;
}

function ProjectFormDialog({
  open,
  onOpenChange,
  initial,
  title,
  onSubmit,
}: IProjectFormDialogProps) {
  const [form, setForm] = useState<IProjectFormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof IProjectFormValues, string>>>({});

  React.useEffect(() => {
    setForm(initial);
    setErrors({});
  }, [initial, open]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof IProjectFormValues, string>> = {};
    if (!form.project_code.trim()) errs.project_code = '项目号为必填项';
    if (!form.apply_code.trim()) errs.apply_code = '试制申请单号为必填项';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(form);
      onOpenChange(false);
    }
  };

  const handleChange = (field: keyof IProjectFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription>
            填写项目基本信息，项目号与试制申请单号为必填项
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              项目名称 <span className="text-muted-foreground font-normal">（选填）</span>
            </Label>
            <Input
              placeholder="如：E70 迭代改款"
              value={form.project_name}
              onChange={handleChange('project_name')}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              项目号 <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="对应 delivery_detail.PRO_CODE"
              value={form.project_code}
              onChange={handleChange('project_code')}
              className={errors.project_code ? 'border-destructive ring-2 ring-destructive/20' : ''}
            />
            {errors.project_code && (
              <p className="text-xs text-destructive">{errors.project_code}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              试制申请单号 <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="对应 delivery_detail.APPLY_CODE"
              value={form.apply_code}
              onChange={handleChange('apply_code')}
              className={errors.apply_code ? 'border-destructive ring-2 ring-destructive/20' : ''}
            />
            {errors.apply_code && (
              <p className="text-xs text-destructive">{errors.apply_code}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────
 *  项目卡片组件
 * ──────────────────────────────────────────────── */
function ProjectCard({
  project,
  onEnter,
  onEdit,
  onDelete,
}: {
  project: IProject;
  onEnter: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const risk = getRiskLevel(project.delivery_rate);

  const borderColor = {
    danger: 'border-t-rose-300',
    warning: 'border-t-amber-300',
    safe: 'border-t-emerald-300',
  };

  const rateColor = {
    danger: 'text-rose-500',
    warning: 'text-amber-500',
    safe: 'text-emerald-500',
  };

  const criticalColor = {
    danger: 'text-rose-500',
    warning: 'text-amber-500',
    safe: 'text-emerald-500',
  };

  const criticalRisk = getRiskLevel(project.critical_ready_rate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`group relative flex flex-col rounded-2xl border border-slate-100 bg-white border-t-2 ${borderColor[risk]} shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer`}
      onClick={onEnter}
    >
      {/* 卡片头部 */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-[#1a1a1a] truncate">
              {project.project_name || '未命名项目'}
            </h3>
            <p className="font-mono text-xs text-slate-400 mt-1 truncate">
              {project.project_code}
            </p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <PencilIcon className="size-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0 hover:bg-[hsl(4_55%_95%)]"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2Icon className="size-3.5 text-[hsl(4_60%_28%)]" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 truncate">
          申请单号: <span className="font-mono">{project.apply_code}</span>
        </p>
      </div>

      {/* 核心指标区 */}
      <div className="px-6 py-5 flex-1">
        <div className="grid grid-cols-3 gap-3">
          {/* 到货率 - 主指标 */}
          <div className="col-span-1 flex flex-col items-center justify-center py-2">
            <span className={`text-3xl font-bold tracking-tight ${rateColor[risk]}`}>
              {project.delivery_rate}
              <span className="text-sm font-normal">%</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
              到货率
            </span>
          </div>

          {/* 关键件齐套率 */}
          <div className="col-span-1 flex flex-col items-center justify-center py-2 border-l border-slate-100">
            <span className={`text-3xl font-bold tracking-tight ${criticalColor[criticalRisk]}`}>
              {project.critical_ready_rate}
              <span className="text-sm font-normal">%</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
              齐套率
            </span>
          </div>

          {/* 零件总数 */}
          <div className="col-span-1 flex flex-col items-center justify-center py-2 border-l border-slate-100">
            <span className="text-3xl font-bold tracking-tight text-[#1a1a1a]">
              {project.parts_count.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
              零件数
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
            <span>到货进度</span>
            <span className="font-mono">{project.delivery_rate}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.delivery_rate}%` }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className={`h-full rounded-full ${
                risk === 'danger'
                  ? 'bg-rose-400'
                  : risk === 'warning'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 卡片底部：更新时间 + 趋势 + 风险 */}
      <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RiskBadge rate={project.delivery_rate} />
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <ClockIcon className="size-3 shrink-0" />
            <span className="truncate">{getUpdatedAt(project.id)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Sparkline
            data={getTrend(project.id)}
            color={
              risk === 'danger'
                ? '#fb7185'
                : risk === 'warning'
                  ? '#f59e0b'
                  : '#10b981'
            }
          />
          {(() => {
            const dir = getTrendDirection(getTrend(project.id));
            if (dir === 'up') return <TrendingUpIcon className="size-3 text-emerald-500" />;
            if (dir === 'down') return <TrendingDownIcon className="size-3 text-rose-500" />;
            return <MinusIcon className="size-3 text-slate-300" />;
          })()}
        </div>
      </div>

      {/* 悬停进入指示 */}
      <div className="absolute inset-y-0 right-0 w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <ArrowRightIcon className="size-4 text-slate-300" />
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
 *  主 Section 组件
 * ──────────────────────────────────────────────── */
export default function ProjectListSection() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<IProject[]>(projectsData as IProject[]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IProject | null>(null);

  const emptyForm: IProjectFormValues = { project_name: '', project_code: '', apply_code: '' };

  const handleCreate = useCallback(
    (values: IProjectFormValues) => {
      const newProject: IProject = {
        id: Date.now(),
        project_name: values.project_name || null,
        project_code: values.project_code,
        apply_code: values.apply_code,
        parts_count: 0,
        delivery_rate: 0,
        critical_ready_rate: 0,
        created_at: new Date().toISOString().slice(0, 10),
      };
      setProjects((prev) => [...prev, newProject]);
      toast.success(`项目「${values.project_code}」已创建`);
    },
    [],
  );

  const handleEdit = useCallback(
    (values: IProjectFormValues) => {
      if (!editTarget) return;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? { ...p, project_name: values.project_name || null, project_code: values.project_code, apply_code: values.apply_code }
            : p,
        ),
      );
      toast.success(`项目「${values.project_code}」已更新`);
      setEditTarget(null);
    },
    [editTarget],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast.success(`项目「${deleteTarget.project_code}」已删除`);
    setDeleteTarget(null);
  }, [deleteTarget]);

  const riskCount = projects.filter((p) => p.delivery_rate < 80).length;

  return (
    <>
      {/* ── 工具栏 ── */}
      <div className="w-full flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">项目列表</h2>
          <Badge variant="secondary" className="font-mono text-xs rounded-full bg-slate-100 text-slate-600 border-0">
            {projects.length} 个项目
          </Badge>
          {riskCount > 0 && (
            <Badge className="bg-rose-50 text-rose-600 border border-rose-200 rounded-full">
              <AlertTriangleIcon className="size-3 mr-1" />
              {riskCount} 个风险
            </Badge>
          )}
        </div>
        <Button size="sm" className="bg-[#1a1a1a] text-white hover:bg-[#333] rounded-2xl border-0" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          新建项目
        </Button>
      </div>

      {/* ── 项目卡片网格 ── */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEnter={() => {
                  // 导航前先写入 sessionStorage，确保面包屑立即显示正确项目名
                  try {
                    sessionStorage.setItem(
                      '__global_dfmc_currentProject',
                      JSON.stringify(project)
                    );
                  } catch { /* ignore */ }
                  navigate(`/projects/${project.id}`);
                }}
                onEdit={() => setEditTarget(project)}
                onDelete={() => setDeleteTarget(project)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── 空状态 ── */}
      {projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="flex size-14 items-center justify-center rounded-sm border border-border bg-accent/50 mb-4">
            <FolderOpenIcon className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">暂无项目</p>
          <p className="text-xs text-muted-foreground mt-1">
            点击「新建项目」开始管理 PBOM 零件与到货数据
          </p>
        </motion.div>
      )}

      {/* ── 风险项目提示 ── */}
      {riskCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5"
        >
          <AlertTriangleIcon className="size-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-600">
              {riskCount} 个项目到货率低于 80%，需关注缺料风险
            </p>
            <p className="text-xs text-rose-400 mt-0.5">
              {projects
                .filter((p) => p.delivery_rate < 80)
                .map((p) => p.project_code)
                .join('、')}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── 弹窗 ── */}
      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={emptyForm}
        title="新建项目"
        onSubmit={handleCreate}
      />

      <ProjectFormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        initial={
          editTarget
            ? {
                project_name: editTarget.project_name || '',
                project_code: editTarget.project_code,
                apply_code: editTarget.apply_code,
              }
            : emptyForm
        }
        title="编辑项目"
        onSubmit={handleEdit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除项目「
              <span className="font-mono font-medium text-foreground">
                {deleteTarget?.project_code}
              </span>
              」及其关联的全部零件数据，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
