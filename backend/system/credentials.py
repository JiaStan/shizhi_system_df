# -*- coding: utf-8 -*-
"""
系统凭证管理
支持多数据源凭证的增删改查 + 自动登录获取 token
"""

import json
import re
import requests
import time
from backend.database import query_all, query_one, execute, execute_last_id
from backend.logger import get_logger
from backend.config import settings

logger = get_logger('system.credentials')

# di360 登录接口
DI360_LOGIN_URL = "https://di360.dfmc.com.cn:24664/api/auth/login"

# 飞书 API 接口
FEISHU_TENANT_TOKEN_URL = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
FEISHU_SHEETS_API_URL = "https://open.feishu.cn/open-apis/sheets/v3/spreadsheets"


def spider_login(username: str, password: str, source: str = "wms", env: str = "prod"):
    """模拟登录 di360 获取 JWT Token"""
    try:
        requests.packages.urllib3.disable_warnings()
        resp = requests.post(
            DI360_LOGIN_URL,
            json={"username": username, "password": password},
            timeout=30,
            verify=False,
        )
        if resp.status_code == 200:
            result = resp.json()
            code = result.get("code", 500)
            if code == 200:
                # 提取 token
                new_auth = (
                    result.get("token")
                    or result.get("authorization")
                    or result.get("access_token")
                    or result.get("tokenHead")
                    or ""
                )
                if not new_auth:
                    result_data = result.get("data") or {}
                    if isinstance(result_data, dict):
                        new_auth = (
                            result_data.get("token")
                            or result_data.get("authorization")
                            or result_data.get("access_token")
                            or result_data.get("tokenHead")
                            or ""
                        )
                if not new_auth:
                    result_str = str(result)
                    match = re.search(r'(?:"token"\s*:\s*"([^"]+))', result_str)
                    if match:
                        new_auth = match.group(1)

                new_cookie = "; ".join(
                    [f"{k}={v}" for k, v in resp.cookies.get_dict().items()]
                )

                if new_auth or new_cookie:
                    # 将旧凭证标记为失效（同一 source）
                    execute("UPDATE spider_credentials SET is_active = 0 WHERE source = %s AND is_active = 1", (source,))
                    # 确定显示名称
                    display_name = {
                        "wms": "di360 WMS 仓库",
                        "feishu": "飞书共享表",
                        "purchase": "采购系统",
                    }.get(source, f"{source} 系统")
                    # 插入新凭证
                    execute_last_id(
                        "INSERT INTO spider_credentials (source, name, config_json, authorization, cookie, username, password, is_active) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, 1)",
                        (source, display_name, "{}", new_auth, new_cookie, username, password),
                    )
                    return {
                        "success": True,
                        "message": "登录成功，凭证已自动更新",
                        "data": {"token": new_auth, "cookie": new_cookie, "source": source},
                    }
                else:
                    data = result.get("data", {})
                    login_msg = data.get("loginMsg", "")
                    logger.warning(f"登录响应无 token: keys={list(result.keys())}, data={result.get('data')}")
                    return {
                        "success": False,
                        "message": f"登录成功但未获取到凭证: {login_msg or '响应中无 token 字段'}",
                        "response": result,
                    }
            else:
                data = result.get("data", {})
                login_msg = data.get("loginMsg", result.get("msg", "未知错误"))
                return {
                    "success": False,
                    "message": f"登录失败: {login_msg}",
                    "code": code,
                }
        else:
            return {
                "success": False,
                "message": f"登录失败，HTTP {resp.status_code}: {resp.text[:200]}",
            }
    except requests.exceptions.ConnectionError:
        # 公司内网无法访问时，仅保存凭证供后续使用
        _save_credentials_db(username, password, source)
        return {
            "success": True,
            "message": "无法连接到登录服务器（需公司内网），凭证信息已保存",
            "note": "连接登录服务器失败，请在连接公司内网后重试",
        }
    except Exception as e:
        return {"success": False, "message": f"登录请求异常: {str(e)}"}


