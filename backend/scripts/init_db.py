# -*- coding: utf-8 -*-
"""
数据库初始化脚本
创建 V5 所需的所有表结构
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.database import execute, query_all
from backend.logger import get_logger

logger = get_logger('init_db')


def init_database():
    """初始化数据库表结构"""

    # 项目表
    execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) DEFAULT '',
        project_code VARCHAR(100) NOT NULL,
        apply_code VARCHAR(100) NOT NULL,
        model_type VARCHAR(100),
        parts_count INT NOT NULL DEFAULT 0,
        delivery_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        critical_ready_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'normal',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表'
    """)
    logger.info("✓ projects 表")

    # 项目零件表
    execute("""
    CREATE TABLE IF NOT EXISTS project_parts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        part_code VARCHAR(200) NOT NULL,
        part_name VARCHAR(200) NOT NULL,
        demand_quantity INT NOT NULL DEFAULT 0,
        received_quantity INT NOT NULL DEFAULT 0,
        safety_score TINYINT,
        size_score TINYINT,
        scarcity_score TINYINT,
        process_score TINYINT,
        critical_level DECIMAL(3,2),
        is_critical BOOLEAN NOT NULL DEFAULT FALSE,
        eta_date DATE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_part_code (part_code),
        UNIQUE KEY uk_project_part (project_id, part_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目零件表'
    """)
    logger.info("✓ project_parts 表")

    # 配置表
    execute("""
    CREATE TABLE IF NOT EXISTS configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        config_name VARCHAR(50) NOT NULL,
        display_name VARCHAR(100),
        key_parts_total INT NOT NULL DEFAULT 0,
        key_parts_ready INT NOT NULL DEFAULT 0,
        ready_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'ready',
        processing_time_hours DECIMAL(5,2),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE KEY uk_project_config (project_id, config_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配置表'
    """)
    logger.info("✓ configs 表")

    # 零件配置关联表
    execute("""
    CREATE TABLE IF NOT EXISTS part_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        config_id INT NOT NULL,
        part_code VARCHAR(200) NOT NULL,
        config_qty INT NOT NULL DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE,
        UNIQUE KEY uk_config_part (config_id, part_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='零件配置关联表'
    """)
    logger.info("✓ part_configs 表")

    # QR码现场到件记录表
    execute("""
    CREATE TABLE IF NOT EXISTS qr_arrival_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        part_code VARCHAR(200) NOT NULL COMMENT '零件号',
        arrival_qty INT NOT NULL COMMENT '到货数量',
        arrival_time DATETIME NOT NULL COMMENT '到货时间',
        remark VARCHAR(500) COMMENT '备注',
        submitter VARCHAR(100) COMMENT '提交人',
        matched_status VARCHAR(20) NOT NULL DEFAULT 'unmatched' COMMENT '匹配状态: unmatched/partial/matched',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_part_code (part_code),
        INDEX idx_matched_status (matched_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='QR码现场到件记录表'
    """)
    logger.info("✓ qr_arrival_records 表")

    # 关键件评分表（六维评分：装配顺序、大小体量、报废难度、安全相关、高价值、关重力矩）
    execute("""
    CREATE TABLE IF NOT EXISTS critical_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        part_code VARCHAR(200) NOT NULL,
        assembly_score TINYINT NOT NULL DEFAULT 0 COMMENT '装配顺序优先级 0-30',
        size_score TINYINT NOT NULL DEFAULT 0 COMMENT '零件大小/体量 0-20',
        disposal_score TINYINT NOT NULL DEFAULT 0 COMMENT '报废处理难度 0-15',
        safety_score TINYINT NOT NULL DEFAULT 0 COMMENT '安全相关性 0-15',
        value_score TINYINT NOT NULL DEFAULT 0 COMMENT '高价值零件 0-10',
        torque_score TINYINT NOT NULL DEFAULT 0 COMMENT '关重力矩 0-10',
        critical_score INT NOT NULL DEFAULT 0 COMMENT '总分 0-100',
        is_critical BOOLEAN NOT NULL DEFAULT FALSE,
        critical_level VARCHAR(10) NOT NULL DEFAULT 'green',
        reason VARCHAR(500) DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_project_part (project_id, part_code),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关键件评分表'
    """)
    logger.info("✓ critical_scores 表")

    # 爬虫凭证表
    execute("""
    CREATE TABLE IF NOT EXISTS spider_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source VARCHAR(50) NOT NULL UNIQUE COMMENT '数据源标识',
        name VARCHAR(100) NOT NULL,
        config_json TEXT NOT NULL,
        is_active TINYINT NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'normal',
        last_sync_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='爬虫凭证表'
    """)
    logger.info("✓ spider_credentials 表")

    # V5 交付记录表（融合多源数据）
    execute("""
    CREATE TABLE IF NOT EXISTS delivery_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        delivery_code VARCHAR(100) NOT NULL,
        state VARCHAR(30) DEFAULT '',
        part_code VARCHAR(200) NOT NULL,
        part_name VARCHAR(200) DEFAULT '',
        order_qty INT NOT NULL DEFAULT 0,
        received_qty INT NOT NULL DEFAULT 0,
        in_qty INT NOT NULL DEFAULT 0,
        unqualified_qty INT NOT NULL DEFAULT 0,
        warehouse VARCHAR(100) DEFAULT '',
        professional VARCHAR(50) DEFAULT '',
        source VARCHAR(50) NOT NULL DEFAULT 'wms',
        match_level INT NOT NULL DEFAULT 0,
        recive_time DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_delivery_code (delivery_code),
        INDEX idx_part_code (part_code),
        INDEX idx_source (source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='V5交付记录表'
    """)
    logger.info("✓ delivery_records 表")

    # 飞书到货明细表（参照 delivery_detail 结构，增加 DATA_SOURCE 列）
    execute("""
    CREATE TABLE IF NOT EXISTS feishu_detail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        DELIVERY_CODE VARCHAR(50) DEFAULT NULL COMMENT '送货单号',
        APPLY_CODE VARCHAR(50) DEFAULT NULL COMMENT '试制申请单号',
        PRO_CODE VARCHAR(50) DEFAULT NULL COMMENT '项目编号',
        PRO_NAME VARCHAR(100) DEFAULT NULL COMMENT '项目名称',
        MATTER_CODE VARCHAR(50) DEFAULT NULL COMMENT '零件编码',
        MATTER_NAME VARCHAR(100) DEFAULT NULL COMMENT '零件名称',
        STYLIST_USERNAME VARCHAR(50) DEFAULT NULL COMMENT '设计师',
        ZYS_USERNAME VARCHAR(50) DEFAULT NULL COMMENT '专业师',
        STATE VARCHAR(30) DEFAULT NULL COMMENT '单据状态',
        FROM_ORDER_CODE VARCHAR(50) DEFAULT NULL COMMENT '来源订单号',
        ORDER_NUM INT DEFAULT NULL COMMENT '订单数量',
        SEND_NUM INT DEFAULT NULL COMMENT '发货数量',
        RECIVE_NUM INT DEFAULT NULL COMMENT '收货数量',
        IN_NUM INT DEFAULT NULL COMMENT '入库数量',
        CANT_NUM INT DEFAULT NULL COMMENT '不合格数量',
        SEND_WH_NAME VARCHAR(100) DEFAULT NULL COMMENT '发货仓库',
        WH_NAME VARCHAR(100) DEFAULT NULL COMMENT '收货仓库',
        RECIVE_USERNAME VARCHAR(50) DEFAULT NULL COMMENT '收货人名称',
        RECIVE_TIME DATETIME DEFAULT NULL COMMENT '收货时间',
        DATA_SOURCE VARCHAR(20) NOT NULL DEFAULT 'feishu' COMMENT '数据来源',
        INDEX idx_pro_code (PRO_CODE),
        INDEX idx_apply_code (APPLY_CODE),
        INDEX idx_matter_code (MATTER_CODE),
        INDEX idx_data_source (DATA_SOURCE),
        INDEX idx_recive_time (RECIVE_TIME),
        UNIQUE KEY uk_feishu_record (DELIVERY_CODE, MATTER_CODE, RECIVE_TIME)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='飞书到货明细表'
    """)
    logger.info("✓ feishu_detail 表")

    # 系统参数表
    execute("""
    CREATE TABLE IF NOT EXISTS system_params (
        id INT AUTO_INCREMENT PRIMARY KEY,
        param_key VARCHAR(100) NOT NULL UNIQUE,
        param_value TEXT NOT NULL,
        param_type VARCHAR(20) NOT NULL DEFAULT 'string',
        description VARCHAR(200),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数表'
    """)
    logger.info("✓ system_params 表")

    # 项目零件表添加 critical_reason 列（兼容旧表）
    try:
        execute("ALTER TABLE project_parts ADD COLUMN critical_reason VARCHAR(200) DEFAULT ''")
        logger.info("✓ project_parts.critical_reason 列")
    except Exception:
        logger.info("  project_parts.critical_reason 列已存在")

    # 项目零件表添加 line_side_qty 和 line_side_status 列（QR码现场到件）
    try:
        execute("ALTER TABLE project_parts ADD COLUMN line_side_qty INT NOT NULL DEFAULT 0")
        logger.info("✓ project_parts.line_side_qty 列")
    except Exception:
        logger.info("  project_parts.line_side_qty 列已存在")
    try:
        execute("ALTER TABLE project_parts ADD COLUMN line_side_status VARCHAR(20) NOT NULL DEFAULT 'pending'")
        logger.info("✓ project_parts.line_side_status 列")
    except Exception:
        logger.info("  project_parts.line_side_status 列已存在")

    # 配置表添加 part_count 和 value_range 列（兼容旧表）
    try:
        execute("ALTER TABLE configs ADD COLUMN part_count INT NOT NULL DEFAULT 0")
    except Exception:
        pass
    try:
        execute("ALTER TABLE configs ADD COLUMN value_range VARCHAR(100) DEFAULT ''")
    except Exception:
        pass
    logger.info("✓ configs 扩展列")

    # 交付明细表添加 unqualified_qty 列（兼容旧表）
    try:
        execute("ALTER TABLE delivery_detail ADD COLUMN unqualified_qty INT NOT NULL DEFAULT 0")
        logger.info("✓ delivery_detail.unqualified_qty 列")
    except Exception:
        logger.info("  delivery_detail.unqualified_qty 列已存在")

    # 初始化默认系统参数
    default_params = [
        ("critical_weight_safety", "0.30", "float", "安全件权重"),
        ("critical_weight_size", "0.20", "float", "大件权重"),
        ("critical_weight_scarcity", "0.30", "float", "紧缺件权重"),
        ("critical_weight_process", "0.20", "float", "工艺件权重"),
        ("threshold_delivery_safe", "95", "float", "到货率安全阈值"),
        ("threshold_delivery_warning", "80", "float", "到货率预警阈值"),
        ("bfws_station_count", "3", "int", "BFWS工位数量"),
        ("bfws_weight_alpha", "0.40", "float", "齐套优先权重"),
        ("bfws_weight_beta", "0.30", "float", "工时均衡权重"),
        ("bfws_weight_gamma", "0.30", "float", "风险分散权重"),
        ("bfws_timeout_seconds", "30", "int", "CP-SAT求解超时"),
    ]
    for key, val, ptype, desc in default_params:
        execute(
            "INSERT IGNORE INTO system_params (param_key, param_value, param_type, description) "
            "VALUES (%s, %s, %s, %s)",
            (key, val, ptype, desc),
        )
    logger.info("✓ 默认系统参数已初始化")

    logger.info("数据库初始化完成！")


if __name__ == '__main__':
    init_database()