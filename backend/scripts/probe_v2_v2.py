# -*- coding: utf-8 -*-
"""
使用v2 API探测飞书表格 - 关注第二行表头
"""

import requests
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.system.credentials import feishu_login, get_feishu_token
from backend.config import settings

SPREADSHEET_TOKEN = "A5t0s2M4OhNwyUtLHkCcvpCRnZc"


def probe_with_v2(token: str, sheet_id: str):
    """使用v2 API探测表格"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    FEISHU_SHEETS_BASE_URL = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{SPREADSHEET_TOKEN}/values"
    sheet_range = f"{sheet_id}!A1:ZZ10"

    try:
        params = {
            "valueRenderOption": "ToString",
            "dateTimeRenderOption": "FormattedString"
        }
        resp = requests.get(f"{FEISHU_SHEETS_BASE_URL}/{sheet_range}", headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        result = resp.json()

        if result.get("code") != 0:
            print(f"API请求失败: code={result.get('code')}, msg={result.get('msg')}")
            return None

        data = result.get("data", {})
        value_range = data.get("valueRange", {})
        values = value_range.get("values", [])

        if not values or len(values) < 2:
            print("表格为空或只有一行")
            return None

        print("=" * 80)
        print("飞书表格探测结果 (v2 API)")
        print("=" * 80)
        print(f"Spreadsheet Token: {SPREADSHEET_TOKEN}")
        print(f"Sheet ID: {sheet_id}")
        print(f"总行数: {len(values)}")
        print()

        print("=" * 80)
        print("第二行表头信息 (索引1):")
        print("=" * 80)
        headers_row = values[1] if len(values) > 1 else []
        print(f"第二行列数: {len(headers_row)}")
        print()

        non_empty_cols = []
        for idx, header in enumerate(headers_row):
            if header and str(header).strip():
                non_empty_cols.append((idx, header))

        print(f"有值的列: {len(non_empty_cols)} 个")
        print("-" * 60)
        for idx, header in non_empty_cols:
            print(f"  列{idx}: '{header}'")
        print()

        print("=" * 80)
        print("第三行数据 (索引2):")
        print("=" * 80)
        data_row = values[2] if len(values) > 2 else []
        for idx, header in non_empty_cols:
            value = data_row[idx] if idx < len(data_row) else ""
            print(f"  列{idx} [{header}]: '{value}'")

        return non_empty_cols

    except Exception as e:
        print(f"探测失败: {str(e)}")
        return None


def main():
    print("飞书表格探测脚本 - v2 API")
    print("-" * 40)

    app_id = settings.FEISHU_APP_ID
    app_secret = settings.FEISHU_APP_SECRET

    print("\n正在配置飞书凭证...")
    login_result = feishu_login(app_id, app_secret)
    if not login_result["success"]:
        print(f"配置失败: {login_result.get('error', login_result.get('message'))}")
        return
    print(f"配置成功! Token已获取")

    token = get_feishu_token()
    if not token:
        print("获取Token失败")
        return

    print("\n正在探测新表格 (0RJlIN)...")
    headers = probe_with_v2(token, "0RJlIN")

    if headers:
        print("\n" + "=" * 80)
        print("字段映射建议:")
        print("=" * 80)
        field_map = {
            "送货单号": "DELIVERY_CODE",
            "试制申请单号": "APPLY_CODE",
            "项目编号": "PRO_CODE",
            "项目名称": "PRO_NAME",
            "零件编码": "MATTER_CODE",
            "零件名称": "MATTER_NAME",
            "设计师": "STYLIST_USERNAME",
            "专业师": "ZYS_USERNAME",
            "单据状态": "STATE",
            "来源订单号": "FROM_ORDER_CODE",
            "订单数量": "ORDER_NUM",
            "发货数量": "SEND_NUM",
            "收货数量": "RECIVE_NUM",
            "入库数量": "IN_NUM",
            "不合格数量": "CANT_NUM",
            "发货仓库": "SEND_WH_NAME",
            "收货仓库": "WH_NAME",
            "收货人": "RECIVE_USERNAME",
            "收货时间": "RECIVE_TIME",
            "库区/货架号": "WAREHOUSE",
            "调度员": "PROFESSIONAL",
            "订单号": "ORDER_CODE",
            "申请单号": "APPLY_CODE",
            "数量": "ORDER_NUM",
            "已收数量": "RECIVE_NUM",
            "收货日期": "RECIVE_TIME",
            "专业": "PROFESSIONAL",
            "货架号": "WAREHOUSE",
            "库区": "WAREHOUSE",
            "到货数量": "RECIVE_NUM",
            "已到货数量": "RECIVE_NUM",
        }
        for idx, header in headers:
            mapped = field_map.get(header, f"COL_{idx}")
            print(f"  列{idx}: '{header}' -> {mapped}")


if __name__ == '__main__':
    main()