def manual_sync_credentials(source: str, token_type: str = "jwt", token: str = "",
                            authorization: str = "", cookie: str = "",
                            username: str = "", password: str = ""):
    """手动同步凭证（从浏览器复制 JWT Token / Cookie）"""
    # 优先使用 token 字段，其次 authorization
    effective_token = token or authorization
    if effective_token or cookie:
        # 将旧凭证标记为失效
        execute("UPDATE spider_credentials SET is_active = 0 WHERE source = %s AND is_active = 1", (source,))
        # 确定显示名称
        display_name = {
            "wms": "di360 WMS 仓库",
            "feishu": "飞书共享表",
            "purchase": "采购系统",
        }.get(source, f"{source} 系统")
        # 插入新凭证
        execute_last_id(
            "INSERT INTO spider_credentials (source, name, config_json, authorization, cookie, token_type, username, password, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1)",
            (source, display_name, "{}", effective_token, cookie, token_type, username, password),
        )
        return {"success": True, "message": "凭证（Token/Cookie）同步成功",
                "data": {"token": effective_token, "cookie": cookie, "source": source}}
    elif username and password:
        _save_credentials_db(username, password, source)
        return {"success": True, "message": "用户名密码已保存，将尝试自动登录获取 token"}
    else:
        return {"success": False, "message": "请提供 Token 或用户名密码"}


def _save_credentials_db(username: str, password: str, source: str = "wms"):
    """将用户名密码保存到数据库"""
    existing = query_one(
        "SELECT id FROM spider_credentials WHERE source = %s AND username = %s LIMIT 1",
        (source, username),
    )
    if existing:
        execute("UPDATE spider_credentials SET password = %s, is_active = 1 WHERE id = %s",
                (password, existing["id"]))
    else:
        execute("UPDATE spider_credentials SET is_active = 0 WHERE source = %s AND is_active = 1", (source,))
        display_name = {
            "wms": "di360 WMS 仓库",
            "feishu": "飞书共享表",
            "purchase": "采购系统",
        }.get(source, f"{source} 系统")
        execute_last_id(
            "INSERT INTO spider_credentials (source, name, config_json, authorization, cookie, username, password, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, 1)",
            (source, display_name, "{}", "", "", username, password),
        )


def list_credentials():
    """获取所有凭证（按 source 去重，只保留最新一条）"""
    try:
        rows = query_all(
            "SELECT id, source, name, authorization, cookie, "
            "username, is_active, created_at "
            "FROM spider_credentials ORDER BY id DESC"
        )
    except Exception:
        # 如果某些字段不存在，降级查询
        rows = query_all(
            "SELECT id, source, name, is_active, created_at "
            "FROM spider_credentials ORDER BY id DESC"
        )
    # 按 source 去重（保留最新的）
    seen = {}
    result = []
    for row in rows:
        src = row.get("source") or "wms"
        if src not in seen:
            seen[src] = row
            # 尝试取 token 字段（多种命名兼容）
            auth_val = ""
            token_key = None
            for key in ["authorization", "token", "token_value", "cookie", "config_json"]:
                v = row.get(key) or ""
                if isinstance(v, str) and len(v) > 10 and not v.startswith("{"):
                    auth_val = v
                    token_key = key
                    break
                # cookie 也可以用作凭证
                if isinstance(v, str) and key == "cookie" and len(v) > 5:
                    auth_val = v
                    token_key = key
                    break

            token_short = auth_val[:60] + ("..." if len(auth_val) > 60 else "") if auth_val else "—"
            username_val = row.get("username") or ""
            password_val = row.get("password") or ""

            # 真正有凭证的判断：有有效 token，或有用户名+密码
            has_token = bool(auth_val and auth_val.strip() and auth_val != "{}")
            has_login = bool(username_val.strip() and password_val.strip())
            # is_active 从数据库取出，必须同时有实际凭证才算激活
            raw_active = str(row.get("is_active", 0) or 0).strip().lower()
            db_active = raw_active in ("1", "true", "yes")
            effective_active = 1 if (db_active and (has_token or has_login)) else 0

            create_time_val = str(row.get("created_at") or row.get("updated_at") or "")
            # 统一显示为 "Token"，不再显示 "JWT"
            raw_token_type = (row.get("token_type") or "").strip()
            if raw_token_type:
                token_type_val = raw_token_type.replace("JWT", "Token").replace("jwt", "Token")
            elif token_key == "cookie":
                token_type_val = "Cookie"
            else:
                token_type_val = "Token"

            result.append({
                "id": row.get("id"),
                "source": src,
                "name": row.get("name") or {
                    "wms": "di360 WMS 仓库",
                    "feishu": "飞书共享表",
                    "purchase": "采购系统",
                }.get(src, f"{src} 系统"),
                "token_type": token_type_val,
                "token": token_short,
                "token_full": auth_val,
                "username": username_val,
                "is_active": effective_active,
                "create_time": create_time_val,
            })
    return result


