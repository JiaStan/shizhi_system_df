# -*- coding: utf-8 -*-
from fastapi import APIRouter, Query, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from backend.projects import schemas, crud
import os
import aiofiles
from backend.pbom.excel_parser import PBOMExcelParser
from backend.pbom.column_detector import ThreeLayerColumnDetector
from backend.pbom import crud as pbom_crud
from backend.config import settings
from backend.logger import get_logger

logger = get_logger('projects.router')

router = APIRouter()

_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'PBOM导入模板.xlsx')


@router.get("/pbom-template")
def download_pbom_template():
    """下载 PBOM 导入模板"""
    if not os.path.exists(_TEMPLATE_PATH):
        raise HTTPException(status_code=404, detail="模板文件不存在，请联系管理员")
    return FileResponse(
        _TEMPLATE_PATH,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="PBOM导入模板.xlsx",
    )


@router.get("/")
def list_projects(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    result = crud.list_projects(page, page_size)
    return {
        "projects": result.get("data", []),
        "total": result.get("total", 0),
    }


@router.get("/{project_id}")
def get_project(project_id: int):
    row = crud.get_project(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="项目不存在")
    return {"project": row}


@router.post("/")
def create_project(data: schemas.ProjectCreate):
    project_id = crud.create_project(
        name=data.name,
        project_code=data.project_code,
        apply_code=data.apply_code,
        apply_code2=data.apply_code2 or "",
        status=data.status,
        trial_leader=data.trial_leader,
        process_leader=data.process_leader,
        assembly_leader=data.assembly_leader,
    )
    row = crud.get_project(project_id)
    return {"project": row, "message": "项目创建成功"}


@router.put("/{project_id}")
def update_project(project_id: int, data: schemas.ProjectUpdate):
    exist = crud.get_project(project_id)
    if not exist:
        raise HTTPException(status_code=404, detail="项目不存在")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    crud.update_project(project_id, updates)
    return {"message": "项目更新成功"}


@router.delete("/{project_id}")
def delete_project(project_id: int):
    exist = crud.get_project(project_id)
    if not exist:
        raise HTTPException(status_code=404, detail="项目不存在")
    crud.delete_project(project_id)
    return {"message": "项目删除成功"}


@router.get("/{project_id}/parts")
def list_project_parts(project_id: int):
    parts = crud.list_project_parts(project_id)
    return {"parts": parts}


@router.get("/{project_id}/stats")
def get_project_stats(project_id: int):
    stats = crud.get_project_stats(project_id)
    total_parts = stats.get("parts_count", 0) if stats else 0
    total_demand = stats.get("total_demand", 0) if stats else 0
    total_received = stats.get("total_received", 0) if stats else 0
    total_line_side = stats.get("total_line_side", 0) if stats else 0
    matched_rate = stats.get("matched_rate", 0.0) if stats else 0.0
    return {
        "total_parts": total_parts,
        "total_demand": total_demand,
        "total_received": total_received,
        "total_line_side": total_line_side,
        "matched_rate": matched_rate,
        "critical_count": 0,
    }


@router.get("/{project_id}/shortage-parts")
def get_shortage_parts(
    project_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    keyword: str = Query("", description="搜索关键词（零件号/零件名/专业师）"),
    doc_state_filter: str = Query("all", description="单据状态筛选：all/入库完成/待检/不合格待判定 等"),
    warehouse_filter: str = Query("all", description="到货仓库筛选"),
):
    """
    获取缺件零件列表（分页），包含专业师、到货仓库、单据状态等信息
    支持搜索（零件号/零件名/专业师）、单据状态筛选、仓库筛选
    """
    result = crud.get_shortage_parts(
        project_id, page, page_size,
        keyword=keyword, warehouse_filter=warehouse_filter,
        doc_state_filter=doc_state_filter,
    )
    return {
        "total": result.get("total", 0),
        "page": result.get("page", page),
        "page_size": result.get("page_size", page_size),
        "data": result.get("data", []),
    }


@router.get("/{project_id}/doc-state-distribution")
def get_doc_state_distribution(project_id: int):
    """
    获取未到仓库缺件的单据状态分布（按零件种类统计）
    """
    result = crud.get_doc_state_distribution(project_id)
    return result


@router.delete("/{project_id}/pbom-clear")
def clear_pbom_parts(project_id: int):
    exist = crud.get_project(project_id)
    if not exist:
        raise HTTPException(status_code=404, detail="项目不存在")
    pbom_crud.clear_pbom_parts(project_id)
    return {"success": True, "message": "PBOM 零件清单已清除"}


@router.post("/{project_id}/pbom-upload")
async def upload_pbom_for_project(project_id: int, file: UploadFile = File(...)):
    exist = crud.get_project(project_id)
    if not exist:
        raise HTTPException(status_code=404, detail="项目不存在")

    filename = file.filename
    ext = filename.split('.')[-1].lower()
    if ext not in ['xlsx', 'xls', 'csv']:
        raise HTTPException(status_code=400, detail="仅支持 .xlsx / .xls / .csv 文件")

    size = 0
    save_path = os.path.join(settings.UPLOAD_DIR, f"{os.urandom(8).hex()}_{filename}")
    async with aiofiles.open(save_path, 'wb') as f:
        chunk = await file.read(1024 * 1024)
        while chunk:
            size += len(chunk)
            await f.write(chunk)
            chunk = await file.read(1024 * 1024)

    logger.info(f"PBOM 文件上传: {save_path}, 项目ID: {project_id}, 大小: {size}")

    try:
        parser = PBOMExcelParser(save_path)
        df, headers = parser.read_excel()

        check = parser.check_required_columns()
        if not check["ok"]:
            raise HTTPException(status_code=400, detail=f"表格缺少必填列: {', '.join(check['missing'])}")

        required_info = check["found"]

        detector = ThreeLayerColumnDetector(parser)
        result = detector.detect(headers)
        candidates = result.get("candidates", [])
        config_columns = [c["column"] for c in candidates if c.get("confidence", 0) >= 0.6]
        logger.info(f"自动识别配置列 {len(config_columns)} 个: {config_columns}")

        parts = parser.extract_parts_with_config_sum(
            required_info["part_code_col"],
            required_info["part_name_col"],
            config_columns,
        )

        if len(parts) == 0:
            raise HTTPException(status_code=400, detail="未提取到任何有效零件数据，请检查表格格式")

        saved_count = pbom_crud.save_pbom_parts(project_id, parts)

        try:
            from backend.pbom.pbom_matcher import PBOMMatcher
            matcher = PBOMMatcher()
            match_result = matcher.match_project(project_id)
            logger.info(f"PBOM 匹配完成: {match_result}")
        except Exception as e:
            logger.warning(f"PBOM 匹配失败（已跳过）: {e}")

        try:
            for col in config_columns:
                display_name = col
                config_id = pbom_crud.save_config(project_id, col, display_name)
                config_qty_map = parser.extract_config_qty(required_info["part_code_col"], col)
                for part_code, qty in config_qty_map.items():
                    if qty > 0:
                        pbom_crud.save_part_config(project_id, config_id, part_code, qty)
        except Exception as e:
            logger.warning(f"配置列保存失败（已跳过）: {e}")

    finally:
        try:
            os.remove(save_path)
        except Exception:
            pass

    return {
        "success": True,
        "code": 0,
        "count": saved_count,
        "message": f"PBOM 零件清单导入成功，共 {saved_count} 个零件"
    }