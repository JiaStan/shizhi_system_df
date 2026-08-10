-- ========================================
-- spiderV6 试制资源数智化管理系统 - 初始化数据
-- 数据库: MariaDB 10.11+ (MySQL 兼容)
-- ========================================

SET NAMES utf8mb4;

-- ========================================
-- 初始化区域数据 zones
-- ========================================
INSERT INTO `zones` (`zone_code`, `zone_name`, `zone_type`, `position_x`, `position_y`, `grid_columns`, `grid_rows`) VALUES
('SZC', '仓库装配区', 'assembly', 100, 100, 3, 2),
('SZA', '装配一期车间', 'island', 300, 100, 2, 2),
('SZB', '装配二期车间', 'assembly', 500, 100, 3, 2),
('JP1', '竞品装配一区', 'prototype', 100, 250, 2, 2),
('JP2', '竞品装配二区', 'prototype', 300, 250, 2, 2),
('LH', '联合装配区', 'assembly', 500, 250, 3, 2),
('CX1', '外委畅行车间', 'external', 100, 400, 4, 3),
('CX2', '外委交石车间', 'external', 500, 400, 4, 3);

-- ========================================
-- 初始化设备数据 equipment
-- ========================================
INSERT INTO `equipment` (`equipment_code`, `equipment_name`, `equipment_type`, `zone_code`, `status`) VALUES
-- SZC 仓库装配区 - 举升机
('SZC-01', '1号举升机', 'lift', 'SZC', 'idle'),
('SZC-02', '2号举升机', 'lift', 'SZC', 'busy'),
('SZC-03', '3号举升机', 'lift', 'SZC', 'idle'),
('SZC-04', '4号举升机', 'lift', 'SZC', 'idle'),
('SZC-05', '5号举升机', 'lift', 'SZC', 'maintenance'),

-- SZA 装配一期 - 试制岛
('SZA-01', '1号试制岛', 'island', 'SZA', 'busy'),
('SZA-02', '2号试制岛', 'island', 'SZA', 'idle'),
('SZA-03', '3号试制岛', 'island', 'SZA', 'idle'),
('SZA-04', '4号试制岛', 'island', 'SZA', 'busy'),

-- SZB 装配二期 - 举升机
('SZB-01', '1号举升机', 'lift', 'SZB', 'idle'),
('SZB-02', '2号举升机', 'lift', 'SZB', 'busy'),
('SZB-03', '3号举升机', 'lift', 'SZB', 'idle'),
('SZB-04', '4号举升机', 'lift', 'SZB', 'idle'),
('SZB-05', '5号举升机', 'lift', 'SZB', 'error'),
('SZB-06', '6号举升机', 'lift', 'SZB', 'idle'),

-- JP1 竞品一区
('JP1-01', '1号举升机', 'lift', 'JP1', 'idle'),
('JP1-02', '2号举升机', 'lift', 'JP1', 'busy'),
('JP1-03', '3号举升机', 'lift', 'JP1', 'idle'),

-- JP2 竞品二区
('JP2-01', '1号举升机', 'lift', 'JP2', 'busy'),
('JP2-02', '2号举升机', 'lift', 'JP2', 'idle'),
('JP2-03', '3号举升机', 'lift', 'JP2', 'idle'),
('JP2-04', '4号举升机', 'lift', 'JP2', 'busy'),

-- LH 联合装配区
('LH-01', '1号举升机', 'lift', 'LH', 'idle'),
('LH-02', '2号举升机', 'lift', 'LH', 'busy'),
('LH-03', '3号举升机', 'lift', 'LH', 'idle'),
('LH-04', '4号举升机', 'lift', 'LH', 'idle'),
('LH-05', '5号举升机', 'lift', 'LH', 'busy'),

-- CX1 外委畅行
('CX1-01', '1号举升机', 'lift', 'CX1', 'idle'),
('CX1-02', '2号举升机', 'lift', 'CX1', 'busy'),
('CX1-03', '3号举升机', 'lift', 'CX1', 'idle'),
('CX1-04', '4号举升机', 'lift', 'CX1', 'idle'),

-- CX2 外委交石
('CX2-01', '1号举升机', 'lift', 'CX2', 'busy'),
('CX2-02', '2号举升机', 'lift', 'CX2', 'idle'),
('CX2-03', '3号举升机', 'lift', 'CX2', 'idle'),
('CX2-04', '4号举升机', 'lift', 'CX2', 'idle');

-- ========================================
-- 初始化人员数据 personnel
-- ========================================
INSERT INTO `personnel` (`personnel_code`, `name`, `avatar_text`, `department`, `status`, `current_zone`) VALUES
('EMP001', '张伟', '张', '自有', 'working', 'SZC'),
('EMP002', '李明', '李', '自有', 'idle', 'SZA'),
('EMP003', '王芳', '王', '商用车', 'working', 'SZA'),
('EMP004', '刘强', '刘', '乘用车', 'working', 'SZB'),
('EMP005', '陈静', '陈', '柳汽', 'idle', 'SZB'),
('EMP006', '杨洋', '杨', '中智', 'working', 'JP1'),
('EMP007', '赵敏', '赵', '外协', 'working', 'JP2'),
('EMP008', '孙磊', '孙', '自有', 'idle', 'LH'),
('EMP009', '周涛', '周', '自有', 'offline', NULL),
('EMP010', '吴婷', '吴', '外协', 'working', 'CX1'),
('EMP011', '郑凯', '郑', '商用车', 'working', 'SZC'),
('EMP012', '冯雪', '冯', '自有', 'idle', 'SZA'),
('EMP013', '朱强', '朱', '乘用车', 'working', 'SZB'),
('EMP014', '钱琳', '钱', '柳汽', 'idle', 'JP1'),
('EMP015', '马超', '马', '中智', 'working', 'LH');

