# -*- coding: utf-8 -*-
r"""
资源模块表结构幂等迁移：为旧版 tasks 表补齐代码所需的新增列。
MariaDB 支持 ADD COLUMN IF NOT EXISTS，可重复执行。
运行: .venv\Scripts\python.exe -m backend.scripts.migrate_resource_tables
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.database import execute, query_all

NEW_TASK_COLUMNS = [
    ("trial_type", "VARCHAR(50) NULL COMMENT '试制类别：骡子车/ET0/ET/软模车/FT0 等'"),
    ("project_group", "VARCHAR(100) NULL COMMENT '项目群：奕派/猛士/猛士协同 等'"),
    ("assembly_site", "VARCHAR(50) NULL COMMENT '装配场地：SZA/SZB/SZC/JP1/JP2/LH/CX1/CX2/CX/HM'"),
    ("lift_count", "INT NULL COMMENT '占用举升机数量'"),
    ("pm_name", "VARCHAR(50) NULL COMMENT 'PM项目经理'"),
    ("cve_name", "VARCHAR(50) NULL COMMENT 'CVE'"),
    ("trial_supervisor", "VARCHAR(50) NULL COMMENT '试制主管'"),
    ("process_supervisor", "VARCHAR(50) NULL COMMENT '工艺主管'"),
    ("assembly_supervisor", "VARCHAR(50) NULL COMMENT '下线调试主管'"),
    ("progress_manual_override", "TINYINT(1) DEFAULT 0 COMMENT '进度是否手动覆盖：0自动 1手动'"),
    ("summer_target_count", "INT NULL COMMENT '夏标车数量'"),
    ("summer_target_date", "DATE NULL COMMENT '夏标车交付时间'"),
]


def main():
    existing = {r['Field'] for r in query_all("SHOW COLUMNS FROM tasks")}
    for name, ddl in NEW_TASK_COLUMNS:
        if name in existing:
            print("skip (exists):", name)
            continue
        execute(f"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS `{name}` {ddl}")
        print("added:", name)
    print("tasks columns now:", sorted({r['Field'] for r in query_all("SHOW COLUMNS FROM tasks")}))


if __name__ == '__main__':
    main()
