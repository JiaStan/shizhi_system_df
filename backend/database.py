# -*- coding: utf-8 -*-
import pymysql
from pymysql.cursors import DictCursor
from dbutils.pooled_db import PooledDB
from backend.config import settings
from backend.logger import logger

# 全局连接池
_pool = None


def get_pool():
    """获取数据库连接池（单例，延迟初始化）。

    连接失败时会抛出带有明确配置提示的错误，方便排查 .env 配置问题。
    """
    global _pool
    if _pool is None:
        try:
            _pool = PooledDB(
                creator=pymysql,
                maxconnections=10,
                mincached=0,  # 启动时不预建连接，避免配置错误导致服务直接崩溃
                maxcached=5,
                blocking=True,
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_DATABASE,
                charset='utf8mb4',
                cursorclass=DictCursor,
            )
        except Exception as exc:
            logger.error(
                "数据库连接池初始化失败：%s。"
                "请检查 backend/.env 中的 DB_HOST / DB_PORT / DB_USER / "
                "DB_PASSWORD / DB_DATABASE 配置是否正确。"
                "若没有 .env 文件，请先复制 backend/.env.example 为 backend/.env 并填写。",
                exc,
            )
            raise
    return _pool


def get_conn():
    """获取一个数据库连接"""
    return get_pool().connection()


def query_all(sql, params=None):
    """查询所有记录"""
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchall()
    finally:
        conn.close()


def query_one(sql, params=None):
    """查询单条记录"""
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchone()
    finally:
        conn.close()


def execute(sql, params=None):
    """执行写操作（INSERT/UPDATE/DELETE）"""
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            affected = cursor.execute(sql, params or ())
        conn.commit()
        return affected
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_last_id(sql, params=None):
    """执行 INSERT 并返回自增ID"""
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            last_id = cursor.lastrowid
        conn.commit()
        return last_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_all(sql, params_list):
    """批量执行写操作"""
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            affected = cursor.executemany(sql, params_list or [])
        conn.commit()
        return affected
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()