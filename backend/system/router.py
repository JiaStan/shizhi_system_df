# -*- coding: utf-8 -*-
"""
系统设置路由
凭证管理 + 登录获取 token + 手动同步凭证
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from backend.system import credentials
from backend.system.credentials import spider_login, manual_sync_credentials, feishu_login

router = APIRouter()


class LoginRequest(BaseModel):
    source: str = "wms"
    username: str
    password: str
    env: str = "prod"


class CredentialRequest(BaseModel):
    source: str = "wms"
    name: str = ""
    config: Dict = {}
    is_active: Optional[int] = 1


class CredentialSyncRequest(BaseModel):
    """手动同步凭证（从浏览器复制 JWT Token 和 Cookie）"""
    source: str = "wms"
    token_type: str = "jwt"
    token: str = ""
    authorization: str = ""
    cookie: str = ""
    username: str = ""
    password: str = ""


class FeishuLoginRequest(BaseModel):
    """飞书应用登录"""
    app_id: str
    app_secret: str


class ParamRequest(BaseModel):
    param_key: str
    param_value: str


# ===================== 登录获取 Token =====================

@router.post("/login")
def do_login(req: LoginRequest):
    """自动登录 di360 获取 JWT Token"""
    return spider_login(req.username, req.password, source=getattr(req, "source", "wms"), env=getattr(req, "env", "prod"))


@router.post("/login/feishu")
def do_feishu_login(req: FeishuLoginRequest):
    """飞书应用登录：获取 tenant_access_token"""
    return feishu_login(req.app_id, req.app_secret)


# ===================== 凭证管理 =====================

@router.get("/credentials")
def list_credentials():
    return {"data": credentials.list_credentials()}


@router.post("/credentials")
def save_credential(req: CredentialRequest):
    result = credentials.create_or_update(req.source, req.name, req.config, req.is_active)
    return {"data": result, "message": "凭证保存成功"}


@router.post("/credentials/sync")
def sync_credential(req: CredentialSyncRequest):
    """手动同步凭证（从浏览器复制 JWT Token / Cookie）"""
    return manual_sync_credentials(
        source=req.source,
        token_type=getattr(req, "token_type", "jwt"),
        token=getattr(req, "token", "") or getattr(req, "authorization", ""),
        authorization=getattr(req, "authorization", ""),
        cookie=getattr(req, "cookie", ""),
        username=getattr(req, "username", ""),
        password=getattr(req, "password", "")
    )


@router.delete("/credentials/{source}")
def delete_credential(source: str):
    credentials.delete_credential(source)
    return {"message": "凭证已删除"}


# ===================== 系统参数 =====================

@router.get("/params")
def list_params():
    return {"data": credentials.get_params()}


@router.post("/params")
def update_param(req: ParamRequest):
    credentials.update_param(req.param_key, req.param_value)
    return {"message": "参数更新成功"}