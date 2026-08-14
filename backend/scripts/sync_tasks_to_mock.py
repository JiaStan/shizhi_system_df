# -*- coding: utf-8 -*-
"""
将前端 MOCK_TASKS 数据同步到后端 tasks 表
- 删除现有的 8 条 TASK001-TASK008（与前端 MOCK 不一致）
- 插入 18 条与前端 MOCK 一致的任务数据
- 保留所有其他表的数据
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.database import get_conn, query_all
from backend.logger import logger


def sync_tasks_to_mock():
    """同步前端 MOCK_TASKS 到数据库 tasks 表"""
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            # 0. 调整 task_type ENUM 兼容前端 MOCK（A/B/C/sporadic）
            try:
                cursor.execute("ALTER TABLE tasks MODIFY COLUMN task_type ENUM('A','B','C','sporadic','abc','island') NOT NULL DEFAULT 'B' COMMENT '任务类型 A类/B类/C类/零星试制'")
                logger.info("已调整 task_type ENUM 以兼容 A/B/C/sporadic")
            except Exception as e:
                logger.warning(f"调整 task_type ENUM 失败（可忽略）: {e}")

            # 1. 先备份当前的 task 引用关系（alerts.related_task）
            alerts_refs = query_all(
                "SELECT id, alert_code, related_task FROM alerts WHERE related_task IS NOT NULL"
            )
            logger.info(f"备份 alerts 表中 {len(alerts_refs)} 条任务引用")

            # 2. 解除 alerts 对即将删除任务的引用（避免空指针）
            cursor.execute("UPDATE alerts SET related_task = NULL WHERE related_task IS NOT NULL")
            logger.info("已解除 alerts.related_task 引用")

            # 3. 删除现有的 tasks 表数据（按 task_code 模糊匹配 TASK00*）
            cursor.execute("DELETE FROM tasks WHERE task_code LIKE 'TASK00%'")
            deleted = cursor.rowcount
            logger.info(f"已删除 {deleted} 条旧任务数据 (TASK00*)")

            # 4. 插入新的 18 条任务数据
            insert_sql = """
                INSERT INTO tasks
                (task_code, task_name, task_type, trial_type, project_group, project_code,
                 vehicle_code, vehicle_model, priority, status, zone_code, assembly_site,
                 lift_count, equipment_code, planner, pm_name, cve_name, trial_supervisor,
                 process_supervisor, assembly_supervisor, plan_start_time, plan_end_time,
                 plan_work_hours, actual_work_hours, progress, progress_manual_override,
                 summer_target_count, summer_target_date, source)
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            # A 类任务（5项 + 1项 completed = 6项）
            tasks = [
                # 1. S33 软模车试制 (in_progress)
                ('T-A2026-001', 'S33 软模车试制（16台）', 'A', '软模车', '奕派', 'XM-S33',
                 'S33-CAR-01~16', '奕派S33', 'high', 'in_progress', 'SZA', 'SZA',
                 10, 'SZA-产线', '李密/段玉龙', '陈寅', '骆顺志', '程勇',
                 '姚小川', '熊兵', '2026-06-01 08:00:00', '2026-07-15 18:00:00',
                 1280, 960, 75, 0, 5, '2026-07-11', 'operation'),
                # 2. S33 ET0 试制 (in_progress)
                ('T-A2026-002', 'S33 ET0 试制（71台）', 'A', 'ET0', '奕派', 'XM-S33',
                 'S33-ET0-01~71', '奕派S33', 'high', 'in_progress', 'SZA', 'SZA',
                 28, 'SZA-产线', '李密/段玉龙', '陈寅', '骆顺志', '程勇',
                 '姚小川', '熊兵', '2026-07-01 08:00:00', '2026-09-30 18:00:00',
                 5680, 1800, 32, 0, 14, '2026-07-15', 'operation'),
                # 3. S33 ET 试制 (pending)
                ('T-A2026-003', 'S33 ET 试制（20台）', 'A', 'ET', '奕派', 'XM-S33',
                 'S33-ET-01~20', '奕派S33', 'high', 'pending', 'SZA', 'SZA',
                 16, 'SZA-产线', '李密/段玉龙', '陈寅', '骆顺志', '程勇',
                 '姚小川', '熊兵', '2026-10-01 08:00:00', '2026-12-20 18:00:00',
                 1600, 0, 0, 0, None, None, 'operation'),
                # 4. P4J 软模车试制 (in_progress)
                ('T-A2026-004', 'P4J 软模车试制（11台）', 'A', '软模车', '奕派', 'XM-P4J',
                 'P4J-01~11', '奕派P4J', 'high', 'in_progress', 'SZB', 'SZB',
                 2, 'SZB-LIFT5~6', '——', '——', '——', '程勇',
                 '姚小川', '熊兵', '2026-07-20 08:00:00', '2026-09-10 18:00:00',
                 880, 260, 30, 0, 2, '2026-07-20', 'operation'),
                # 5. P4J ET0 试制 (pending)
                ('T-A2026-005', 'P4J ET0 试制（15台）', 'A', 'ET0', '奕派', 'XM-P4J',
                 'P4J-ET0-01~15', '奕派P4J', 'high', 'pending', 'SZB', 'SZB',
                 2, 'SZB-LIFT5~6', '——', '——', '——', '程勇',
                 '姚小川', '熊兵', '2026-08-10 08:00:00', '2026-11-20 18:00:00',
                 1200, 0, 0, 0, None, None, 'operation'),
                # 6. S-P平台XY项目 骡子车 (completed)
                ('T-A2026-006', 'S-P平台XY项目 骡子车（16台）', 'A', '骡子车', '猛士协同', 'XM-XY',
                 'XY-01~16', '猛士S-P平台', 'high', 'completed', 'SZA', 'SZA',
                 11, 'SZA-05', '李冬艳/王强', '蔡静', '蔡静', '赵帅',
                 '黄流春/苏波', '李召', '2026-01-01 08:00:00', '2026-03-30 18:00:00',
                 1408, 1408, 100, 0, None, None, 'operation'),
                # 7. DH-3 ET0 试制 (in_progress)
                ('T-B2026-001', 'DH-3 ET0 试制（89台）', 'B', 'ET0', '奕派', 'XM-DH3',
                 'DH3-ET0-01~89', '奕派DH3', 'medium', 'in_progress', 'SZC', 'SZA',
                 21, 'SZA-产线+SZC', '胡可意/张应龙', '陈兵', '王永兴', '程勇',
                 '黄流春', '王波', '2026-06-01 08:00:00', '2026-12-31 18:00:00',
                 7120, 2800, 39, 0, None, None, 'operation'),
                # 8. S595bH ET0 试制 (in_progress)
                ('T-B2026-002', 'S595bH ET0 试制（4台）', 'B', 'ET0', '奕派', 'XM-S595',
                 'S595bH-01~04', '奕派S595', 'medium', 'in_progress', 'SZB', 'SZB',
                 4, 'SZB-LIFT1~4', '——', '——', '——', '黄莎',
                 '姚小川', '李耿', '2026-06-05 08:00:00', '2026-07-31 18:00:00',
                 320, 180, 56, 0, 0, None, 'operation'),
                # 9. S3R 骡子车 (pending)
                ('T-B2026-003', 'S3R 骡子车（13台）', 'B', '骡子车', '奕派', 'XM-S3R',
                 'S3R-01~13', '奕派S3R', 'medium', 'pending', 'SZC', 'SZC',
                 2, 'SZC-LIFT1~2', '——', '——', '——', '——',
                 '——', '——', '2026-08-17 08:00:00', '2026-10-10 18:00:00',
                 1040, 0, 0, 0, None, None, 'operation'),
                # 10. S-P（NX1）平台骡子车 (pending)
                ('T-B2026-004', 'S-P（NX1）平台骡子车（5台）', 'B', '骡子车', '奕派', 'XM-SP',
                 'SP-01~05', '奕派S-P/NX1', 'medium', 'pending', 'SZB', 'SZB',
                 2, 'SZB-LIFT7~8', '——', '——', '——', '——',
                 '——', '——', '2026-08-15 08:00:00', '2026-09-30 18:00:00',
                 400, 0, 0, 0, None, None, 'operation'),
                # 11. M18-3年型 ET0 试制 (completed)
                ('T-B2026-005', 'M18-3年型 ET0 试制（7台）', 'B', 'ET0', '猛士', 'XM-M18-3',
                 'M18-3-01~07', '猛士M18-3年型', 'medium', 'completed', 'JP2', 'JP2',
                 1, 'JP2-LIFT1', '李思贤/金执', '刘佳', '秦雨军', '范潇',
                 '邢浩然', '王鹏', '2026-01-05 08:00:00', '2026-01-15 18:00:00',
                 56, 56, 100, 0, None, None, 'operation'),
                # 12. DH3 骡子车 (completed)
                ('T-C2026-001', 'DH3 骡子车（3台）', 'C', '骡子车', '奕派', 'XM-DH3',
                 'DH3-MU-01~03', '奕派DH3', 'low', 'completed', 'SZC', 'SZC',
                 3, 'SZC-LIFT1~3', '李冬艳/王强', '陈兵', '王永兴', '程勇',
                 '黄流春', '杨兴园', '2026-06-20 08:00:00', '2026-07-10 18:00:00',
                 90, 90, 100, 0, 3, '2026-07-01', 'operation'),
                # 13. DH1 BEV 骡子车 (in_progress)
                ('T-C2026-002', 'DH1 BEV 骡子车（25台）', 'C', '骡子车', '奕派', 'XM-DH1',
                 'DH1-BEV-01~25', '奕派DH1 BEV', 'low', 'in_progress', 'SZC', 'SZC',
                 4, 'SZC-LIFT4', '——', '陈兵', '王永兴', '赵帅',
                 '苏波', '李耿', '2026-07-10 08:00:00', '2026-08-30 18:00:00',
                 2000, 1360, 68, 0, None, None, 'operation'),
                # 14. E70换代 骡子车 (in_progress)
                ('T-C2026-003', 'E70换代 骡子车（12台）', 'C', '骡子车', '奕派', 'XM-E70',
                 'E70-01~12', '奕派E70换代', 'low', 'in_progress', 'SZB', 'SZB',
                 4, 'SZB-LIFT3~4', '——', '——', '——', '——',
                 '——', '——', '2026-07-01 08:00:00', '2026-08-20 18:00:00',
                 960, 500, 52, 0, None, None, 'operation'),
                # 15. 乐高平台骡子车 (in_progress)
                ('T-C2026-004', '乐高平台骡子车（3台）', 'C', '骡子车', '奕派', 'XM-LG',
                 'LG-01~03', '乐高平台', 'low', 'in_progress', 'SZB', 'SZB',
                 2, 'SZB-LIFT8', '——', '——', '——', '——',
                 '——', '——', '2026-06-20 08:00:00', '2026-08-10 18:00:00',
                 240, 60, 25, 0, None, None, 'operation'),
                # 16. P59a 骡子车 (completed)
                ('T-C2026-005', 'P59a 骡子车（33台）', 'C', '骡子车', '奕派', 'XM-P59a',
                 'P59a-01~33', '奕派P59a', 'low', 'completed', 'CX1', 'CX1',
                 5, 'CX1-LIFT1~5', '——', '郑雄文', '杨学渊', '黄莎',
                 '邢浩然', '王鹏', '2026-01-01 08:00:00', '2026-01-31 18:00:00',
                 1320, 1320, 100, 0, None, None, 'operation'),
                # 17. 车轮定位检测校准 (completed, 零星)
                ('T-S2026-001', '车轮定位检测校准（零星）', 'sporadic', '', '', '',
                 'VEH-2305', '通用', 'low', 'completed', 'SZB', 'SZB',
                 1, '', '王芳', '', '', '', '', '', '2026-08-01 13:00:00', '2026-08-01 17:00:00',
                 4, 3.5, 100, 0, None, None, 'manual'),
                # 18. 零部件区Kitting补料 (overdue, 零星)
                ('T-S2026-002', '零部件区Kitting补料（零星）', 'sporadic', '', '', 'XM-DH1',
                 '', '', 'medium', 'overdue', 'SZC', 'SZC',
                 None, '', '孙丽', '', '', '', '', '', '2026-07-30 08:00:00', '2026-07-31 17:00:00',
                 12, 9, 60, 0, None, None, 'manual'),
            ]

            inserted = 0
            for t in tasks:
                try:
                    cursor.execute(insert_sql, t)
                    inserted += 1
                except Exception as e:
                    logger.warning(f"插入失败 {t[0]}: {e}")
            logger.info(f"成功插入 {inserted} 条任务数据")

            conn.commit()
            logger.info("✓ 数据库 tasks 表同步完成")

            # 验证
            count = query_one = query_all("SELECT COUNT(*) AS c FROM tasks")
            logger.info(f"当前 tasks 表总记录数: {count[0]['c']}")

            stats = query_all("SELECT status, COUNT(*) AS c FROM tasks GROUP BY status")
            for s in stats:
                logger.info(f"  {s['status']}: {s['c']}")

    except Exception as e:
        conn.rollback()
        logger.error(f"同步失败: {e}")
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    sync_tasks_to_mock()
