// 设备台账API封装
// API前缀: /api/resource/equipment

import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

const API_BASE_PATH = '/api/resource';

export interface Equipment {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type: 'lift' | 'island' | 'station';
  zone_code: string;
  zone_name?: string;
  status: 'idle' | 'busy' | 'error' | 'maintenance';
  current_task_id?: number | null;
  current_operator?: string | null;
  current_task_name?: string | null;
  last_update_time?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentListResponse {
  code: number;
  message: string;
  data: {
    total: number;
    page: number;
    page_size: number;
    data: Equipment[];
  };
}

export interface EquipmentStatsResponse {
  code: number;
  message: string;
  data: {
    total: number;
    idle: number;
    busy: number;
    error: number;
    maintenance: number;
    status_distribution: Array<{
      status: string;
      count: number;
    }>;
  };
}

export interface EquipmentCreateRequest {
  equipment_code: string;
  equipment_name: string;
  equipment_type: 'lift' | 'island' | 'station';
  zone_code: string;
  status?: 'idle' | 'busy' | 'error' | 'maintenance';
}

export interface EquipmentUpdateRequest {
  equipment_name?: string;
  equipment_type?: 'lift' | 'island' | 'station';
  zone_code?: string;
}

export interface EquipmentStatusUpdateRequest {
  status: 'idle' | 'busy' | 'error' | 'maintenance';
  operator?: string;
}

export interface MaintenanceRecord {
  id: number;
  equipment_code: string;
  maintenance_type: 'routine' | 'repair' | 'inspection';
  start_time: string;
  end_time?: string | null;
  operator?: string | null;
  description?: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

export interface MaintenanceListResponse {
  code: number;
  message: string;
  data: {
    total: number;
    page: number;
    page_size: number;
    data: MaintenanceRecord[];
  };
}

export interface MaintenanceCreateRequest {
  maintenance_type: 'routine' | 'repair' | 'inspection';
  start_time: string;
  end_time?: string;
  operator?: string;
  description?: string;
  status?: 'in_progress' | 'completed' | 'cancelled';
}

export interface MaintenanceStatusUpdateRequest {
  status: 'in_progress' | 'completed' | 'cancelled';
  end_time?: string;
}

export interface EquipmentListParams {
  page?: number;
  page_size?: number;
  status?: 'idle' | 'busy' | 'error' | 'maintenance';
  zone_code?: string;
  equipment_type?: 'lift' | 'island' | 'station';
  keyword?: string;
}

/**
 * 获取设备列表
 */
export async function getEquipmentList(params?: EquipmentListParams): Promise<EquipmentListResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);
  if (params?.status) queryParams.status = params.status;
  if (params?.zone_code) queryParams.zone_code = params.zone_code;
  if (params?.equipment_type) queryParams.equipment_type = params.equipment_type;
  if (params?.keyword) queryParams.keyword = params.keyword;
  
  const response = await axiosForBackend.get(`${API_BASE_PATH}/equipment`, { params: queryParams });
  return response.data;
}

/**
 * 获取单个设备详情
 */
export async function getEquipmentByCode(equipmentCode: string): Promise<{ code: number; message: string; data: Equipment }> {
  const response = await axiosForBackend.get(`${API_BASE_PATH}/equipment/${encodeURIComponent(equipmentCode)}`);
  return response.data;
}

/**
 * 新增设备
 */
export async function createEquipment(data: EquipmentCreateRequest): Promise<{ code: number; message: string; data: Equipment }> {
  const response = await axiosForBackend.post(`${API_BASE_PATH}/equipment`, data);
  return response.data;
}

/**
 * 更新设备信息
 */
export async function updateEquipment(equipmentCode: string, data: EquipmentUpdateRequest): Promise<{ code: number; message: string; data: Equipment }> {
  const response = await axiosForBackend.put(`${API_BASE_PATH}/equipment/${encodeURIComponent(equipmentCode)}`, data);
  return response.data;
}

/**
 * 删除设备
 */
export async function deleteEquipment(equipmentCode: string): Promise<{ code: number; message: string }> {
  const response = await axiosForBackend.delete(`${API_BASE_PATH}/equipment/${encodeURIComponent(equipmentCode)}`);
  return response.data;
}

/**
 * 更新设备状态
 */
export async function updateEquipmentStatus(equipmentCode: string, data: EquipmentStatusUpdateRequest): Promise<{ code: number; message: string; data: Equipment }> {
  const response = await axiosForBackend.put(`${API_BASE_PATH}/equipment/${encodeURIComponent(equipmentCode)}/status`, data);
  return response.data;
}

/**
 * 获取设备统计数据（驾驶舱用）
 */
export async function getEquipmentStats(): Promise<EquipmentStatsResponse> {
  const response = await axiosForBackend.get(`${API_BASE_PATH}/equipment/stats`);
  return response.data;
}

/**
 * 获取设备维护记录列表
 */
export async function getMaintenanceList(
  equipmentCode: string,
  params?: { page?: number; page_size?: number; status?: string }
): Promise<MaintenanceListResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);
  if (params?.status) queryParams.status = params.status;
  
  const response = await axiosForBackend.get(`${API_BASE_PATH}/equipment/${encodeURIComponent(equipmentCode)}/maintenance`, { params: queryParams });
  return response.data;
}

/**
 * 新增设备维护记录
 */
export async function createMaintenanceRecord(
  equipmentCode: string,
  data: MaintenanceCreateRequest
): Promise<{ code: number; message: string; data: MaintenanceRecord }> {
  const response = await axiosForBackend.post(`${API_BASE_PATH}/equipment/${encodeURIComponent(equipmentCode)}/maintenance`, data);
  return response.data;
}

/**
 * 更新维护记录状态
 */
export async function updateMaintenanceStatus(
  maintenanceId: number,
  data: MaintenanceStatusUpdateRequest
): Promise<{ code: number; message: string; data: MaintenanceRecord }> {
  const response = await axiosForBackend.put(`${API_BASE_PATH}/equipment/maintenance/${maintenanceId}/status`, data);
  return response.data;
}

/**
 * 设备状态枚举映射
 */
export const EQUIPMENT_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  idle: { label: '空闲', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  busy: { label: '占用', color: '#1677FF', bgColor: 'rgba(22, 119, 255, 0.1)' },
  error: { label: '故障', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  maintenance: { label: '维护中', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
};

/**
 * 设备类型枚举映射
 */
export const EQUIPMENT_TYPE_MAP: Record<string, string> = {
  lift: '举升机',
  island: '试制岛',
  station: '工位',
};

/**
 * 维护类型枚举映射
 */
export const MAINTENANCE_TYPE_MAP: Record<string, string> = {
  routine: '例行维护',
  repair: '维修',
  inspection: '巡检',
};

/**
 * 维护状态枚举映射
 */
export const MAINTENANCE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_progress: { label: '进行中', color: '#1677FF' },
  completed: { label: '已完成', color: '#10B981' },
  cancelled: { label: '已取消', color: '#6B7280' },
};
