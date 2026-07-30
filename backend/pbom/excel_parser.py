# -*- coding: utf-8 -*-
"""
PBOM Excel 解析器
读取 Excel 文件，获取表头和数据
"""

import pandas as pd
from typing import Dict, List, Tuple
from backend.logger import get_logger

logger = get_logger('pbom.parser')


class PBOMExcelParser:
    """PBOM Excel解析器"""

    REQUIRED_COLUMNS = ["零件号", "物料编号", "零件名称", "名称", "总消耗", "需求量"]

    def __init__(self, filepath: str):
        self.filepath = filepath
        self.df = None
        self.headers = []

    def read_excel(self) -> Tuple[pd.DataFrame, List[str]]:
        """读取 Excel 并获取数据和表头"""
        try:
            if self.filepath.endswith('.xlsx'):
                df = pd.read_excel(self.filepath, engine='openpyxl')
            else:
                df = pd.read_excel(self.filepath, engine='xlrd')

            headers = list(df.columns)
            self.df = df
            self.headers = headers
            return df, headers
        except Exception as e:
            logger.error(f"读取 Excel 失败: {e}")
            raise e

    def get_required_column_info(self) -> Dict:
        """识别必填列（零件号、需求量）"""
        headers = self.headers

        result = {
            "part_code_col": None,
            "part_name_col": None,
            "demand_col": None,
        }

        # 零件号匹配规则
        part_code_keywords = ["零件号", "物料号", "零件编码", "物料编码", "MATTER_CODE"]
        for col in headers:
            col_lower = str(col).lower()
            for keyword in part_code_keywords:
                if keyword in str(col):
                    result["part_code_col"] = col
                    break
            if result["part_code_col"]:
                break

        # 零件名称匹配规则
        part_name_keywords = ["零件名", "名称", "零件名称", "物料名称", "MATTER_NAME"]
        for col in headers:
            col_lower = str(col).lower()
            for keyword in part_name_keywords:
                if keyword in str(col):
                    result["part_name_col"] = col
                    break
            if result["part_name_col"]:
                break

        # 需求量匹配规则
        demand_keywords = ["总消耗", "需求", "需求量", "总需求", "数量", "QTY"]
        for col in headers:
            col_lower = str(col).lower()
            for keyword in demand_keywords:
                if keyword in str(col):
                    result["demand_col"] = col
                    break
            if result["demand_col"]:
                break

        return result

    def check_required_columns(self) -> Dict:
        """检查必填列是否存在"""
        info = self.get_required_column_info()
        missing = []
        if not info["part_code_col"]:
            missing.append("零件号")
        if not info["part_name_col"]:
            missing.append("零件名称")
        # 需求量列为可选，缺失时 demand 默认为 0
        if not info["demand_col"]:
            logger.info("未检测到需求量列，需求量将默认为 0（配置列中有各车型需求数量）")
        return {
            "found": info,
            "missing": missing,
            "ok": len(missing) == 0,
        }

    def get_column_stats(self, column: str) -> Dict:
        """获取某列的统计信息，用于配置列识别"""
        if column not in self.df.columns:
            return {}

        col_data = self.df[column].dropna()
        if len(col_data) == 0:
            return {
                "non_empty_count": 0,
                "non_empty_ratio": 0,
                "min_value": 0,
                "max_value": 0,
                "mean_value": 0,
            }

        numeric = pd.to_numeric(col_data, errors='coerce').dropna()
        return {
            "non_empty_count": len(col_data),
            "non_empty_ratio": round(len(col_data) / len(self.df), 2),
            "min_value": float(numeric.min()) if len(numeric) > 0 else 0,
            "max_value": float(numeric.max()) if len(numeric) > 0 else 0,
            "mean_value": round(float(numeric.mean()), 2) if len(numeric) > 0 else 0,
        }

    def extract_parts(self, part_code_col: str, part_name_col: str, demand_col: str = None) -> List[Dict]:
        """提取零件数据（基础方法，仅使用单一需求量列）"""
        parts = []
        for idx, row in self.df.iterrows():
            part_code = str(row[part_code_col]).strip() if pd.notna(row[part_code_col]) else ""
            part_name = str(row[part_name_col]).strip() if pd.notna(row[part_name_col]) else ""
            if not part_code:
                continue

            if demand_col and demand_col in self.df.columns:
                try:
                    demand = int(float(row[demand_col])) if pd.notna(row[demand_col]) else 0
                except:
                    demand = 0
            else:
                demand = 0

            parts.append({
                "part_code": part_code,
                "part_name": part_name,
                "demand_quantity": demand,
            })
        return parts

    def extract_parts_with_config_sum(
        self, part_code_col: str, part_name_col: str, config_columns: List[str]
    ) -> List[Dict]:
        """提取零件数据，需求量 = 所有配置列同行数值之和，相同零件号自动合并"""
        from collections import OrderedDict

        merged = OrderedDict()

        for _idx, row in self.df.iterrows():
            part_code = str(row[part_code_col]).strip() if pd.notna(row[part_code_col]) else ""
            part_name = str(row[part_name_col]).strip() if pd.notna(row[part_name_col]) else ""
            if not part_code:
                continue

            total_demand = 0
            for col in config_columns:
                if col in self.df.columns:
                    try:
                        val = int(float(row[col])) if pd.notna(row[col]) else 0
                    except (ValueError, TypeError):
                        val = 0
                    total_demand += val

            if part_code in merged:
                merged[part_code]["demand_quantity"] += total_demand
            else:
                merged[part_code] = {
                    "part_code": part_code,
                    "part_name": part_name,
                    "demand_quantity": total_demand,
                }

        parts = list(merged.values())
        logger.info(
            f"配置列求和提取零件: 原始行数={len(self.df)}, "
            f"合并后零件数={len(parts)}, 配置列数={len(config_columns)}"
        )
        return parts

    def extract_config_qty(self, part_code_col: str, config_col: str) -> Dict[str, int]:
        """提取某配置列中每个零件的需求量（相同零件号合并求和）"""
        from collections import defaultdict

        result = defaultdict(int)
        for _idx, row in self.df.iterrows():
            part_code = str(row[part_code_col]).strip() if pd.notna(row[part_code_col]) else ""
            if not part_code:
                continue
            try:
                qty = int(float(row[config_col])) if pd.notna(row[config_col]) else 0
            except (ValueError, TypeError):
                qty = 0
            result[part_code] += qty
        return dict(result)