def get_credential(source: str):
    """获取指定数据源凭证"""
    return query_one(
        "SELECT * FROM spider_credentials WHERE source = %s", (source,)
    )


def create_or_update(source: str, name: str, config: dict, is_active: int = 1):
    """创建或更新凭证（兼容 V4 和 V5 格式）"""
    config_json = json.dumps(config, ensure_ascii=False)
    existing = get_credential(source)
    if existing:
        execute(
            "UPDATE spider_credentials SET name = %s, config_json = %s, is_active = %s "
            "WHERE source = %s",
            (name, config_json, is_active, source),
        )
    else:
        execute_last_id(
            "INSERT INTO spider_credentials (source, name, config_json, is_active) "
            "VALUES (%s, %s, %s, %s)",
            (source, name, config_json, is_active),
        )
    # 同时更新 V4 兼容字段
    if config.get("authorization"):
        execute("UPDATE spider_credentials SET authorization = %s WHERE source = %s",
                (config["authorization"], source))
    if config.get("cookie"):
        execute("UPDATE spider_credentials SET cookie = %s WHERE source = %s",
                (config["cookie"], source))
    if config.get("username"):
        execute("UPDATE spider_credentials SET username = %s WHERE source = %s",
                (config["username"], source))
    if config.get("password"):
        execute("UPDATE spider_credentials SET password = %s WHERE source = %s",
                (config["password"], source))
    return {"updated": True, "source": source} if existing else {"created": True, "source": source}


def delete_credential(source: str):
    """删除凭证"""
    execute("DELETE FROM spider_credentials WHERE source = %s", (source,))


# =========================================================
# 爬虫同步配置（参照 V4 风格：auto/manual + 增量/全量间隔）
# =========================================================
CRAWLER_CONFIG_KEYS = {
    "crawler_mode": {"type": "string", "default": "auto",
                     "description": "同步模式: auto=自动, manual=手动"},
    "crawler_incremental_interval_minutes": {"type": "int", "default": 30,
                                             "description": "增量同步间隔(分钟)"},
    "crawler_full_interval_hours": {"type": "int", "default": 24,
                                    "description": "全量同步间隔(小时)"},
    "crawler_enabled_sources": {"type": "string", "default": "wms,feishu",
                                "description": "启用的数据源(逗号分隔, 如 wms,feishu)"},
    "crawler_auto_login": {"type": "string", "default": "on",
                           "description": "是否自动登录刷新 token: on/off"},
    "crawler_last_run_at": {"type": "string", "default": "",
                            "description": "最近一次执行时间"},
    "crawler_last_full_run_at": {"type": "string", "default": "",
                                 "description": "最近一次全量执行时间"},
    "crawler_last_status": {"type": "string", "default": "",
                            "description": "最近一次执行状态"},
}


