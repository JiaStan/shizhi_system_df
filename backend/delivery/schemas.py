from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MergeRequest(BaseModel):
    project_id: int = Field(..., description="项目ID")
    days: int = Field(7, ge=1, le=365, description="统计最近N天数据")


class MergeRecord(BaseModel):
    merge_key: str = Field(..., description="合并键: 项目号_零件号_数量_时间_单据号")
    pro_code: str
    matter_code: str
    matter_name: Optional[str]
    order_num: int
    in_num: int
    receive_time: Optional[datetime]
    sources: List[str] = Field(default_factory=list, description="数据来源列表")
    source_count: int = Field(0, description="数据来源数量")
    is_duplicate: bool = Field(False, description="是否多源重复")
    is_anomaly: bool = Field(False, description="是否异常（数量不一致）")


class MergeResult(BaseModel):
    total_raw: int = Field(0, description="原始记录数")
    merged_count: int = Field(0, description="合并后记录数")
    duplicate_count: int = Field(0, description="多源重复数")
    anomaly_count: int = Field(0, description="异常记录数")
    records: List[MergeRecord] = Field(default_factory=list)