from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from backend.core.exceptions import BusinessError

from .schemas import ArrivalSubmit
from .qr_generator import get_qr_generator
from .arrival_handler import ArrivalHandler
from .matcher import ThreeWayMatcher
from .crud import get_arrival_records, get_project_arrival_status

router = APIRouter(prefix="/api/qr-arrival", tags=["QR码现场到件"])


@router.get("/{project_id}/qr-code")
async def generate_qr_code(project_id: int):
    """生成项目二维码，返回PNG图片"""
    try:
        qr = get_qr_generator()
        buf = qr.generate(project_id)
        return StreamingResponse(
            buf,
            media_type="image/png",
            headers={"Content-Disposition": f"inline; filename=project-{project_id}-qr.png"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成二维码失败: {str(e)}")


@router.get("/{project_id}/info")
async def get_project_info(project_id: int):
    """获取项目基本信息（扫码后展示用）"""
    from backend.database import query_one

    project = query_one(
        "SELECT id, name, project_code AS code, apply_code, status "
        "FROM projects WHERE id = %s",
        (project_id,),
    )
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return {"project": project}


@router.post("/{project_id}/submit")
async def submit_arrival(project_id: int, data: ArrivalSubmit):
    """提交现场到件信息"""
    from backend.database import query_one

    project = query_one("SELECT id FROM projects WHERE id = %s", (project_id,))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    handler = ArrivalHandler()
    is_valid, err_msg = handler.validate_input(data.model_dump())
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    record_id = handler.save(
        project_id=project_id,
        part_code=data.part_code,
        arrival_qty=data.arrival_qty,
        arrival_time=data.arrival_time,
        remark=data.remark,
        submitter=data.submitter,
    )

    matcher = ThreeWayMatcher()
    result = matcher.match(project_id, data.part_code, data.arrival_qty)
    matcher.apply_match(project_id, data.part_code, record_id, result)

    return {
        "record_id": record_id,
        "match_result": result,
    }


@router.get("/{project_id}/records")
async def list_arrival_records(project_id: int, limit: int = Query(50, ge=1, le=200)):
    """获取项目的到件记录列表"""
    records = get_arrival_records(project_id, limit)
    return {"records": records, "total": len(records)}


@router.get("/{project_id}/status")
async def get_arrival_status(project_id: int):
    """获取项目零件线边到货状态汇总"""
    result = get_project_arrival_status(project_id)
    return result