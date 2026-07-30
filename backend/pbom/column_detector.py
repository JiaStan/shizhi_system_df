# -*- coding: utf-8 -*-
"""
三层递进配置列检测器（基于模板学习）
Layer 1: 规则引擎（固定列排除 + 配置列特征匹配）
Layer 2: 数值统计验证
Layer 3: 用户确认兜底

模板学习结论：
- 固定列：序号、线别、安装工序、零件号、零件名称、需求量/总消耗、力矩、关重标识、备注
- 配置列：M\d+ 或 M\d+\.\d+ 模式（如 M101, M101.1），连续出现，全为整数
- 配置列与固定列的区分：配置列全为整数类型，固定列中只有序号/需求量是整数
"""

import re
from typing import List, Dict, Optional
import pandas as pd
from backend.logger import get_logger
from backend.pbom.excel_parser import PBOMExcelParser

logger = get_logger('pbom.detector')

# 固定列（非配置列）识别模式
FIXED_COLUMN_PATTERNS = [
    r'^序号$|^行号$|^编号$|^索引$|^id$|^idx$|^no$|^No\.$',
    r'线别|产线|线体|生产线|车间',
    r'工序|安装工序|工位|工步|工艺|装配工序',
    r'零件号|物料号|零件编码|物料编码|MATTER_CODE|part_code|part_no',
    r'零件名|零件名称|物料名称|名称|MATTER_NAME|part_name',
    r'总消耗|总需求|需求量|需求数量|数量|总成数量|demand|qty_required',
    r'力矩|扭矩|Nm|扭力|力矩及范围',
    r'关重|关键|重要|标识|标★|关键力矩|关重力矩',
    r'备注|说明|注释|remark|note|memo|描述',
    r'规格|型号|图号|单位',
    r'供应商|厂家|品牌',
    r'自检|质量|检验|检测|追溯',
    r'范围|区间|从|到|min|max',
    r'等级|类别|类型|分组|级别',
    r'Unnamed',  # pandas 未命名列
]

# 配置列特征模式（基于模板学习）
CONFIG_COL_PATTERNS = [
    r'^M\d+$',           # M101, M102
    r'^M\d+\.\d+$',      # M101.1, M101.2
    r'^配置',             # 配置列, 配置列.1 (模板占位)
    r'^车型',             # 车型A, 车型B
    r'^[A-Z]\d{2,}$',    # E70, G35 等车型代号
    r'^[A-Z]+_\d+$',     # ENG_01, BOD_01
]

# 需求量列关键词（用于识别需求量列，与配置列区分）
DEMAND_KEYWORDS = ['总消耗', '总需求', '需求量', '需求数量', '总成数量', 'demand', 'QTY', 'qty_required']


