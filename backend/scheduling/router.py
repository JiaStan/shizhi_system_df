# -*- coding: utf-8 -*-
"""
BFWS 排程模块
Phase 3 实现：BFWS + CP-SAT 求解 + 甘特图
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
def ping():
    return {"message": "scheduling module ready"}