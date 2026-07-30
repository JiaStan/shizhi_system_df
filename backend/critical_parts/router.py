# -*- coding: utf-8 -*-
"""
关键件评分模块
Phase 2 实现：四维加权评分 + LLM 评估
"""

from fastapi import APIRouter, HTTPException
from backend.database import query_one

from .schemas import BatchScoreRequest
from .scoring import CriticalScorer
from .llm_evaluator import LLMEvaluator
from .crud import save_critical_score, get_critical_scores, get_critical_summary

router = APIRouter()


@router.get("/ping")
def ping():
    return {"message": "critical_parts module ready"}


@router.post("/{project_id}/score")
def score_project(project_id: int):
    """对项目所有零件进行四维关键件评分"""
    project = query_one("SELECT id FROM projects WHERE id = %s", (project_id,))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    scorer = CriticalScorer()
    result = scorer.score_project_parts(project_id)

    for part in result["parts"]:
        save_critical_score(
            project_id=project_id,
            part_code=part["part_code"],
            assembly_score=part["assembly_score"],
            size_score=part["size_score"],
            disposal_score=part["disposal_score"],
            safety_score=part["safety_score"],
            value_score=part["value_score"],
            torque_score=part["torque_score"],
            critical_score=part["critical_score"],
            is_critical=part["is_critical"],
            critical_level=part["critical_level"],
            reason=part.get("reason", ""),
        )

    return result


@router.get("/{project_id}/scores")
def list_scores(project_id: int):
    """获取项目的关键件评分列表"""
    project = query_one("SELECT id FROM projects WHERE id = %s", (project_id,))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    scores = get_critical_scores(project_id)
    summary = get_critical_summary(project_id)
    return {"scores": scores, "summary": summary}


@router.get("/{project_id}/summary")
def score_summary(project_id: int):
    """获取关键件评分摘要"""
    project = query_one("SELECT id FROM projects WHERE id = %s", (project_id,))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    return get_critical_summary(project_id)


@router.post("/{project_id}/llm-evaluate/{part_code}")
def llm_evaluate(project_id: int, part_code: str):
    """LLM 智能评估单个零件"""
    project = query_one("SELECT id FROM projects WHERE id = %s", (project_id,))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    part = query_one(
        "SELECT part_name FROM project_parts WHERE project_id = %s AND part_code = %s",
        (project_id, part_code),
    )
    if not part:
        raise HTTPException(status_code=404, detail="零件不存在")

    part_name = part.get("part_name", part_code)

    evaluator = LLMEvaluator()
    if not evaluator.is_available():
        return {"error": "LLM 未配置，请设置 DEEPSEEK_API_KEY"}

    result = evaluator.evaluate(part_name, {"assembly": 15, "size": 10, "disposal": 10, "safety": 10, "value": 5, "torque": 5})
    return {"part_code": part_code, "part_name": part_name, "llm_evaluation": result}