class ThreeLayerColumnDetector:
    """三层递进配置列检测器（基于模板学习）"""

    def __init__(self, parser: PBOMExcelParser):
        self.parser = parser
        self.df = parser.df

    def _is_fixed_column(self, col_name: str) -> bool:
        """判断是否为固定列（非配置列）"""
        col_str = str(col_name).strip()
        for pattern in FIXED_COLUMN_PATTERNS:
            if re.search(pattern, col_str, re.I):
                return True
        return False

    def _is_demand_column(self, col_name: str) -> bool:
        """判断是否为需求量列"""
        col_str = str(col_name).strip()
        for kw in DEMAND_KEYWORDS:
            if kw in col_str:
                return True
        return False

    def _match_config_pattern(self, col_name: str) -> float:
        """匹配配置列特征模式，返回置信度增量"""
        col_str = str(col_name).strip()
        for pattern in CONFIG_COL_PATTERNS:
            if re.match(pattern, col_str, re.I):
                return 0.4  # 匹配到配置列模式，高置信度
        return 0.0

    def _is_numeric_column(self, col_name: str) -> bool:
        """判断列是否为数值类型"""
        if col_name not in self.df.columns:
            return False
        col_data = self.df[col_name].dropna()
        if len(col_data) == 0:
            return False
        # 尝试转换为数值
        numeric = pd.to_numeric(col_data, errors='coerce')
        # 如果有超过 80% 的值可以转为数值，则认为是数值列
        return (numeric.notna().sum() / len(col_data)) >= 0.8

    def _get_column_stats(self, col_name: str) -> Dict:
        """获取列统计信息"""
        if col_name not in self.df.columns:
            return {}
        col_data = self.df[col_name].dropna()
        if len(col_data) == 0:
            return {"non_empty_count": 0, "non_empty_ratio": 0,
                    "unique_count": 0, "is_numeric": False,
                    "min_value": 0, "max_value": 0, "mean_value": 0}

        numeric = pd.to_numeric(col_data, errors='coerce')
        is_numeric = (numeric.notna().sum() / len(col_data)) >= 0.8
        unique_count = col_data.nunique()

        stats = {
            "non_empty_count": len(col_data),
            "non_empty_ratio": round(len(col_data) / len(self.df), 2),
            "unique_count": int(unique_count),
            "is_numeric": is_numeric,
        }
        if is_numeric and len(numeric.dropna()) > 0:
            n = numeric.dropna()
            stats["min_value"] = float(n.min())
            stats["max_value"] = float(n.max())
            stats["mean_value"] = round(float(n.mean()), 2)
        else:
            stats["min_value"] = 0
            stats["max_value"] = 0
            stats["mean_value"] = 0
        return stats

    def layer1_rule_based(self, headers: List[str]) -> List[Dict]:
        """
        第一层：规则引擎
        1. 排除已知固定列
        2. 排除需求量列
        3. 匹配配置列特征模式
        4. 数值列加分
        5. 相邻的非固定数值列可能是配置列组
        """
        required_info = self.parser.get_required_column_info()
        candidates = []

        # 先标记每列的类型
        col_types = []
        for col in headers:
            col_str = str(col).strip()
            is_fixed = self._is_fixed_column(col_str)
            is_demand = self._is_demand_column(col_str)
            is_numeric = self._is_numeric_column(col_str)
            col_types.append({
                "col": col_str,
                "is_fixed": is_fixed,
                "is_demand": is_demand,
                "is_numeric": is_numeric,
            })

        # 找到配置列候选
        for i, ct in enumerate(col_types):
            col_str = ct["col"]

            # 跳过必填列（零件号、零件名称、需求量）
            if col_str == required_info.get("part_code_col"):
                continue
            if col_str == required_info.get("part_name_col"):
                continue
            if col_str == required_info.get("demand_col"):
                continue

            # 跳过固定列
            if ct["is_fixed"]:
                continue

            # 跳过需求量列
            if ct["is_demand"]:
                continue

            # 计算置信度
            confidence = 0.3  # 基础置信度（非固定列，非需求量列）

            # 匹配配置列特征模式加分
            pattern_bonus = self._match_config_pattern(col_str)
            confidence += pattern_bonus

            # 数值列加分
            if ct["is_numeric"]:
                confidence += 0.25

            # 获取统计信息
            stats = self._get_column_stats(col_str)

            # 非空比例太低排除
            if stats.get("non_empty_ratio", 0) < 0.05:
                continue

            # 如果数值列，值的变化范围太大（>1000）且唯一值太多，可能是数据列而非配置列
            if ct["is_numeric"]:
                max_val = stats.get("max_value", 0)
                unique_count = stats.get("unique_count", 0)
                if max_val > 1000 and unique_count > len(self.df) * 0.5:
                    confidence -= 0.2

            # 如果列名太长（>30字符），可能不是配置列
            if len(col_str) > 30:
                confidence -= 0.15

            candidates.append({
                "column": col_str,
                "confidence": round(min(confidence, 1.0), 2),
                "stats": stats,
                "is_numeric": ct["is_numeric"],
            })

        # 追加：相邻数值列加分（配置列通常连续出现）
        for i in range(len(candidates)):
            if i > 0 and candidates[i]["is_numeric"] and candidates[i-1]["is_numeric"]:
                candidates[i]["confidence"] = round(min(candidates[i]["confidence"] + 0.1, 1.0), 2)
            if i < len(candidates) - 1 and candidates[i]["is_numeric"] and candidates[i+1]["is_numeric"]:
                candidates[i]["confidence"] = round(min(candidates[i]["confidence"] + 0.1, 1.0), 2)

        # 按置信度降序排序
        candidates.sort(key=lambda x: x["confidence"], reverse=True)
        logger.info(f"Layer 1 规则识别出 {len(candidates)} 个候选配置列")
        return candidates

    def detect(self, headers: List[str]) -> Dict:
        """完整检测流程"""
        candidates = self.layer1_rule_based(headers)
        need_confirm = any(c["confidence"] < 0.6 for c in candidates)
        return {
            "need_confirm": need_confirm,
            "candidates": candidates,
        }

    def detect_with_confirm(self, headers: List[str], confirmed: List[str]) -> List[Dict]:
        """检测后应用用户确认"""
        candidates = self.layer1_rule_based(headers)
        result = []
        for cand in candidates:
            if cand["column"] in confirmed:
                cand["confirmed"] = True
                result.append(cand)
        logger.info(f"用户确认，最终选中 {len(result)} 个配置列")
        return result
