# -*- coding: utf-8 -*-
"""读取飞书共享表的表头信息"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

FEISHU_APP_ID = os.getenv('FEISHU_APP_ID', '')
FEISHU_APP_SECRET = os.getenv('FEISHU_APP_SECRET', '')
SPREADSHEET_TOKEN = "A5t0s2M4OhNwyUtLHkCcvpCRnZc"
SHEET_ID = "3Zbzwa"

def get_feishu_token():
    """获取飞书tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    data = {
        "app_id": FEISHU_APP_ID,
        "app_secret": FEISHU_APP_SECRET
    }
    
    try:
        resp = requests.post(url, json=data, timeout=30)
        resp.raise_for_status()
        result = resp.json()
        
        if result.get("code") == 0:
            return result.get("tenant_access_token")
        else:
            print(f"获取Token失败: {result.get('msg')}")
            return None
    except Exception as e:
        print(f"获取Token异常: {e}")
        return None

def get_sheet_header(token):
    """获取飞书表格的表头信息（前10行）"""
    url = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{SPREADSHEET_TOKEN}/values/{SHEET_ID}!A1:ZZ10"
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    try:
        resp = requests.get(url, headers=headers, params={
            "valueRenderOption": "ToString",
            "dateTimeRenderOption": "FormattedString"
        }, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        
        if result.get("code") == 0:
            data = result.get("data", {})
            value_range = data.get("valueRange", {})
            values = value_range.get("values", [])
            return values
        else:
            print(f"获取表头失败: {result.get('msg')}")
            return []
    except Exception as e:
        print(f"获取表头异常: {e}")
        return []

def get_sheet_columns(token):
    """获取工作表的列信息"""
    url = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{SPREADSHEET_TOKEN}/sheets/{SHEET_ID}"
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        
        if result.get("code") == 0:
            data = result.get("data", {})
            return data
        else:
            print(f"获取工作表信息失败: {result.get('msg')}")
            return {}
    except Exception as e:
        print(f"获取工作表信息异常: {e}")
        return {}

def main():
    print("=" * 60)
    print("飞书共享表表头探测工具")
    print("=" * 60)
    print()
    
    print(f"表格Token: {SPREADSHEET_TOKEN}")
    print(f"工作表ID: {SHEET_ID}")
    print()
    
    token = get_feishu_token()
    if not token:
        print("❌ 无法获取飞书Token，请检查.env配置")
        return
    
    print("✅ 获取飞书Token成功")
    print()
    
    print("正在获取工作表信息...")
    sheet_info = get_sheet_columns(token)
    
    if sheet_info:
        print(f"工作表名称: {sheet_info.get('title', '未知')}")
        print(f"行数: {sheet_info.get('rowCount', '未知')}")
        print(f"列数: {sheet_info.get('columnCount', '未知')}")
        print()
    
    print("正在获取前10行数据...")
    rows = get_sheet_header(token)
    
    if rows:
        print("=" * 80)
        print("飞书共享表前10行数据（仓库工联单到货登记）")
        print("=" * 80)
        print()
        
        max_cols = max(len(row) for row in rows) if rows else 0
        
        for row_idx, row in enumerate(rows):
            print(f"--- 第 {row_idx + 1} 行 ---")
            for col_idx in range(max_cols):
                col_letter = chr(ord('A') + col_idx)
                value = row[col_idx] if col_idx < len(row) else None
                if value is not None and str(value).strip():
                    print(f"  [{col_letter}] {col_idx:2d}: {repr(value)}")
            print()
        
        print("=" * 80)
        print(f"共 {len(rows)} 行，最大列数: {max_cols}")
        print("=" * 80)
        
        print()
        print("请根据以上字段，选择需要映射到feishu_detail表的字段：")
        print("当前feishu_detail表字段（参照delivery_detail）：")
        print()
        print("  ID, DELIVERY_CODE, APPLY_CODE, PRO_CODE, PRO_NAME, MATTER_CODE,")
        print("  MATTER_NAME, MATTER_SPEC, RECIVE_QTY, RECIVE_TIME, DELIVERY_TIME,")
        print("  WAREHOUSE, DOC_STATE, PROFESSIONAL, CREATED_AT, UPDATED_AT")
        print()
        print("请告诉我每个飞书表头对应的数据库字段，例如：")
        print("  A列(单号) -> DELIVERY_CODE")
        print("  B列(申请单号) -> APPLY_CODE")
        print("  ...")
    else:
        print("❌ 无法获取表头信息")

if __name__ == "__main__":
    main()