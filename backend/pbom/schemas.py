# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional, List, Dict


class UploadResponse(BaseModel):
    filename: str
    size: int
    path: str


class ColumnCandidate(BaseModel):
    column: str
    confidence: float
    stats: dict
    is_numeric: bool = False


class DetectColumnsResponse(BaseModel):
    need_confirm: bool
    candidates: List[ColumnCandidate]


class ParsePBOMRequest(BaseModel):
    project_id: int
    file_path: str
    confirmed_columns: List[str]
    display_names: Optional[Dict[str, str]] = None


class ParseResult(BaseModel):
    project_id: int
    parts_count: int
    config_count: int
    message: str


class MatchRequest(BaseModel):
    project_id: int


class MatchResult(BaseModel):
    project_id: int
    parts_matched: int
    delivery_rate: float
    total_demand: int
    total_received: int
    missing_parts: int