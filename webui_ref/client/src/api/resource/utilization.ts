// 资源占用看板API封装
// API前缀: /api/resource/utilization

import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

const API_BASE_PATH = '/api/resource/utilization';

// ==================== 类型定义 ====================

export interface WeekInfo {
  index: number;
  label: string; // 如 "8-W33"
  range: string; // 如 "8.10~8.16"
  start: string;
  end: string;
  is_current: boolean;
}

export type SchedCellStatus = 'done' | 'doing' | 'wait' | 'plan';

export interface SchedCell {
  status: SchedCellStatus;
  text: string;
}

export interface AreaProject {
  schedule_id: number;
  schedule_code: string;
  project_code: string;
  project_name: string;
  cat: string; // A/B/C/sporadic
  budget: number;
  qty: number;
  done: number;
  lift_desc: string;
  plan_start: string | null;
  plan_end: string | null;
  status: string;
  progress: number;
  source: string;
  cells: Array<SchedCell | null>;
}

export interface BoardArea {
  zone_code: string;
  zone_name: string;
  short_name: string;
  area_type: 'assembly' | 'wp' | 'cx';
  area_type_label: string;
  location: string;
  manager: string;
  eq_count: number;
  lift_count: number;
  capacity: string;
  mat_desc: string;
  multi_project: boolean;
  projects: AreaProject[];
}

export interface BoardKpis {
  area_count: number;
  area_assembly: number;
  area_wp: number;
  area_cx: number;
  project_count: number;
  project_done: number;
  project_doing: number;
  eq_count: number;
  lift_count: number;
  budget_total: number;
  qty_total: number;
  done_total: number;
  occupancy_rate: number;
  occupancy_current_week: number;
  occupancy_next_week: number;
  data_source: string;
}

export interface UtilizationBoardData {
  weeks: WeekInfo[];
  areas: BoardArea[];
  kpis: BoardKpis;
}

export interface TrendPoint {
  week: string;
  range: string;
  is_current: boolean;
  occupancy_rate: number;
  occupied_areas: number;
  project_count: number;
}

export interface UtilizationTrendData {
  weeks: WeekInfo[];
  trend: TrendPoint[];
}

export interface EquipmentRankItem {
  equipment_code: string;
  equipment_name: string;
  equipment_type: string;
  zone_code: string;
  status: 'idle' | 'busy' | 'error' | 'maintenance';
  occupied_hours: number;
  utilization_rate: number;
}

export interface EquipmentRankData {
  window_days: number;
  window_start: string;
  window_end: string;
  avg_utilization_rate: number;
  ranking: EquipmentRankItem[];
}

// ==================== API 请求 ====================

/**
 * 获取资源占用看板主数据（试制排程矩阵）
 */
export async function getUtilizationBoard(
  weeks = 10
): Promise<{ code: number; message: string; data: UtilizationBoardData }> {
  const response = await axiosForBackend.get(`${API_BASE_PATH}/board`, {
    params: { weeks },
  });
  return response.data;
}

/**
 * 获取周度场地占用率趋势
 */
export async function getUtilizationTrend(
  weeks = 10
): Promise<{ code: number; message: string; data: UtilizationTrendData }> {
  const response = await axiosForBackend.get(`${API_BASE_PATH}/trend`, {
    params: { weeks },
  });
  return response.data;
}

/**
 * 获取设备利用率排名
 */
export async function getEquipmentUtilizationRank(
  days = 28,
  limit = 10
): Promise<{ code: number; message: string; data: EquipmentRankData }> {
  const response = await axiosForBackend.get(`${API_BASE_PATH}/equipment-ranking`, {
    params: { days, limit },
  });
  return response.data;
}

// ==================== 枚举映射 ====================

/** 排程状态图例（单元格颜色语义） */
export const SCHED_CELL_STATUS_MAP: Record<
  SchedCellStatus,
  { label: string; className: string }
> = {
  done: { label: '已完成', className: 'sched-cell-done' },
  doing: { label: '进行中', className: 'sched-cell-doing' },
  wait: { label: '待排', className: 'sched-cell-wait' },
  plan: { label: '排定中', className: 'sched-cell-plan' },
};

/** 项目类别映射 */
export const PROJECT_CAT_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  A: { label: 'A类', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)' },
  B: { label: 'B类', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' },
  C: { label: 'C类', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  sporadic: { label: '零星', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.12)' },
};

/** 场地分组映射 */
export const AREA_TYPE_MAP: Record<string, { label: string; color: string }> = {
  assembly: { label: '装配区', color: '#1677FF' },
  wp: { label: '竞品区', color: '#10B981' },
  cx: { label: '外委区', color: '#F59E0B' },
};
