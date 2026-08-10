# -*- coding: utf-8 -*-
"""
试制资源管理模块 - Pydantic 数据模型
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# ==================== 设备相关 ====================

class EquipmentBase(BaseModel):
    equipment_code: str
    equipment_name: str
    equipment_type: str  # lift/island/station
    zone_code: str


class EquipmentCreate(EquipmentBase):
    status: Optional[str] = "idle"


class EquipmentUpdate(BaseModel):
    equipment_name: Optional[str] = None
    equipment_type: Optional[str] = None
    zone_code: Optional[str] = None
    status: Optional[str] = None


class EquipmentResponse(EquipmentBase):
    id: int
    status: str
    current_task_id: Optional[int] = None
    current_operator: Optional[str] = None
    last_update_time: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class EquipmentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[EquipmentResponse] = []


# ==================== 区域相关 ====================

class ZoneBase(BaseModel):
    zone_code: str
    zone_name: str
    zone_type: str  # assembly/island/prototype/external


class ZoneCreate(ZoneBase):
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    grid_columns: Optional[int] = 1
    grid_rows: Optional[int] = 1


class ZoneResponse(ZoneBase):
    id: int
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    grid_columns: int = 1
    grid_rows: int = 1


class ZoneListResponse(BaseModel):
    data: List[ZoneResponse] = []


# ==================== 人员相关 ====================

class PersonnelBase(BaseModel):
    personnel_code: str
    name: str


class PersonnelCreate(PersonnelBase):
    avatar_text: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[List[str]] = None
    status: Optional[str] = "offline"


class PersonnelUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[List[str]] = None
    status: Optional[str] = None
    current_zone: Optional[str] = None


class PersonnelResponse(PersonnelBase):
    id: int
    avatar_text: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[List[str]] = None
    status: str
    current_zone: Optional[str] = None
    current_task_id: Optional[int] = None
    entry_time: Optional[datetime] = None
    last_update_time: Optional[datetime] = None
    created_at: Optional[datetime] = None


class PersonnelListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[PersonnelResponse] = []


# ==================== 任务相关 ====================

class TaskBase(BaseModel):
    task_code: str
    task_name: str
    task_type: str  # sporadic/abc/island


class TaskCreate(TaskBase):
    project_code: Optional[str] = None
    vehicle_code: Optional[str] = None
    vehicle_model: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "pending"
    zone_code: Optional[str] = None
    equipment_code: Optional[str] = None
    planner: Optional[str] = None
    plan_start_time: Optional[datetime] = None
    plan_end_time: Optional[datetime] = None
    plan_work_hours: Optional[Decimal] = None
    source: Optional[str] = "manual"


class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[Decimal] = None
    actual_work_hours: Optional[Decimal] = None
    zone_code: Optional[str] = None
    equipment_code: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    project_code: Optional[str] = None
    vehicle_code: Optional[str] = None
    vehicle_model: Optional[str] = None
    priority: str
    status: str
    zone_code: Optional[str] = None
    equipment_code: Optional[str] = None
    planner: Optional[str] = None
    plan_start_time: Optional[datetime] = None
    plan_end_time: Optional[datetime] = None
    plan_work_hours: Optional[Decimal] = None
    actual_work_hours: Optional[Decimal] = None
    progress: Decimal = Decimal("0")
    source: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TaskListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[TaskResponse] = []


# ==================== 预警相关 ====================

class AlertResponse(BaseModel):
    id: int
    alert_code: str
    alert_type: str
    level: str
    title: str
    description: Optional[str] = None
    related_equipment: Optional[str] = None
    related_task: Optional[int] = None
    status: str
    raised_at: datetime
    resolved_at: Optional[datetime] = None
    handler: Optional[str] = None


class AlertListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[AlertResponse] = []


# ==================== 驾驶舱相关 ====================

class DashboardKPI(BaseModel):
    equipment_total: int = 0
    equipment_busy: int = 0
    equipment_idle: int = 0
    equipment_error: int = 0
    personnel_total: int = 0
    personnel_working: int = 0
    personnel_idle: int = 0
    task_in_progress: int = 0
    task_pending: int = 0
    alert_pending: int = 0


class DashboardResponse(BaseModel):
    kpis: DashboardKPI
    equipment_status_distribution: List[dict] = []
    personnel_status_distribution: List[dict] = []
    updated_at: Optional[datetime] = None
