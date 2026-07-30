from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ArrivalSubmit(BaseModel):
    part_code: str = Field(..., min_length=1, max_length=200, description="零件号")
    arrival_qty: int = Field(..., gt=0, description="到货数量，必须大于0")
    arrival_time: str = Field(..., description="到货时间，格式: YYYY-MM-DD HH:mm")
    remark: Optional[str] = Field(None, max_length=500, description="备注")
    submitter: Optional[str] = Field(None, max_length=100, description="提交人")


class ArrivalRecord(BaseModel):
    id: int
    project_id: int
    part_code: str
    arrival_qty: int
    arrival_time: datetime
    remark: Optional[str]
    submitter: Optional[str]
    matched_status: str
    created_at: datetime


class MatchResult(BaseModel):
    status: str = Field(..., description="matched | partial | unmatched")
    message: str
    detail: dict = Field(default_factory=dict)


class PartLineSideStatus(BaseModel):
    part_code: str
    part_name: Optional[str]
    demand_qty: int
    warehouse_qty: int
    line_side_qty: int
    line_side_status: str


class ProjectArrivalStatus(BaseModel):
    total_parts: int
    pending_count: int
    partial_count: int
    matched_count: int
    parts: List[PartLineSideStatus]