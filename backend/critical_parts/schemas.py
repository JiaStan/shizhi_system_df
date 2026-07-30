from pydantic import BaseModel, Field
from typing import Optional, List


class PartScoreInput(BaseModel):
    part_code: str = Field(..., description="零件号")
    assembly_score: int = Field(0, ge=0, le=30, description="装配顺序优先级 0-30")
    size_score: int = Field(0, ge=0, le=20, description="零件大小/体量 0-20")
    disposal_score: int = Field(0, ge=0, le=15, description="报废处理难度 0-15")
    safety_score: int = Field(0, ge=0, le=15, description="安全相关性 0-15")
    value_score: int = Field(0, ge=0, le=10, description="高价值零件 0-10")
    torque_score: int = Field(0, ge=0, le=10, description="关重力矩 0-10")


class PartScoreResult(BaseModel):
    part_code: str
    part_name: Optional[str]
    assembly_score: int = Field(..., description="装配顺序优先级")
    size_score: int = Field(..., description="零件大小/体量")
    disposal_score: int = Field(..., description="报废处理难度")
    safety_score: int = Field(..., description="安全相关性")
    value_score: int = Field(..., description="高价值零件")
    torque_score: int = Field(..., description="关重力矩")
    critical_score: int = Field(..., description="总分 0-100")
    critical_level: str = Field(..., description="red | yellow | green")
    is_critical: bool


class BatchScoreRequest(BaseModel):
    project_id: int
    parts: List[PartScoreInput]


class ScoreSummary(BaseModel):
    total_parts: int
    red_count: int = Field(0, description="关键件")
    yellow_count: int = Field(0, description="一般件")
    green_count: int = Field(0, description="次要件")
    parts: List[PartScoreResult] = Field(default_factory=list)
