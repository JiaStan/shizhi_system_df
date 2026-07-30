# -*- coding: utf-8 -*-
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
import os
import aiofiles
from typing import List, Optional, Dict
from asyncio import sleep

from backend.config import settings
from backend.pbom.schemas import DetectColumnsResponse, DetectColumnsResponse, ParseResult, MatchResult
from backend.pbom.excel_parser import PBOMExcelParser
from backend.pbom.column_detector import ThreeLayerColumnDetector
from backend.pbom import crud
from backend.pbom.pbom_matcher import PBOMMatcher
from backend.core.exceptions import BusinessError
from backend.logger import get_logger

logger = get_logger('pbom.router')

router = APIRouter()


@router.post("/upload")
async def upload_pbom(file: UploadFile = File(...)):
    """上传 PBOM Excel 文件"""
    filename = file.filename
    ext = filename.split('.')[-1].lower()
    if ext not in ['xlsx', 'xls']:
        raise HTTPException(status_code=400, detail="只支持 .xlsx 或 .xls 文件")

    size = 0
    save_path = os.path.join(settings.UPLOAD_DIR, f"{os.urandom(8).hex()}_{filename}")

    async with aiofiles.open(save_path, 'wb') as f:
        chunk = await file.read(1024 * 1024)
        while chunk:
            size += len(chunk)
            await f.write(chunk)
            chunk = await file.read(1024 * 1024)

    logger.info(f"文件上传成功: {save_path}, 大小: {size} bytes")
    return {
        "filename": filename,
        "size": size,
        "path": save_path,
        "message": "上传成功",
    }


@router.post("/detect-columns")
async def detect_columns(file_path: str):
    """检测配置列（执行 Layer 1 + Layer 2）"""
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在，请重新上传")

    parser = PBOMExcelParser(file_path)
    df, headers = parser.read_excel()

    # 检查必填列
    check = parser.check_required_columns()
    if not check["ok"]:
        raise BusinessError(f"表格缺少必填列: {', '.join(check['missing'])}", 400)

    detector = ThreeLayerColumnDetector(parser)
    result = detector.detect(headers)
    candidates = result["candidates"]

    # 置信度排序
    candidates.sort(key=lambda x: x["confidence"], reverse=True)

    need_confirm = any(c["confidence"] < 0.6 for c in candidates)

    return {
        "data": DetectColumnsResponse(
            need_confirm=need_confirm,
            candidates=candidates,
        )
    }


class ParseRequest(BaseModel):
    project_id: int
    file_path: str
    confirmed_columns: List[str]
    display_names: Optional[Dict[str, str]] = None


@router.post("/parse")
async def parse_pbom(req: ParseRequest):
    """解析 PBOM 并保存到数据库（用户确认配置列后调用）"""
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="文件不存在，请重新上传")

    parser = PBOMExcelParser(req.file_path)
    df, headers = parser.read_excel()

    # 检查必填列
    check = parser.check_required_columns()
    if not check["ok"]:
        raise BusinessError(f"表格缺少必填列: {', '.join(check['missing'])}", 400)

    required_info = check["found"]
    logger.info(f"必填列: {required_info}")

    # 提取零件（需求量 = 所有配置列同行数值之和，相同零件号自动合并）
    parts = parser.extract_parts_with_config_sum(
        required_info["part_code_col"],
        required_info["part_name_col"],
        req.confirmed_columns,
    )

    if len(parts) == 0:
        raise BusinessError("未提取到任何有效零件数据，请检查表格格式", 400)

    # 保存零件
    saved_count = crud.save_pbom_parts(req.project_id, parts)

    # 保存配置和关联
    config_count = 0
    for config_col in req.confirmed_columns:
        display_name = (req.display_names or {}).get(config_col, config_col)
        config_id = crud.save_config(req.project_id, config_col, display_name)
        config_count += 1

        # 提取每个零件在该配置下的需求量
        config_qty_map = parser.extract_config_qty(
            required_info["part_code_col"], config_col
        )
        for part_code, qty in config_qty_map.items():
            if qty > 0:
                crud.save_part_config(req.project_id, config_id, part_code, qty)

    logger.info(
        f"PBOM 解析保存完成: 项目{req.project_id}, 零件{saved_count}个, 配置{config_count}个"
    )

    return {
        "data": ParseResult(
            project_id=req.project_id,
            parts_count=saved_count,
            config_count=config_count,
            message=f"解析完成，共 {saved_count} 个零件，{config_count} 个配置",
        )
    }


@router.get("/{project_id}/parts")
def get_parts(project_id: int):
    """获取项目零件清单"""
    parts = crud.get_project_parts(project_id)
    configs = crud.get_project_configs(project_id)
    return {
        "project_id": project_id,
        "parts": parts,
        "configs": configs,
    }


@router.post("/{project_id}/match")
def match_pbom(project_id: int):
    """执行 PBOM 匹配（匹配到货数据）"""
    matcher = PBOMMatcher()
    result = matcher.match_project(project_id)
    if "error" in result:
        raise BusinessError(result["error"], 400)
    return {"data": result}