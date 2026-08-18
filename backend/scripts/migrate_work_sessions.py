# -*- coding: utf-8 -*-
r"""
扫码占用作业记录表 work_sessions 幂等迁移。
运行: .venv\Scripts\python.exe -m backend.scripts.migrate_work_sessions
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.database import execute, query_one

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS `work_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `session_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '作业编号 WS-YYYYMMDDHHMMSS-设备编号',
    `equipment_code` VARCHAR(50) NOT NULL COMMENT '占用设备编号',
    `zone_code` VARCHAR(50) NULL COMMENT '设备所属场地',
    `task_id` INT NULL COMMENT '关联任务ID → tasks.id',
    `task_name` VARCHAR(200) NOT NULL COMMENT '任务名称',
    `task_category` VARCHAR(20) NULL COMMENT '任务分类：A类/B类/C类/零星',
    `task_source` ENUM('table','manual') NOT NULL DEFAULT 'table' COMMENT '任务来源：表中已有/手工录入',
    `personnel_codes` TEXT NULL COMMENT '参与人员工号JSON数组',
    `personnel_names` TEXT NULL COMMENT '参与人员姓名JSON数组',
    `personnel_count` INT DEFAULT 0 COMMENT '参与人员数量',
    `start_time` DATETIME NOT NULL COMMENT '作业开始时间',
    `end_time` DATETIME NULL COMMENT '作业结束时间',
    `status` ENUM('active','finished') NOT NULL DEFAULT 'active' COMMENT '作业状态：进行中/已结束',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_ws_equipment` (`equipment_code`),
    INDEX `idx_ws_status` (`status`),
    INDEX `idx_ws_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扫码占用作业记录表'
"""


def main():
    execute(CREATE_SQL)
    row = query_one("SELECT COUNT(*) AS c FROM work_sessions")
    print("work_sessions ready, rows =", row['c'])


if __name__ == '__main__':
    main()
