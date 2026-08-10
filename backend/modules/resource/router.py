# -*- coding: utf-8 -*-
"""
试制资源管理模块路由
API 前缀: /api/resource
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import Optional
from datetime import date
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

# ==================== 设备台账相关 ====================

class EquipmentCreateRequest(BaseModel):
    equipment_code: str
    equipment_name: str
    equipment_type: str  # lift/island/station
    zone_code: str
    status: Optional[str] = "idle"

class EquipmentUpdateRequest(BaseModel):
    equipment_name: Optional[str] = None
    equipment_type: Optional[str] = None
    zone_code: Optional[str] = None

class EquipmentStatusUpdateRequest(BaseModel):
    status: str
    operator: Optional[str] = None

class MaintenanceCreateRequest(BaseModel):
    maintenance_type: str  # routine/repair/inspection
    start_time: datetime
    end_time: Optional[datetime] = None
    operator: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "in_progress"

class MaintenanceStatusUpdateRequest(BaseModel):
    status: str  # in_progress/completed/cancelled
    end_time: Optional[datetime] = None


@router.get("/ping")
def ping():
    """模块健康检查"""
    return {
        "module": "resource",
        "status": "ok",
        "message": "试制资源管理模块已就绪",
        "version": "1.0.0",
    }


@router.get("/equipment")
def list_equipment(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="设备状态筛选: idle/busy/error/maintenance"),
    zone_code: Optional[str] = Query(None, description="区域编码筛选"),
    equipment_type: Optional[str] = Query(None, description="设备类型: lift/island/station"),
    keyword: str = Query("", description="搜索关键词"),
):
    """
    获取设备列表（支持筛选、分页、搜索）
    """
    try:
        from backend.modules.resource.services.equipment_service import get_equipment_list
        result = get_equipment_list(
            page=page,
            page_size=page_size,
            status=status,
            zone_code=zone_code,
            equipment_type=equipment_type,
            keyword=keyword
        )
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equipment/{equipment_code}")
def get_equipment(
    equipment_code: str = Path(..., description="设备编号"),
):
    """
    获取单个设备详情
    """
    try:
        from backend.modules.resource.services.equipment_service import get_equipment_by_code
        result = get_equipment_by_code(equipment_code)
        if not result:
            raise HTTPException(status_code=404, detail=f"设备 {equipment_code} 不存在")
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/equipment")
def create_equipment(request: EquipmentCreateRequest):
    """
    新增设备
    """
    try:
        from backend.modules.resource.services.equipment_service import create_equipment
        data = request.model_dump()
        result = create_equipment(data)
        return {
            "code": 200,
            "message": "创建设备成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/equipment/{equipment_code}")
def update_equipment(
    equipment_code: str = Path(..., description="设备编号"),
    request: EquipmentUpdateRequest = ...,
):
    """
    更新设备信息
    """
    try:
        from backend.modules.resource.services.equipment_service import update_equipment
        data = request.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(status_code=400, detail="没有需要更新的字段")
        result = update_equipment(equipment_code, data)
        return {
            "code": 200,
            "message": "更新成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/equipment/{equipment_code}")
def delete_equipment(
    equipment_code: str = Path(..., description="设备编号"),
):
    """
    删除设备
    """
    try:
        from backend.modules.resource.services.equipment_service import delete_equipment
        delete_equipment(equipment_code)
        return {
            "code": 200,
            "message": "删除成功",
            "data": None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/equipment/{equipment_code}/status")
def update_equipment_status(
    equipment_code: str = Path(..., description="设备编号"),
    request: EquipmentStatusUpdateRequest = ...,
):
    """
    更新设备状态
    """
    try:
        from backend.modules.resource.services.equipment_service import update_equipment_status
        result = update_equipment_status(
            equipment_code=equipment_code,
            status=request.status,
            operator=request.operator
        )
        return {
            "code": 200,
            "message": "状态更新成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equipment/stats")
def get_equipment_stats():
    """
    获取设备统计数据（驾驶舱用）
    """
    try:
        from backend.modules.resource.services.equipment_service import get_equipment_stats
        result = get_equipment_stats()
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equipment/{equipment_code}/maintenance")
def list_maintenance(
    equipment_code: str = Path(..., description="设备编号"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选: in_progress/completed/cancelled"),
):
    """
    获取设备维护记录列表
    """
    try:
        from backend.modules.resource.services.equipment_service import get_maintenance_list
        result = get_maintenance_list(
            equipment_code=equipment_code,
            page=page,
            page_size=page_size,
            status=status
        )
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/equipment/{equipment_code}/maintenance")
def create_maintenance(
    equipment_code: str = Path(..., description="设备编号"),
    request: MaintenanceCreateRequest = ...,
):
    """
    新增设备维护记录
    """
    try:
        from backend.modules.resource.services.equipment_service import create_maintenance_record
        data = request.model_dump()
        # 转换datetime为字符串
        if data.get('start_time'):
            data['start_time'] = data['start_time'].strftime('%Y-%m-%d %H:%M:%S')
        if data.get('end_time'):
            data['end_time'] = data['end_time'].strftime('%Y-%m-%d %H:%M:%S')
        result = create_maintenance_record(equipment_code, data)
        return {
            "code": 200,
            "message": "创建维护记录成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/equipment/maintenance/{maintenance_id}/status")
def update_maintenance_status(
    maintenance_id: int = Path(..., description="维护记录ID"),
    request: MaintenanceStatusUpdateRequest = ...,
):
    """
    更新维护记录状态
    """
    try:
        from backend.modules.resource.services.equipment_service import update_maintenance_status
        end_time_str = None
        if request.end_time:
            end_time_str = request.end_time.strftime('%Y-%m-%d %H:%M:%S')
        result = update_maintenance_status(
            maintenance_id=maintenance_id,
            status=request.status,
            end_time=end_time_str
        )
        return {
            "code": 200,
            "message": "更新成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 区域相关 ====================

@router.get("/zones")
def list_zones():
    """区域列表"""
    return {
        "code": 200,
        "message": "获取成功",
        "data": {
            "data": [],
            "message": "区域列表接口占位实现"
        }
    }


@router.get("/zones/map")
def get_zones_map():
    """获取地图数据"""
    return {
        "code": 200,
        "message": "获取成功",
        "data": {
            "data": [],
            "message": "地图数据接口占位实现"
        }
    }


# ==================== 人员相关 ====================

class PersonnelCreateRequest(BaseModel):
    personnel_code: str
    name: str
    avatar_text: Optional[str] = None
    department: Optional[str] = None  # 人员来源
    status: Optional[str] = "offline"
    current_zone: Optional[str] = None

class PersonnelUpdateRequest(BaseModel):
    name: Optional[str] = None
    avatar_text: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    current_zone: Optional[str] = None
    current_task_id: Optional[int] = None

class PersonnelStatusUpdateRequest(BaseModel):
    status: str
    current_zone: Optional[str] = None


@router.get("/personnel")
def list_personnel(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="人员状态: working/idle/offline"),
    current_zone: Optional[str] = Query(None, description="所在区域筛选"),
    department: Optional[str] = Query(None, description="人员来源筛选: 自有/商用车/乘用车/柳汽/中智/外协/内调"),
    keyword: str = Query("", description="搜索关键词（姓名/工号）"),
):
    """
    获取人员列表（支持筛选、分页、搜索）
    装配区(SZA/SZB/SZC/LH)人员显示来源列，非装配区留白
    """
    try:
        from backend.modules.resource.services.personnel_service import get_personnel_list
        result = get_personnel_list(
            page=page,
            page_size=page_size,
            status=status,
            current_zone=current_zone,
            department=department,
            keyword=keyword
        )
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personnel/{personnel_code}")
def get_personnel(
    personnel_code: str = Path(..., description="工号"),
):
    """
    获取单个人员详情
    """
    try:
        from backend.modules.resource.services.personnel_service import get_personnel_by_code
        result = get_personnel_by_code(personnel_code)
        if not result:
            raise HTTPException(status_code=404, detail=f"工号 {personnel_code} 不存在")
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/personnel")
def create_personnel(request: PersonnelCreateRequest):
    """
    新增人员
    """
    try:
        from backend.modules.resource.services.personnel_service import create_personnel
        data = request.model_dump(exclude_none=True)
        result = create_personnel(data)
        return {
            "code": 200,
            "message": "创建人员成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/personnel/{personnel_code}")
def update_personnel(
    personnel_code: str = Path(..., description="工号"),
    request: PersonnelUpdateRequest = ...,
):
    """
    更新人员信息
    """
    try:
        from backend.modules.resource.services.personnel_service import update_personnel
        data = request.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(status_code=400, detail="没有需要更新的字段")
        result = update_personnel(personnel_code, data)
        return {
            "code": 200,
            "message": "更新成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/personnel/{personnel_code}")
def delete_personnel(
    personnel_code: str = Path(..., description="工号"),
):
    """
    删除人员
    """
    try:
        from backend.modules.resource.services.personnel_service import delete_personnel
        delete_personnel(personnel_code)
        return {
            "code": 200,
            "message": "删除成功",
            "data": None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/personnel/{personnel_code}/status")
def update_personnel_status(
    personnel_code: str = Path(..., description="工号"),
    request: PersonnelStatusUpdateRequest = ...,
):
    """
    更新人员状态（快速状态切换）
    """
    try:
        from backend.modules.resource.services.personnel_service import update_personnel_status
        result = update_personnel_status(
            personnel_code=personnel_code,
            status=request.status,
            current_zone=request.current_zone
        )
        return {
            "code": 200,
            "message": "状态更新成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personnel/stats")
def get_personnel_stats():
    """
    获取人员看板KPI统计数据（人员总数、在岗、工作中、空闲、离线等）
    """
    try:
        from backend.modules.resource.services.personnel_service import get_personnel_stats
        result = get_personnel_stats()
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personnel/source-distribution")
def get_personnel_source_distribution():
    """
    获取人员来源分布数据（装配区+非装配区）
    - 装配区饼图：按来源统计人员分布（商用车/乘用车/柳汽/中智/外协/自有/内调）
    - 装配区柱状图：按来源统计人数+平均工时
    - 非装配区分布：留白来源列的区域人数
    """
    try:
        from backend.modules.resource.services.personnel_service import get_source_distribution
        result = get_source_distribution()
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personnel/map")
def get_personnel_map():
    """
    获取人员位置分布数据（园区地图覆盖层）
    """
    try:
        from backend.modules.resource.services.personnel_service import get_personnel_map
        result = get_personnel_map()
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personnel/efficiency")
def get_personnel_efficiency(
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    department: Optional[str] = Query(None, description="部门筛选"),
):
    """人效分析数据"""
    return {
        "code": 200,
        "message": "获取成功",
        "data": {
            "summary": {
                "total_personnel": 0,
                "total_work_hours": 0,
                "avg_efficiency": 0,
            },
            "details": [],
            "message": "人效分析接口占位实现"
        }
    }


# ==================== 任务相关 ====================

class TaskCreateRequest(BaseModel):
    task_code: str
    task_name: str
    task_type: str  # A/B/C/sporadic
    trial_type: Optional[str] = None
    project_group: Optional[str] = None
    project_code: Optional[str] = None
    vehicle_code: Optional[str] = None
    vehicle_model: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "pending"
    zone_code: Optional[str] = None
    assembly_site: Optional[str] = None
    lift_count: Optional[int] = None
    equipment_code: Optional[str] = None
    planner: Optional[str] = None
    pm_name: Optional[str] = None
    cve_name: Optional[str] = None
    trial_supervisor: Optional[str] = None
    process_supervisor: Optional[str] = None
    assembly_supervisor: Optional[str] = None
    plan_start_time: Optional[datetime] = None
    plan_end_time: Optional[datetime] = None
    plan_work_hours: Optional[float] = None
    actual_work_hours: Optional[float] = 0.0
    progress: Optional[float] = 0.0
    progress_manual_override: Optional[int] = 0
    summer_target_count: Optional[int] = None
    summer_target_date: Optional[date] = None
    source: Optional[str] = "manual"


class TaskUpdateRequest(BaseModel):
    task_name: Optional[str] = None
    task_type: Optional[str] = None
    trial_type: Optional[str] = None
    project_group: Optional[str] = None
    project_code: Optional[str] = None
    vehicle_code: Optional[str] = None
    vehicle_model: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    zone_code: Optional[str] = None
    assembly_site: Optional[str] = None
    lift_count: Optional[int] = None
    equipment_code: Optional[str] = None
    planner: Optional[str] = None
    pm_name: Optional[str] = None
    cve_name: Optional[str] = None
    trial_supervisor: Optional[str] = None
    process_supervisor: Optional[str] = None
    assembly_supervisor: Optional[str] = None
    plan_start_time: Optional[datetime] = None
    plan_end_time: Optional[datetime] = None
    plan_work_hours: Optional[float] = None
    actual_work_hours: Optional[float] = None
    progress: Optional[float] = None
    progress_manual_override: Optional[int] = None
    summer_target_count: Optional[int] = None
    summer_target_date: Optional[date] = None
    source: Optional[str] = None


@router.get("/tasks")
def list_tasks(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    task_type: Optional[str] = Query(None, description="任务类型: A/B/C/sporadic"),
    trial_type: Optional[str] = Query(None, description="试制类别筛选: 骡子车/ET0/ET/软模车/FT0/MT*"),
    status: Optional[str] = Query(None, description="任务状态: pending/in_progress/completed/overdue"),
    priority: Optional[str] = Query(None, description="优先级: high/medium/low"),
    zone_code: Optional[str] = Query(None, description="区域/装配场地筛选"),
    assembly_site: Optional[str] = Query(None, description="装配场地: SZA/SZB/SZC/JP1/JP2/LH/CX1/CX2/CX/HM"),
    keyword: str = Query("", description="搜索关键词（任务编号/名称/项目编号/车号/项目群/负责人）"),
):
    """获取任务列表（支持筛选、分页、搜索）"""
    try:
        from backend.modules.resource.services.task_service import get_task_list
        result = get_task_list(
            page=page,
            page_size=page_size,
            task_type=task_type,
            trial_type=trial_type,
            status=status,
            priority=priority,
            zone_code=zone_code,
            assembly_site=assembly_site,
            keyword=keyword
        )
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}")
def get_task(
    task_id: int = Path(..., description="任务ID"),
):
    """获取单个任务详情"""
    try:
        from backend.modules.resource.services.task_service import get_task_by_id
        result = get_task_by_id(task_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"任务 ID {task_id} 不存在")
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks")
def create_task(request: TaskCreateRequest):
    """新增任务"""
    try:
        from backend.modules.resource.services.task_service import create_task
        data = request.model_dump()
        for f in ['plan_start_time', 'plan_end_time']:
            if data.get(f):
                data[f] = data[f].strftime('%Y-%m-%d %H:%M:%S')
        if data.get('summer_target_date'):
            data['summer_target_date'] = data['summer_target_date'].strftime('%Y-%m-%d')
        result = create_task(data)
        return {
            "code": 200,
            "message": "创建任务成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tasks/{task_id}")
def update_task(
    task_id: int = Path(..., description="任务ID"),
    request: TaskUpdateRequest = ...,
):
    """更新任务信息"""
    try:
        from backend.modules.resource.services.task_service import update_task
        data = request.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(status_code=400, detail="没有需要更新的字段")
        for f in ['plan_start_time', 'plan_end_time']:
            if data.get(f):
                data[f] = data[f].strftime('%Y-%m-%d %H:%M:%S')
        if data.get('summer_target_date'):
            data['summer_target_date'] = data['summer_target_date'].strftime('%Y-%m-%d')
        result = update_task(task_id, data)
        return {
            "code": 200,
            "message": "更新成功",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int = Path(..., description="任务ID"),
):
    """删除任务"""
    try:
        from backend.modules.resource.services.task_service import delete_task
        delete_task(task_id)
        return {
            "code": 200,
            "message": "删除成功",
            "data": None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/stats")
def get_task_stats():
    """获取任务看板KPI统计数据"""
    try:
        from backend.modules.resource.services.task_service import get_task_stats
        result = get_task_stats()
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/status-distribution")
def get_task_status_distribution():
    """获取任务状态分布（饼图用）"""
    try:
        from backend.modules.resource.services.task_service import get_status_distribution
        result = get_status_distribution()
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/type-progress")
def get_task_type_progress():
    """获取任务类型与进度对比（柱状图用）"""
    try:
        from backend.modules.resource.services.task_service import get_type_vs_progress
        result = get_type_vs_progress()
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/monthly-trend")
def get_task_monthly_trend(year: Optional[int] = Query(None, description="年份，默认本年")):
    """按月度任务趋势"""
    try:
        from backend.modules.resource.services.task_service import get_monthly_trend
        result = get_monthly_trend(year)
        return {
            "code": 200,
            "message": "获取成功",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/gantt")
def get_gantt_data(
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    task_type: Optional[str] = Query(None, description="任务类型筛选"),
):
    """甘特图排程数据"""
    return {
        "code": 200,
        "message": "获取成功",
        "data": {
            "tasks": [],
            "time_range": {
                "start": str(start_date) if start_date else None,
                "end": str(end_date) if end_date else None,
            },
            "message": "甘特图接口占位实现"
        }
    }


# ==================== 预警相关 ====================

@router.get("/alerts")
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    alert_type: Optional[str] = Query(None, description="预警类型: equipment_timeout/unmanned_operation/personnel_abnormal/task_delay"),
    level: Optional[str] = Query(None, description="预警级别: critical/warning/info"),
    status: Optional[str] = Query(None, description="处理状态: pending/processing/resolved"),
):
    """异常预警列表"""
    return {
        "code": 200,
        "message": "获取成功",
        "data": {
            "total": 0,
            "page": page,
            "page_size": page_size,
            "data": [],
            "message": "异常预警列表接口占位实现"
        }
    }


# ==================== 驾驶舱相关 ====================

@router.get("/dashboard/kpi")
def get_dashboard_kpi():
    """综合驾驶舱 KPI 汇总"""
    try:
        from backend.modules.resource.services.equipment_service import get_equipment_stats
        equipment_stats = get_equipment_stats()
        
        return {
            "code": 200,
            "message": "获取成功",
            "data": {
                "kpis": {
                    "equipment_total": equipment_stats['total'],
                    "equipment_busy": equipment_stats['busy'],
                    "equipment_idle": equipment_stats['idle'],
                    "equipment_error": equipment_stats['error'],
                    "equipment_maintenance": equipment_stats['maintenance'],
                    "personnel_total": 0,
                    "personnel_working": 0,
                    "personnel_idle": 0,
                    "task_in_progress": 0,
                    "task_pending": 0,
                    "alert_pending": 0,
                },
                "equipment_status_distribution": equipment_stats['status_distribution'],
                "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
