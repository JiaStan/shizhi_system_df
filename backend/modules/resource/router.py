# -*- coding: utf-8 -*-
"""
试制资源管理模块路由
API 前缀: /api/resource
"""

from fastapi import APIRouter, HTTPException, Query, Path, Request
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
    """区域列表（数据库支撑）"""
    from backend.database import query_all
    rows = query_all(
        "SELECT id, zone_code, zone_name, zone_type, position_x, position_y, grid_columns, grid_rows "
        "FROM zones ORDER BY id"
    )
    return {
        "code": 200,
        "message": "获取成功",
        "data": rows,
    }


@router.get("/zones/map")
def get_zones_map():
    """获取地图数据（数据库支撑）"""
    from backend.database import query_all
    rows = query_all(
        "SELECT zone_code, zone_name, zone_type, position_x, position_y, grid_columns, grid_rows "
        "FROM zones ORDER BY id"
    )
    return {
        "code": 200,
        "message": "获取成功",
        "data": {"zones": rows},
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


@router.get("/personnel/map")
def get_personnel_map():
    """
    获取人员位置分布数据（园区地图覆盖层）
    注意：必须定义在 /personnel/{personnel_code} 之前，避免被路径参数路由拦截
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
    debug_supervisor: Optional[str] = None
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
    debug_supervisor: Optional[str] = None
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
    page_size: int = Query(20, ge=1, le=1000, description="每页数量"),
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


# ==================== 预警相关 ====================

class AlertCreateRequest(BaseModel):
    alert_code: Optional[str] = None
    alert_type: str  # task_delay/quality_defect/equipment_fault/...
    level: Optional[str] = "medium"
    title: str
    description: Optional[str] = None
    source: Optional[str] = "manual_report"
    related_type: Optional[str] = "none"
    related_id: Optional[str] = None
    related_name: Optional[str] = None
    related_equipment: Optional[str] = None
    related_task: Optional[int] = None
    related_personnel: Optional[str] = None
    zone_code: Optional[str] = None
    assembly_site: Optional[str] = None
    raised_by: Optional[str] = None
    raised_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    escalated: Optional[int] = 0
    escalated_to: Optional[str] = None
    status: Optional[str] = "pending"
    handler: Optional[str] = None
    handler_department: Optional[str] = None
    processing_started_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    processing_scheme: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_measure: Optional[str] = None
    result_verification: Optional[str] = None
    loss_amount: Optional[float] = None
    impact_hours: Optional[float] = 0
    attachment_count: Optional[int] = 0
    remark: Optional[str] = None


class AlertUpdateRequest(BaseModel):
    alert_type: Optional[str] = None
    level: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    related_type: Optional[str] = None
    related_id: Optional[str] = None
    related_name: Optional[str] = None
    related_equipment: Optional[str] = None
    related_task: Optional[int] = None
    related_personnel: Optional[str] = None
    zone_code: Optional[str] = None
    assembly_site: Optional[str] = None
    raised_by: Optional[str] = None
    raised_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    escalated: Optional[int] = None
    escalated_to: Optional[str] = None
    status: Optional[str] = None
    handler: Optional[str] = None
    handler_department: Optional[str] = None
    processing_started_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    processing_scheme: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_measure: Optional[str] = None
    result_verification: Optional[str] = None
    loss_amount: Optional[float] = None
    impact_hours: Optional[float] = None
    attachment_count: Optional[int] = None
    remark: Optional[str] = None


class AlertHandleRequest(BaseModel):
    handler: Optional[str] = None
    handler_department: Optional[str] = None
    processing_scheme: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_measure: Optional[str] = None
    result_verification: Optional[str] = None
    status: Optional[str] = "processing"


class AlertEscalateRequest(BaseModel):
    escalated_to: str
    reason: Optional[str] = None


class AlertBatchRequest(BaseModel):
    ids: List[int]
    status: str
    operator: Optional[str] = None


@router.get("/alerts")
def list_alerts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=200, description="每页数量"),
    alert_type: Optional[str] = Query(None, description="预警类型 task_delay/quality_defect/equipment_fault/material_shortage/personnel_gap/safety_hazard/schedule_overdue/process_violation/external_coordinate/other"),
    level: Optional[str] = Query(None, description="级别: critical/high/medium/low"),
    status: Optional[str] = Query(None, description="状态: pending/processing/resolved/closed/expired(软超期)"),
    source: Optional[str] = Query(None, description="来源: system_auto/manual_report/equipment_report/operation_inspection/quality_inspection/other"),
    zone_code: Optional[str] = Query(None, description="发生区域"),
    assembly_site: Optional[str] = Query(None, description="装配场地 SZA/SZB/SZC..."),
    handler: Optional[str] = Query(None, description="处理人"),
    raised_start: Optional[str] = Query(None, description="发生起 YYYY-MM-DD"),
    raised_end: Optional[str] = Query(None, description="发生止 YYYY-MM-DD"),
    keyword: str = Query("", description="搜索关键词"),
    escalated_only: bool = Query(False, description="仅看升级上报的预警"),
    overdue_only: bool = Query(False, description="仅看已超SLA的预警"),
):
    """异常预警列表（分页/筛选/SLA软超期过滤）"""
    try:
        from backend.modules.resource.services.alert_service import get_alert_list
        result = get_alert_list(
            page=page, page_size=page_size,
            alert_type=alert_type, level=level, status=status, source=source,
            zone_code=zone_code, assembly_site=assembly_site, handler=handler,
            raised_start=raised_start, raised_end=raised_end, keyword=keyword,
            escalated_only=escalated_only, overdue_only=overdue_only
        )
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/stats")
def get_alert_stats_endpoint():
    """预警统计：KPI / 级别分布 / 类型分布 / 周新增趋势"""
    try:
        from backend.modules.resource.services.alert_service import get_alert_stats
        return {"code": 200, "message": "获取成功", "data": get_alert_stats()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/{alert_id}")
def get_alert(alert_id: int = Path(..., description="预警ID")):
    """获取预警详情"""
    try:
        from backend.modules.resource.services.alert_service import get_alert_by_id
        result = get_alert_by_id(alert_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"预警 ID {alert_id} 不存在")
        return {"code": 200, "message": "获取成功", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts")
def create_alert(req: AlertCreateRequest):
    """新增预警（人工上报）"""
    try:
        from backend.modules.resource.services.alert_service import create_alert
        result = create_alert(req.dict(exclude_none=True))
        return {"code": 200, "message": "新增成功", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/alerts/{alert_id}")
def update_alert(req: AlertUpdateRequest, alert_id: int = Path(...)):
    """更新预警（通用）"""
    try:
        from backend.modules.resource.services.alert_service import update_alert
        data = req.dict(exclude_none=True)
        result = update_alert(alert_id, data)
        return {"code": 200, "message": "更新成功", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/handle")
def handle_alert(req: AlertHandleRequest, alert_id: int = Path(...)):
    """处理预警：介入/处置/验证"""
    try:
        from backend.modules.resource.services.alert_service import update_alert
        data = req.dict(exclude_none=True)
        # status 默认 processing
        if 'status' not in data:
            data['status'] = 'processing'
        result = update_alert(alert_id, data)
        return {"code": 200, "message": "处理成功", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/escalate")
def escalate_alert(req: AlertEscalateRequest, alert_id: int = Path(...)):
    """升级上报预警"""
    try:
        from backend.modules.resource.services.alert_service import escalate_alert
        result = escalate_alert(alert_id, req.escalated_to, req.reason)
        return {"code": 200, "message": "已升级", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/batch")
def batch_update_alert_status(req: AlertBatchRequest):
    """批量修改预警状态（待处理->处理中->解决->关闭）"""
    try:
        from backend.modules.resource.services.alert_service import batch_update_status
        count = batch_update_status(req.ids, req.status, req.operator)
        return {"code": 200, "message": f"已更新 {count} 条", "data": {"updated": count}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 甘特排程相关 ====================

class ScheduleCreateRequest(BaseModel):
    task_name: str
    task_type: str = "B"
    trial_type: Optional[str] = None
    project_group: Optional[str] = None
    project_code: Optional[str] = None
    vehicle_code: Optional[str] = None
    vehicle_model: Optional[str] = None
    phase: Optional[str] = "assembly"
    priority: Optional[str] = "medium"
    status: Optional[str] = "pending"
    color_tag: Optional[str] = None
    assembly_site: Optional[str] = None
    zone_code: Optional[str] = None
    lift_count: Optional[int] = 0
    equipment_code: Optional[str] = None
    planner: Optional[str] = None
    pm_name: Optional[str] = None
    cve_name: Optional[str] = None
    trial_supervisor: Optional[str] = None
    plan_start_time: Optional[str] = None   # ISO datetime string
    plan_end_time: Optional[str] = None
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    plan_work_hours: Optional[float] = 0
    actual_work_hours: Optional[float] = 0
    progress: Optional[float] = 0
    progress_manual_override: Optional[int] = 0
    parent_id: Optional[int] = None
    sort_order: Optional[int] = 0
    constraint_type: Optional[str] = "as_soon_as_possible"
    constraint_date: Optional[str] = None
    predecessor_ids: Optional[List[int]] = None
    remark: Optional[str] = None
    created_by: Optional[str] = None
    task_id: Optional[int] = None
    task_code: Optional[str] = None

class ScheduleUpdateRequest(BaseModel):
    task_name: Optional[str] = None
    task_type: Optional[str] = None
    trial_type: Optional[str] = None
    project_group: Optional[str] = None
    project_code: Optional[str] = None
    vehicle_code: Optional[str] = None
    vehicle_model: Optional[str] = None
    phase: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    color_tag: Optional[str] = None
    assembly_site: Optional[str] = None
    zone_code: Optional[str] = None
    lift_count: Optional[int] = None
    equipment_code: Optional[str] = None
    planner: Optional[str] = None
    pm_name: Optional[str] = None
    cve_name: Optional[str] = None
    trial_supervisor: Optional[str] = None
    plan_start_time: Optional[str] = None
    plan_end_time: Optional[str] = None
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    plan_work_hours: Optional[float] = None
    actual_work_hours: Optional[float] = None
    progress: Optional[float] = None
    progress_manual_override: Optional[int] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    constraint_type: Optional[str] = None
    constraint_date: Optional[str] = None
    remark: Optional[str] = None

class ScheduleDependenciesRequest(BaseModel):
    predecessor_ids: List[int]

class ScheduleBatchStatusRequest(BaseModel):
    schedule_ids: List[int]
    status: str
    by: Optional[str] = None

class AllocationCreateRequest(BaseModel):
    schedule_id: int
    resource_type: str
    resource_code: str
    resource_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    hours_allocated: Optional[float] = 0
    quantity: Optional[int] = 1
    priority: Optional[int] = 0
    status: Optional[str] = "planned"
    remark: Optional[str] = None

class BatchAllocationRequest(BaseModel):
    schedule_id: int
    allocations: List[Dict[str, Any]]

class ConflictCheckRequest(BaseModel):
    assembly_site: Optional[str] = None
    auto_save: Optional[bool] = True

class ConflictResolveRequest(BaseModel):
    resolution: str
    resolved_by: Optional[str] = None

class ConflictIgnoreRequest(BaseModel):
    reason: Optional[str] = None
    by: Optional[str] = None


@router.get("/gantt/data")
def get_gantt_data_route(
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=2000),
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assembly_site: Optional[str] = None,
    keyword: str = Query("", max_length=200),
    only_critical: bool = False,
    only_conflict: bool = False,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """甘特图排程数据列表（支持筛选、分页、日期区间）"""
    try:
        from backend.modules.resource.services.gantt_service import get_gantt_data
        result = get_gantt_data(
            page=page, page_size=page_size,
            task_type=task_type, status=status, priority=priority,
            assembly_site=assembly_site, keyword=keyword,
            only_critical=only_critical, only_conflict=only_conflict,
            date_from=date_from, date_to=date_to,
        )
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gantt/stats")
def get_gantt_stats_route():
    """甘特 KPI 统计 + 分布图 + 近 8 周趋势"""
    try:
        from backend.modules.resource.services.gantt_service import get_gantt_stats
        result = get_gantt_stats()
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gantt/schedules/{schedule_id_or_code}")
def get_schedule_detail_route(schedule_id_or_code: str = Path(...)):
    """排程详情（含资源分配、打开冲突）"""
    try:
        from backend.modules.resource.services.gantt_service import get_schedule_by_id
        result = get_schedule_by_id(schedule_id_or_code)
        if not result:
            raise HTTPException(status_code=404, detail="排程不存在")
        return {"code": 200, "message": "获取成功", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gantt/schedules")
def create_schedule_route(req: ScheduleCreateRequest):
    """新建排程"""
    try:
        from backend.modules.resource.services.gantt_service import create_schedule
        data = req.model_dump()
        result = create_schedule(data)
        return {"code": 200, "message": "创建成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/gantt/schedules/{schedule_id_or_code}")
def update_schedule_route(req: ScheduleUpdateRequest, schedule_id_or_code: str = Path(...)):
    """更新排程（拖拽调整后保存等）"""
    try:
        from backend.modules.resource.services.gantt_service import update_schedule
        data = req.model_dump(exclude_unset=True)
        result = update_schedule(schedule_id_or_code, data)
        if not result:
            raise HTTPException(status_code=404, detail="排程不存在")
        return {"code": 200, "message": "更新成功", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/gantt/schedules/{schedule_id_or_code}")
def delete_schedule_route(schedule_id_or_code: str = Path(...)):
    """删除排程（级联清理分配+忽略相关冲突）"""
    try:
        from backend.modules.resource.services.gantt_service import delete_schedule
        result = delete_schedule(schedule_id_or_code)
        return {"code": 200, "message": "删除成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/gantt/schedules/{schedule_id_or_code}/dependencies")
def update_dependencies_route(req: ScheduleDependenciesRequest, schedule_id_or_code: str = Path(...)):
    """设置排程前置依赖（环检测）"""
    try:
        from backend.modules.resource.services.gantt_service import update_dependencies
        result = update_dependencies(schedule_id_or_code, req.predecessor_ids)
        return {"code": 200, "message": "依赖更新成功", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gantt/allocations")
def list_allocations_route(
    schedule_id_or_code: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_code: Optional[str] = None,
    status: Optional[str] = None,
):
    """资源分配列表"""
    try:
        from backend.modules.resource.services.gantt_service import list_allocations
        result = list_allocations(schedule_id_or_code, resource_type, resource_code, status)
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gantt/allocations")
def add_allocation_route(req: AllocationCreateRequest):
    """新增资源分配"""
    try:
        from backend.modules.resource.services.gantt_service import add_allocation
        data = req.model_dump()
        result = add_allocation(data)
        return {"code": 200, "message": "分配成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/gantt/allocations/{allocation_id}")
def remove_allocation_route(allocation_id: int = Path(..., ge=1)):
    """删除资源分配"""
    try:
        from backend.modules.resource.services.gantt_service import remove_allocation
        result = remove_allocation(allocation_id)
        return {"code": 200, "message": "删除成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gantt/allocations/batch")
def batch_allocation_route(req: BatchAllocationRequest):
    """批量资源分配"""
    try:
        from backend.modules.resource.services.gantt_service import batch_allocate_allocations
        result = batch_allocate_allocations(req.schedule_id, req.allocations)
        return {"code": 200, "message": "批量分配成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gantt/check-conflicts")
def check_conflicts_route(req: ConflictCheckRequest):
    """触发冲突检测（资源重叠/依赖错过/截止风险/场地重叠）"""
    try:
        from backend.modules.resource.services.gantt_service import detect_conflicts
        result = detect_conflicts(assembly_site=req.assembly_site, auto_save=req.auto_save)
        return {"code": 200, "message": "检测完成", "data": {"count": len(result), "conflicts": result}}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gantt/conflicts")
def list_conflicts_route(
    conflict_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    assembly_site: Optional[str] = None,
    schedule_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    """冲突列表"""
    try:
        from backend.modules.resource.services.gantt_service import list_conflicts
        result = list_conflicts(conflict_type, severity, status, assembly_site, schedule_id, page, page_size)
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/gantt/conflicts/{conflict_id_or_code}/resolve")
def resolve_conflict_route(req: ConflictResolveRequest, conflict_id_or_code: str = Path(...)):
    """标记冲突已解决"""
    try:
        from backend.modules.resource.services.gantt_service import resolve_conflict
        result = resolve_conflict(conflict_id_or_code, req.resolution, req.resolved_by)
        return {"code": 200, "message": "解决成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/gantt/conflicts/{conflict_id_or_code}/ignore")
def ignore_conflict_route(req: ConflictIgnoreRequest, conflict_id_or_code: str = Path(...)):
    """忽略冲突"""
    try:
        from backend.modules.resource.services.gantt_service import ignore_conflict
        result = ignore_conflict(conflict_id_or_code, req.reason, req.by)
        return {"code": 200, "message": "已忽略", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gantt/compute-critical")
def compute_critical_path_route():
    """计算关键路径（Kahn拓扑排序+ES/EF/LF/LS）"""
    try:
        from backend.modules.resource.services.gantt_service import compute_critical_path
        result = compute_critical_path()
        return {"code": 200, "message": "关键路径计算完成", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gantt/batch-status")
def batch_schedule_status_route(req: ScheduleBatchStatusRequest):
    """批量更新排程状态（自动打实际开始/结束时间戳）"""
    try:
        from backend.modules.resource.services.gantt_service import batch_update_status
        result = batch_update_status(req.schedule_ids, req.status, req.by)
        return {"code": 200, "message": "批量状态更新完成", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 资源占用看板相关 ====================

@router.get("/utilization/board")
def get_utilization_board_route(
    weeks: int = Query(10, ge=1, le=26, description="周度排程展开周数"),
):
    """
    资源占用看板主数据：试制排程矩阵
    - 按场地聚合试制能力、设备配置、项目排程
    - 按周展开甘特格（done/doing/wait/plan）
    - KPI：场地总数/项目排程/设备数/预算/采购/场地占用率
    """
    try:
        from backend.modules.resource.services.utilization_service import get_utilization_board
        result = get_utilization_board(weeks)
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/utilization/trend")
def get_utilization_trend_route(
    weeks: int = Query(10, ge=1, le=26, description="趋势周数"),
):
    """周度场地占用率趋势（利用率折线图用）"""
    try:
        from backend.modules.resource.services.utilization_service import get_utilization_trend
        result = get_utilization_trend(weeks)
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/utilization/equipment-ranking")
def get_equipment_utilization_rank_route(
    days: int = Query(28, ge=7, le=90, description="统计窗口天数"),
    limit: int = Query(10, ge=1, le=50, description="排名条数"),
):
    """设备利用率排名（按排程占用时长占比）"""
    try:
        from backend.modules.resource.services.utilization_service import get_equipment_utilization_rank
        result = get_equipment_utilization_rank(days, limit)
        return {"code": 200, "message": "获取成功", "data": result}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 驾驶舱相关 ====================

@router.get("/dashboard/kpi")
def get_dashboard_kpi():
    """综合驾驶舱 KPI 汇总"""
    try:
        from backend.modules.resource.services.equipment_service import get_equipment_stats
        from backend.modules.resource.services.personnel_service import get_personnel_stats
        from backend.modules.resource.services.task_service import get_task_stats
        from backend.modules.resource.services.alert_service import get_alert_stats
        from backend.database import query_one
        equipment_stats = get_equipment_stats()
        personnel_stats = get_personnel_stats()
        task_stats = get_task_stats()
        alert_stats = get_alert_stats()

        # 今日完工：当日状态变更为 completed 的任务数
        today_done_row = query_one(
            "SELECT COUNT(*) AS c FROM tasks "
            "WHERE status='completed' AND DATE(updated_at)=CURDATE()"
        ) or {}
        today_completed = int(today_done_row.get('c', 0) or 0)

        equipment_total = equipment_stats['total']
        equipment_busy = equipment_stats['busy']
        equipment_utilization = round(equipment_busy / equipment_total * 100) if equipment_total > 0 else 0

        return {
            "code": 200,
            "message": "获取成功",
            "data": {
                "kpis": {
                    "equipment_total": equipment_total,
                    "equipment_busy": equipment_busy,
                    "equipment_idle": equipment_stats['idle'],
                    "equipment_error": equipment_stats['error'],
                    "equipment_maintenance": equipment_stats['maintenance'],
                    "equipment_utilization": equipment_utilization,
                    "personnel_total": personnel_stats['total'],
                    "personnel_working": personnel_stats['working'],
                    "personnel_idle": personnel_stats['idle'],
                    "personnel_on_duty": personnel_stats['on_duty'],
                    "personnel_offline": personnel_stats['offline'],
                    "task_total": task_stats['total'],
                    "task_in_progress": task_stats['in_progress'],
                    "task_pending": task_stats['pending'],
                    "task_today_completed": today_completed,
                    "task_overdue": task_stats['overdue'],
                    "task_high_priority": task_stats.get('high_priority', 0),
                    "alert_pending": alert_stats['pending'],
                    "alert_critical": alert_stats['critical'],
                    "alert_overdue": alert_stats['overdue'],
                    "alert_total": alert_stats['total'],
                },
                "equipment_status_distribution": equipment_stats['status_distribution'],
                "personnel_status_distribution": personnel_stats['status_distribution'],
                "task_status_distribution": task_stats.get('status_distribution', []),
                "alert_level_distribution": alert_stats.get('level_distribution', {}),
                "alert_weekly_trend": alert_stats.get('weekly_trend', []),
                "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/recent")
def get_dashboard_recent():
    """驾驶舱近期数据：进行中任务 + 待处理告警 + 周度占用趋势"""
    try:
        from backend.modules.resource.services.task_service import get_task_list
        from backend.modules.resource.services.alert_service import get_alert_list
        from backend.modules.resource.services.utilization_service import get_utilization_trend
        tasks_res = get_task_list(page=1, page_size=8, status='in_progress', task_type='', trial_type='',
                                  priority='', zone_code='', assembly_site='', keyword='')
        alerts_res = get_alert_list(page=1, page_size=8, status='pending')
        utilization = get_utilization_trend(weeks=8)
        return {
            "code": 200,
            "message": "获取成功",
            "data": {
                "in_progress_tasks": tasks_res.get('data', []),
                "pending_alerts": alerts_res.get('data', []),
                "utilization_trend": utilization,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 扫码占用（现场作业） ====================

class ScanStartRequest(BaseModel):
    task_id: Optional[int] = None
    task_name: str
    task_category: Optional[str] = None  # A类/B类/C类/零星
    personnel_codes: List[str] = []


@router.get("/scan/sessions/active")
def scan_active_sessions():
    """全部进行中作业会话（园区地图/资源占用同步用）"""
    try:
        from backend.modules.resource.services import scan_service
        return {"code": 200, "message": "获取成功", "data": scan_service.list_active_sessions()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan/{equipment_code}/state")
def scan_state(equipment_code: str = Path(..., description="设备编号")):
    """扫码页状态：设备信息 + 当前进行中作业（若有）"""
    from backend.modules.resource.services import scan_service
    try:
        return {"code": 200, "message": "获取成功", "data": scan_service.get_scan_state(equipment_code)}
    except scan_service.ScanError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan/{equipment_code}/options")
def scan_options(equipment_code: str = Path(..., description="设备编号")):
    """扫码页可选数据：零星任务 / ABC类任务 / 作业人员"""
    from backend.modules.resource.services import scan_service
    try:
        return {"code": 200, "message": "获取成功", "data": scan_service.get_scan_options()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan/{equipment_code}/start")
def scan_start(equipment_code: str = Path(..., description="设备编号"), request: ScanStartRequest = ...):
    """开始作业：写入作业记录，联动设备/人员/任务状态"""
    from backend.modules.resource.services import scan_service
    try:
        data = scan_service.start_work(
            equipment_code,
            task_id=request.task_id,
            task_name=request.task_name,
            task_category=request.task_category,
            personnel_codes=request.personnel_codes,
        )
        return {"code": 200, "message": "作业已开始", "data": data}
    except scan_service.ScanError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan/{equipment_code}/end")
def scan_end(equipment_code: str = Path(..., description="设备编号")):
    """结束作业：关闭会话，设备/人员重置为空闲"""
    from backend.modules.resource.services import scan_service
    try:
        data = scan_service.end_work(equipment_code)
        return {"code": 200, "message": "作业已结束", "data": data}
    except scan_service.ScanError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equipment/{equipment_code}/qr")
def equipment_qr(equipment_code: str = Path(..., description="设备编号"), request: Request = None):
    """设备扫码占用页二维码 PNG"""
    from fastapi.responses import Response
    from backend.modules.resource.services import scan_service
    try:
        base_url = str(request.base_url) if request else "http://localhost:8000"
        png = scan_service.generate_qr_png(equipment_code, base_url)
        return Response(content=png, media_type="image/png",
                        headers={"Cache-Control": "no-cache, no-store"})
    except scan_service.ScanError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
