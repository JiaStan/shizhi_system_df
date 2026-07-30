# -*- coding: utf-8 -*-
"""
飞书表格探测脚本
获取表格列头和前几行数据，用于构建字段映射
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import requests
from backend.system.credentials import feishu_login, get_feishu_token
from backend.config import settings

SPREADSHEET_TOKEN = "A5t0s2M4OhNwyUtLHkCcvpCRnZc"
SHEET_ID = "3Zbzwa"

FEISHU_SHEETS_URL = f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{SPREADSHEET_TOKEN}/sheets/{SHEET_ID}/values"


def probe_sheet(token: str):
    """探测飞书表格结构"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        params = {"range": "1:5"}
        resp = requests.get(FEISHU_SHEETS_URL, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        result = resp.json()

        if result.get("code") != 0:
            print(f"API请求失败: code={result.get('code')}, msg={result.get('msg')}")
            return None

        data = result.get("data", {})
        values = data.get("valueRange", {}).get("values", [])

        if not values:
            print("表格为空")
            return None

        print("=" * 60)
        print("飞书表格探测结果")
        print("=" * 60)
        print(f"总列数: {len(values[0])}")
        print(f"总行数: {len(values)}")
        print()

        headers_row = values[0]
        print("列头信息:")
        for idx, header in enumerate(headers_row):
            print(f"  列{idx+1}: '{header}'")
        print()

        print("前3行数据:")
        for row_idx, row in enumerate(values[1:4], start=2):
            print(f"  第{row_idx}行: {row}")

        return headers_row

    except Exception as e:
        print(f"探测失败: {str(e)}")
        return None


def main():
    print("飞书表格探测脚本")
    print("-" * 40)

    app_id = settings.FEISHU_APP_ID
    app_secret = settings.FEISHU_APP_SECRET

    if not app_id or not app_secret:
        print("请先在 backend/.env 中配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET")
        print()
        app_id = input("请输入飞书 App ID: ").strip()
        app_secret = input("请输入飞书 App Secret: ").strip()

    if not app_id or not app_secret:
        print("错误: 缺少飞书凭证")
        return

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

    print("\n正在探测表格...")
    headers = probe_sheet(token)

    if headers:
        print("\n" + "=" * 60)
        print("字段映射建议:")
        print("=" * 60)
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
        }
        for idx, header in enumerate(headers):
            mapped = field_map.get(header, f"COL_{idx+1}")
            print(f"  '{header}' -> {mapped}")


if __name__ == '__main__':
    main()
