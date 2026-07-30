# -*- coding: utf-8 -*-
"""
获取飞书表格的所有sheet列表
"""

import requests
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.system.credentials import feishu_login, get_feishu_token
from backend.config import settings

SPREADSHEET_TOKEN = "A5t0s2M4OhNwyUtLHkCcvpCRnZc"


def list_sheets(token: str):
    """获取表格所有sheet列表"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    url = f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{SPREADSHEET_TOKEN}/sheets"

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        result = resp.json()

        if result.get("code") != 0:
            print(f"API请求失败: code={result.get('code')}, msg={result.get('msg')}")
            return None

        data = result.get("data", {})
        sheets = data.get("sheets", [])

        print(f"找到 {len(sheets)} 个sheet:")
        for sheet in sheets:
            print(f"  ID: {sheet.get('sheetId')}, 名称: {sheet.get('title')}")

        return sheets

    except Exception as e:
        print(f"获取sheet列表失败: {str(e)}")
        return None


def probe_sheet_with_v2(token: str, sheet_id: str):
    """使用v2 API探测表格"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    url = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{SPREADSHEET_TOKEN}/values/{sheet_id}!A1:ZZ5"

    try:
        params = {
            "valueRenderOption": "ToString",
            "dateTimeRenderOption": "FormattedString"
        }
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        result = resp.json()

        if result.get("code") != 0:
            print(f"API请求失败: code={result.get('code')}, msg={result.get('msg')}")
            return None

        data = result.get("data", {})
        value_range = data.get("valueRange", {})
        values = value_range.get("values", [])

        if not values:
            print("表格为空")
            return None

        print("=" * 80)
        print("飞书表格探测结果 (新表格)")
        print("=" * 80)
        print(f"Spreadsheet Token: {SPREADSHEET_TOKEN}")
        print(f"Sheet ID: {sheet_id}")
        print(f"总列数: {len(values[0])}")
        print(f"总行数: {len(values)}")
        print()

        headers_row = values[0]
        print("列头信息 (第一行):")
        for idx, header in enumerate(headers_row):
            print(f"  列{idx}: '{header}'")
        print()

        print("前3行数据:")
        for row_idx, row in enumerate(values[1:4], start=2):
            print(f"  第{row_idx}行: {row}")

        return headers_row

    except Exception as e:
        print(f"探测失败: {str(e)}")
        return None


def main():
    print("飞书表格探测脚本 - 获取sheet列表")
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

    print("\n正在获取sheet列表...")
    sheets = list_sheets(token)

    if sheets:
        print("\n正在探测第一个sheet...")
        probe_sheet_with_v2(token, sheets[0]["sheetId"])


if __name__ == '__main__':
    main()