def _param_value_to_native(param_key: str, raw_value: str):
    """把字符串原始值转成 python 类型"""
    cfg = CRAWLER_CONFIG_KEYS.get(param_key)
    if cfg is None:
        return raw_value
    t = cfg["type"]
    if raw_value is None or raw_value == "":
        if t == "int":
            return 0
        if t == "float":
            return 0.0
        return ""
    try:
        if t == "int":
            return int(raw_value)
        if t == "float":
            return float(raw_value)
        return raw_value
    except Exception:
        return raw_value


def get_crawler_config() -> dict:
    """读取爬虫同步配置（带默认值）"""
    rows = query_all(
        "SELECT param_key, param_value FROM system_params "
        "WHERE param_key IN ("
        + ",".join(["%s"] * len(CRAWLER_CONFIG_KEYS))
        + ")",
        tuple(CRAWLER_CONFIG_KEYS.keys()),
    )
    value_map = {row["param_key"]: row["param_value"] for row in rows}

    result = {}
    for key, cfg in CRAWLER_CONFIG_KEYS.items():
        raw = value_map.get(key)
        if raw is None or raw == "":
            result[key] = cfg["default"]
        else:
            result[key] = _param_value_to_native(key, raw)
    # 把启用的数据源拆成列表
    if isinstance(result.get("crawler_enabled_sources"), str):
        sources = [s.strip() for s in result["crawler_enabled_sources"].split(",") if s.strip()]
        result["enabled_sources_list"] = sources
    else:
        result["enabled_sources_list"] = []
    return result


def save_crawler_config(config: dict) -> dict:
    """保存爬虫配置"""
    saved = {}
    for key, cfg in CRAWLER_CONFIG_KEYS.items():
        if key not in config:
            continue
        value = config[key]
        if value is None:
            value = ""
        # 规范化
        if key == "crawler_enabled_sources":
            if isinstance(value, list):
                value = ",".join([str(v).strip() for v in value if str(v).strip()])
            value = str(value).strip()
        if key == "crawler_mode":
            value = "manual" if str(value).lower() == "manual" else "auto"
        if key == "crawler_auto_login":
            value = "on" if str(value).lower() in ("1", "true", "on", "yes") else "off"

        value_str = str(value)
        existing = query_one(
            "SELECT id FROM system_params WHERE param_key = %s", (key,),
        )
        if existing:
            execute(
                "UPDATE system_params SET param_value = %s, updated_at = NOW() WHERE param_key = %s",
                (value_str, key),
            )
        else:
            execute(
                "INSERT INTO system_params (param_key, param_value, param_type, description) "
                "VALUES (%s, %s, %s, %s)",
                (key, value_str, cfg["type"], cfg["description"]),
            )
        saved[key] = value_str
    return saved


def update_crawler_run_status(status: str):
    """更新最近执行时间与状态"""
    from datetime import datetime
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # 最后执行时间
    update_param("crawler_last_run_at", now)
    update_param("crawler_last_status", str(status))


def update_crawler_last_full_run():
    """更新最近全量执行时间"""
    from datetime import datetime
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_param("crawler_last_full_run_at", now)


def get_params():
    """获取所有系统参数"""
    return query_all(
        "SELECT param_key, param_value, param_type, description FROM system_params ORDER BY id"
    )


def update_param(param_key: str, param_value: str):
    """更新系统参数"""
    existing = query_one(
        "SELECT id FROM system_params WHERE param_key = %s", (param_key,)
    )
    if existing:
        execute(
            "UPDATE system_params SET param_value = %s WHERE param_key = %s",
            (param_value, param_key),
        )
    else:
        execute(
            "INSERT INTO system_params (param_key, param_value, param_type) VALUES (%s, %s, %s)",
            (param_key, param_value, "string"),
        )


# =========================================================
# 飞书 Token 管理
# =========================================================