-- ========================================
-- 初始化任务数据 tasks
-- ========================================
INSERT INTO `tasks` (`task_code`, `task_name`, `task_type`, `project_code`, `vehicle_code`, `vehicle_model`, `priority`, `status`, `zone_code`, `equipment_code`, `planner`, `plan_start_time`, `plan_end_time`, `plan_work_hours`, `progress`, `source`) VALUES
('TASK001', 'DH3 试制C类', 'abc', 'PRJ2024001', 'DH3', 'SUV', 'medium', 'in_progress', 'SZC', 'SZC-02', '张伟', '2026-07-28 08:00:00', '2026-08-05 18:00:00', 56.00, 75.00, 'operation'),
('TASK002', 'S3JET0 B类', 'abc', 'PRJ2024002', 'S3JET0', '轿车', 'high', 'in_progress', 'SZA', 'SZA-01', '李明', '2026-07-25 08:00:00', '2026-08-10 18:00:00', 40.00, 30.00, 'operation'),
('TASK003', 'S599841 B类', 'abc', 'PRJ2024003', 'S599841', 'SUV', 'medium', 'pending', 'SZB', 'SZB-02', '王芳', '2026-08-01 08:00:00', '2026-08-08 18:00:00', 24.00, 0.00, 'operation'),
('TASK004', 'DHTMPV A类', 'abc', 'PRJ2024004', 'DHTMPV', 'MPV', 'high', 'in_progress', 'JP1', 'JP1-02', '刘强', '2026-07-20 08:00:00', '2026-08-05 18:00:00', 48.00, 60.00, 'operation'),
('TASK005', 'N1F1 B类', 'abc', 'PRJ2024005', 'N1F1', '轿车', 'medium', 'pending', 'JP2', 'JP2-01', '陈静', '2026-08-05 08:00:00', '2026-08-12 18:00:00', 32.00, 0.00, 'operation'),
('TASK006', 'M18MPV B类', 'abc', 'PRJ2024006', 'M18MPV', 'MPV', 'medium', 'in_progress', 'LH', 'LH-02', '杨洋', '2026-07-30 08:00:00', '2026-08-06 18:00:00', 28.00, 45.00, 'operation'),
('TASK007', '零星任务-电池包更换', 'sporadic', NULL, NULL, NULL, 'low', 'completed', 'SZC', 'SZC-01', '赵敏', '2026-07-29 08:00:00', '2026-07-29 12:00:00', 4.00, 100.00, 'manual'),
('TASK008', '零星任务-线束检修', 'sporadic', NULL, NULL, NULL, 'low', 'pending', 'SZA', NULL, '孙磊', '2026-08-01 14:00:00', '2026-08-01 17:00:00', 3.00, 0.00, 'manual');

-- ========================================
-- 初始化异常预警数据 alerts
-- ========================================
INSERT INTO `alerts` (`alert_code`, `alert_type`, `level`, `title`, `description`, `related_equipment`, `related_task`, `status`, `raised_at`, `handler`) VALUES
('ALERT001', 'equipment_timeout', 'warning', 'SZC-02 占用超时', '设备SZC-02已连续占用超过8小时', 'SZC-02', 1, 'processing', '2026-07-31 09:00:00', NULL),
('ALERT002', 'unmanned_operation', 'critical', 'SZB-03 无人作业异常', '设备SZB-03占用中但超过30分钟无人员扫码', 'SZB-03', NULL, 'pending', '2026-07-31 09:30:00', NULL),
('ALERT003', 'equipment_timeout', 'info', 'JP1-02 占用时间较长', '设备JP1-02已占用6小时', 'JP1-02', 4, 'pending', '2026-07-31 10:00:00', NULL),
('ALERT004', 'task_delay', 'warning', 'TASK003 有延迟风险', '任务TASK003进度低于预期，预计延迟2天', NULL, 3, 'pending', '2026-07-31 08:00:00', NULL),
('ALERT005', 'equipment_timeout', 'warning', 'LH-02 占用超时', '设备LH-02已连续占用超过10小时', 'LH-02', 6, 'resolved', '2026-07-31 07:00:00', '管理员');

-- ========================================
-- 初始化设备维护记录 equipment_maintenance
-- ========================================
INSERT INTO `equipment_maintenance` (`equipment_code`, `maintenance_type`, `start_time`, `end_time`, `operator`, `description`, `status`) VALUES
('SZC-05', 'repair', '2026-07-31 08:00:00', NULL, '维护组', '液压系统异常，正在维修', 'in_progress'),
('SZC-05', 'inspection', '2026-07-25 08:00:00', '2026-07-25 17:00:00', '维护组', '月度例行巡检', 'completed'),
('SZB-05', 'repair', '2026-07-30 14:00:00', NULL, '维护组', '电机异响，故障待排查', 'in_progress'),
('JP1-01', 'routine', '2026-07-28 08:00:00', '2026-07-28 12:00:00', '维护组', '周度例行维护', 'completed');