def _fetch_feishu_tenant_token(app_id: str, app_secret: str) -> dict:
    """调用飞书 API 获取 tenant_access_token"""
    try:
        resp = requests.post(
            FEISHU_TENANT_TOKEN_URL,
            json={"app_id": app_id, "app_secret": app_secret},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        if result.get("code") == 0:
            token = result.get("tenant_access_token", "")
            expire = result.get("expire", 7200)
            return {
                "success": True,
                "token": token,
                "expire": expire,
                "expire_at": int(time.time()) + expire - 60,
            }
        else:
            return {
                "success": False,
                "error": f"飞书API返回错误: code={result.get('code')}, msg={result.get('msg')}",
            }
    except Exception as e:
        return {"success": False, "error": f"获取飞书Token失败: {str(e)}"}


def feishu_login(app_id: str, app_secret: str):
    """飞书应用登录：保存 app_id/app_secret 并获取 tenant_access_token"""
    if not app_id or not app_secret:
        return {"success": False, "message": "请提供飞书应用的 app_id 和 app_secret"}

    token_result = _fetch_feishu_tenant_token(app_id, app_secret)
    if not token_result["success"]:
        return token_result

    execute("UPDATE spider_credentials SET is_active = 0 WHERE source = 'feishu' AND is_active = 1")

    config_json = json.dumps({
        "app_id": app_id,
        "app_secret": app_secret,
        "expire_at": token_result["expire_at"],
    }, ensure_ascii=False)

    execute_last_id(
        "INSERT INTO spider_credentials (source, name, config_json, authorization, cookie, username, password, is_active) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, 1)",
        ("feishu", "飞书共享表", config_json, token_result["token"], "", app_id, app_secret),
    )

    return {
        "success": True,
        "message": "飞书凭证配置成功",
        "data": {
            "token": token_result["token"],
            "expire_at": token_result["expire_at"],
        },
    }


def get_feishu_token(force_refresh: bool = False) -> str:
    """获取有效的飞书 tenant_access_token，自动刷新过期 token"""
    row = query_one(
        "SELECT id, authorization, config_json, username, password "
        "FROM spider_credentials WHERE source = 'feishu' AND is_active = 1 LIMIT 1"
    )

    token = ""
    expire_at = 0
    app_id = ""
    app_secret = ""
    row_id = None

    if row:
        token = row.get("authorization", "")
        row_id = row.get("id")
        config_json = row.get("config_json", "{}")
        try:
            config = json.loads(config_json) if isinstance(config_json, str) else {}
        except Exception:
            config = {}
        expire_at = config.get("expire_at", 0)
        app_id = row.get("username", "") or config.get("app_id", "")
        app_secret = row.get("password", "") or config.get("app_secret", "")

    if not app_id or not app_secret:
        app_id = settings.FEISHU_APP_ID
        app_secret = settings.FEISHU_APP_SECRET
        if app_id and app_secret:
            logger.info("从 .env 配置文件获取飞书凭证")

    if not app_id or not app_secret:
        logger.warning("飞书凭证缺少 app_id 或 app_secret，请在系统设置中配置或在 .env 文件中设置")
        return ""

    now = int(time.time())
    if not force_refresh and token and expire_at > now:
        return token

    token_result = _fetch_feishu_tenant_token(app_id, app_secret)
    if not token_result["success"]:
        logger.error(f"获取飞书Token失败: {token_result.get('error')}")
        return ""

    new_config = {
        "app_id": app_id,
        "app_secret": app_secret,
        "expire_at": token_result["expire_at"],
    }

    if row_id:
        execute(
            "UPDATE spider_credentials SET authorization = %s, config_json = %s, username = %s, password = %s WHERE id = %s",
            (token_result["token"], json.dumps(new_config, ensure_ascii=False), app_id, app_secret, row_id),
        )
    else:
        execute("UPDATE spider_credentials SET is_active = 0 WHERE source = 'feishu' AND is_active = 1")
        execute_last_id(
            "INSERT INTO spider_credentials (source, name, config_json, authorization, cookie, username, password, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, 1)",
            ("feishu", "飞书共享表", json.dumps(new_config, ensure_ascii=False), token_result["token"], "", app_id, app_secret),
        )

    logger.info("飞书Token已获取")
    return token_result["token"]