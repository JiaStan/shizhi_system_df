-- ========================================
-- spiderV6 试制资源数智化管理系统 - 数据库表结构
-- 数据库: MariaDB 10.11+ (MySQL 兼容)
-- 字符集: utf8mb4
-- ========================================

-- 设置字符集
SET NAMES utf8mb4;

-- ========================================
-- 2.1.1 设备表 equipment
-- ========================================
CREATE TABLE IF NOT EXISTS `equipment` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `equipment_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '设备编号（如 SZC-01）',
    `equipment_name` VARCHAR(100) NOT NULL COMMENT '设备名称',
    `equipment_type` ENUM('lift','island','station') NOT NULL COMMENT '设备类型：举升机/试制岛/工位',
    `zone_code` VARCHAR(50) NOT NULL COMMENT '所属区域编码（外键 → zones）',
    `status` ENUM('idle','busy','error','maintenance') NOT NULL DEFAULT 'idle' COMMENT '设备状态：空闲/占用/故障/维护',
    `current_task_id` INT NULL COMMENT '当前占用的任务ID',
    `current_operator` VARCHAR(100) NULL COMMENT '当前操作员姓名',
    `last_update_time` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_equipment_status` (`status`),
    INDEX `idx_equipment_zone` (`zone_code`),
    INDEX `idx_equipment_type` (`equipment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备台账表';

-- ========================================
-- 2.1.2 区域表 zones
-- ========================================
CREATE TABLE IF NOT EXISTS `zones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `zone_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '区域编码（如 SZC、SZA、SZB）',
    `zone_name` VARCHAR(100) NOT NULL COMMENT '区域名称（如 仓库装配区）',
    `zone_type` ENUM('assembly','island','prototype','external') NOT NULL COMMENT '区域类型',
    `position_x` INT NULL COMMENT '地图X坐标',
    `position_y` INT NULL COMMENT '地图Y坐标',
    `grid_columns` INT DEFAULT 1 COMMENT '网格列数',
    `grid_rows` INT DEFAULT 1 COMMENT '网格行数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_zone_type` (`zone_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区域/车间表';

-- ========================================
-- 2.1.3 人员表 personnel
-- ========================================
CREATE TABLE IF NOT EXISTS `personnel` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `personnel_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '工号',
    `name` VARCHAR(50) NOT NULL COMMENT '姓名',
    `avatar_text` VARCHAR(10) NULL COMMENT '头像文字（姓氏）',
    `department` VARCHAR(100) NULL COMMENT '人力来源/部门',
    `status` ENUM('working','idle','offline') NOT NULL DEFAULT 'offline' COMMENT '当前状态：工作中/空闲/离线',
    `current_zone` VARCHAR(50) NULL COMMENT '当前所在区域',
    `current_task_id` INT NULL COMMENT '当前任务ID',
    `entry_time` DATETIME NULL COMMENT '上班时间',
    `last_update_time` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_personnel_status` (`status`),
    INDEX `idx_personnel_zone` (`current_zone`),
    INDEX `idx_personnel_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='人员信息表';

-- ========================================
-- 2.1.4 任务表 tasks
-- ========================================
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `task_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '任务编号',
    `task_name` VARCHAR(200) NOT NULL COMMENT '任务名称',
    `task_type` ENUM('A','B','C','sporadic') NOT NULL COMMENT '任务类型：A类/B类/C类/零星试制',
    `trial_type` VARCHAR(50) NULL COMMENT '试制类别：骡子车/ET0/ET/软模车/FT0 等',
    `project_group` VARCHAR(100) NULL COMMENT '项目群：奕派/猛士/猛士协同 等',
    `project_code` VARCHAR(100) NULL COMMENT '关联项目编号',
    `vehicle_code` VARCHAR(100) NULL COMMENT '车号',
    `vehicle_model` VARCHAR(100) NULL COMMENT '车型',
    `priority` ENUM('high','medium','low') NOT NULL DEFAULT 'medium' COMMENT '优先级',
    `status` ENUM('pending','in_progress','completed','overdue') NOT NULL DEFAULT 'pending' COMMENT '状态：待开始/进行中/已完成/逾期',
    `zone_code` VARCHAR(50) NULL COMMENT '所在区域/装配阵地',
    `assembly_site` VARCHAR(50) NULL COMMENT '装配场地：SZA/SZB/SZC/JP1/JP2/LH/CX1/CX2/CX/HM',
    `lift_count` INT NULL COMMENT '占用举升机数量',
    `equipment_code` VARCHAR(50) NULL COMMENT '占用设备编号',
    `planner` VARCHAR(50) NULL COMMENT '负责人（装配主管）',
    `pm_name` VARCHAR(50) NULL COMMENT 'PM项目经理',
    `cve_name` VARCHAR(50) NULL COMMENT 'CVE',
    `trial_supervisor` VARCHAR(50) NULL COMMENT '试制主管',
    `process_supervisor` VARCHAR(50) NULL COMMENT '工艺主管',
    `assembly_supervisor` VARCHAR(50) NULL COMMENT '下线调试主管',
    `plan_start_time` DATETIME NULL COMMENT '计划开始时间',
    `plan_end_time` DATETIME NULL COMMENT '计划结束时间',
    `plan_work_hours` DECIMAL(8,2) NULL COMMENT '计划工时',
    `actual_work_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '实际工时',
    `progress` DECIMAL(5,2) DEFAULT 0 COMMENT '进度百分比（自动=实际/计划×100，可手动覆盖）',
    `progress_manual_override` TINYINT(1) DEFAULT 0 COMMENT '进度是否手动覆盖：0自动 1手动',
    `summer_target_count` INT NULL COMMENT '夏标车数量',
    `summer_target_date` DATE NULL COMMENT '夏标车交付时间',
    `source` ENUM('operation','manual','mes') NOT NULL DEFAULT 'manual' COMMENT '数据来源：运营表/手工/MES',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_task_type` (`task_type`),
    INDEX `idx_task_status` (`status`),
    INDEX `idx_task_priority` (`priority`),
    INDEX `idx_task_project` (`project_code`),
    INDEX `idx_task_equipment` (`equipment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务管理表';

-- ========================================
-- 2.1.5 异常预警表 alerts
-- ========================================
CREATE TABLE IF NOT EXISTS `alerts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `alert_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '预警编号（如 AL-2026-0001）',
    `alert_type` ENUM(
        'task_delay','quality_defect','equipment_fault','material_shortage',
        'personnel_gap','safety_hazard','schedule_overdue','process_violation',
        'external_coordinate','other'
    ) NOT NULL COMMENT '预警类型：进度滞后/质量缺陷/设备故障/物料缺件/人员缺口/安全隐患/计划超期/工艺违规/外部协调/其他',
    `level` ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium' COMMENT '级别：严重(红)/高(橙)/中(黄)/低(蓝)',
    `title` VARCHAR(200) NOT NULL COMMENT '预警标题',
    `description` TEXT NULL COMMENT '预警描述：详细异常说明、影响范围、证据',
    `source` ENUM('system_auto','manual_report','equipment_report','operation_inspection','quality_inspection','other') NOT NULL DEFAULT 'system_auto' COMMENT '来源：系统自动/人工上报/设备报警/运营巡检/质量巡检/其他',
    `related_type` ENUM('task','equipment','personnel','material','project','workshop','none') DEFAULT 'none' COMMENT '关联对象类型',
    `related_id` VARCHAR(100) NULL COMMENT '关联对象ID/编号（任务编号/设备编码/工号/物料号/项目编号）',
    `related_name` VARCHAR(200) NULL COMMENT '关联对象名称（冗余，便于展示）',
    `related_equipment` VARCHAR(50) NULL COMMENT '关联设备编码（冗余兼容）',
    `related_task` INT NULL COMMENT '关联任务ID（冗余兼容）',
    `related_personnel` VARCHAR(50) NULL COMMENT '关联人员工号（冗余兼容）',
    `zone_code` VARCHAR(50) NULL COMMENT '发生区域',
    `assembly_site` VARCHAR(50) NULL COMMENT '装配场地',
    `raised_by` VARCHAR(100) NULL COMMENT '发现人/上报人',
    `raised_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '触发/发现时间',
    `sla_hours` INT DEFAULT 24 COMMENT '响应SLA（小时）：critical=4, high=8, medium=24, low=72',
    `escalated` TINYINT(1) DEFAULT 0 COMMENT '是否已升级上报：0否 1是',
    `escalated_to` VARCHAR(100) NULL COMMENT '升级上报对象：如海西分部/总装中心/质量部',
    `status` ENUM('pending','processing','resolved','closed','expired') NOT NULL DEFAULT 'pending' COMMENT '处理状态：待处理/处理中/已解决/已关闭/已超期',
    `handler` VARCHAR(100) NULL COMMENT '当前处理人（责任主管）',
    `handler_department` VARCHAR(100) NULL COMMENT '责任部门',
    `processing_started_at` DATETIME NULL COMMENT '介入处理时间',
    `resolved_at` DATETIME NULL COMMENT '解决时间',
    `closed_at` DATETIME NULL COMMENT '关闭时间',
    `processing_scheme` TEXT NULL COMMENT '临时处置方案（短期遏制）',
    `corrective_action` TEXT NULL COMMENT '根本原因/整改措施（长期改善）',
    `preventive_measure` TEXT NULL COMMENT '预防措施（横向展开）',
    `result_verification` TEXT NULL COMMENT '效果验证记录',
    `loss_amount` DECIMAL(12,2) NULL COMMENT '直接损失金额（元）',
    `impact_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '影响工时（h）',
    `attachment_count` INT DEFAULT 0 COMMENT '附件数量（照片/报表）',
    `remark` TEXT NULL COMMENT '备注',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_alert_type` (`alert_type`),
    INDEX `idx_alert_level` (`level`),
    INDEX `idx_alert_status` (`status`),
    INDEX `idx_alert_raised_at` (`raised_at`),
    INDEX `idx_alert_related` (`related_type`, `related_id`),
    INDEX `idx_alert_zone` (`zone_code`),
    INDEX `idx_alert_equipment` (`related_equipment`),
    INDEX `idx_alert_handler` (`handler`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异常预警表（含SLA与升级机制）';

-- ========================================
-- 2.1.6 人员效率统计表 personnel_efficiency
-- ========================================
CREATE TABLE IF NOT EXISTS `personnel_efficiency` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `personnel_code` VARCHAR(50) NOT NULL COMMENT '工号',
    `stat_date` DATE NOT NULL COMMENT '统计日期',
    `total_work_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '总工时',
    `effective_work_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '有效工时',
    `task_count` INT DEFAULT 0 COMMENT '完成任务数',
    `equipment_usage_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '设备使用率',
    `zone_code` VARCHAR(50) NULL COMMENT '主要工作区域',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY `uk_personnel_date` (`personnel_code`, `stat_date`),
    INDEX `idx_efficiency_personnel` (`personnel_code`),
    INDEX `idx_efficiency_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='人员效率统计表';

-- ========================================
-- 2.1.7 设备维护记录表 equipment_maintenance
-- ========================================
CREATE TABLE IF NOT EXISTS `equipment_maintenance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `equipment_code` VARCHAR(50) NOT NULL COMMENT '设备编号',
    `maintenance_type` ENUM('routine','repair','inspection') NOT NULL COMMENT '维护类型：例行/维修/巡检',
    `start_time` DATETIME NOT NULL COMMENT '开始时间',
    `end_time` DATETIME NULL COMMENT '结束时间',
    `operator` VARCHAR(50) NULL COMMENT '维护人员',
    `description` TEXT NULL COMMENT '维护描述',
    `status` ENUM('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress' COMMENT '状态',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX `idx_maintenance_equipment` (`equipment_code`),
    INDEX `idx_maintenance_type` (`maintenance_type`),
    INDEX `idx_maintenance_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备维护记录表';

-- ========================================
-- 2.1.8 甘特排程计划表 gantt_schedules
-- ========================================
CREATE TABLE IF NOT EXISTS `gantt_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `schedule_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '排程编号 SCH-YYYY-0001',
    `task_id` INT NULL COMMENT '关联任务ID → tasks.id',
    `task_code` VARCHAR(50) NULL COMMENT '关联任务编号（冗余）',
    `task_name` VARCHAR(200) NOT NULL COMMENT '任务/排程名称',
    `task_type` ENUM('A','B','C','sporadic') NOT NULL DEFAULT 'B' COMMENT '任务类型 A/B/C/零星',
    `trial_type` VARCHAR(50) NULL COMMENT '试制类别：骡子车/ET0/ET/软模/FT0',
    `project_group` VARCHAR(100) NULL COMMENT '项目群',
    `project_code` VARCHAR(100) NULL COMMENT '项目编号',
    `vehicle_code` VARCHAR(100) NULL COMMENT '车号',
    `vehicle_model` VARCHAR(100) NULL COMMENT '车型',
    `phase` ENUM('assembly','offline','debug','summer_verify','modify','inspection','delivery') DEFAULT 'assembly' COMMENT '阶段：装配/下线/调试/夏标验证/整改/终检/交付',
    `priority` ENUM('high','medium','low') NOT NULL DEFAULT 'medium' COMMENT '优先级',
    `status` ENUM('pending','in_progress','completed','overdue','cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态',
    `color_tag` VARCHAR(20) NULL COMMENT '自定义颜色标签',
    `assembly_site` VARCHAR(50) NULL COMMENT '装配场地：SZA/SZB/SZC/JP1/JP2/LH/CX1/CX2/HM',
    `zone_code` VARCHAR(50) NULL COMMENT '区域编码',
    `lift_count` INT DEFAULT 0 COMMENT '占用举升机数量',
    `equipment_code` VARCHAR(100) NULL COMMENT '占用设备编号（多个逗号分隔）',
    `planner` VARCHAR(100) NULL COMMENT '装配主管/负责人',
    `pm_name` VARCHAR(100) NULL COMMENT '项目经理PM',
    `cve_name` VARCHAR(100) NULL COMMENT 'CVE',
    `trial_supervisor` VARCHAR(100) NULL COMMENT '试制主管',
    `plan_start_time` DATETIME NOT NULL COMMENT '计划开始时间',
    `plan_end_time` DATETIME NOT NULL COMMENT '计划结束时间',
    `actual_start_time` DATETIME NULL COMMENT '实际开始时间',
    `actual_end_time` DATETIME NULL COMMENT '实际结束时间',
    `plan_work_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '计划工时',
    `actual_work_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '实际工时',
    `progress` DECIMAL(5,2) DEFAULT 0 COMMENT '进度百分比 0-100',
    `progress_manual_override` TINYINT(1) DEFAULT 0 COMMENT '手动覆盖进度标记',
    `parent_id` INT NULL COMMENT '父级排程ID（分组层级）',
    `sort_order` INT DEFAULT 0 COMMENT '排序顺序（同层级内）',
    `constraint_type` ENUM('none','start_no_earlier','end_no_later','must_on','as_soon_as_possible') DEFAULT 'as_soon_as_possible' COMMENT '约束类型',
    `constraint_date` DATETIME NULL COMMENT '约束日期（若有）',
    `predecessor_ids` VARCHAR(500) NULL COMMENT '前置依赖排程ID列表（JSON数组或逗号分隔）',
    `is_critical` TINYINT(1) DEFAULT 0 COMMENT '是否在关键路径上：0否 1是',
    `slack_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '总浮动时差（松弛小时）',
    `has_conflict` TINYINT(1) DEFAULT 0 COMMENT '当前是否存在资源冲突',
    `conflict_count` INT DEFAULT 0 COMMENT '冲突次数累计',
    `remark` TEXT NULL COMMENT '备注',
    `created_by` VARCHAR(50) NULL COMMENT '创建人',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_sch_task` (`task_id`,`task_code`),
    INDEX `idx_sch_type` (`task_type`),
    INDEX `idx_sch_status` (`status`),
    INDEX `idx_sch_priority` (`priority`),
    INDEX `idx_sch_site` (`assembly_site`),
    INDEX `idx_sch_critical` (`is_critical`),
    INDEX `idx_sch_conflict` (`has_conflict`),
    INDEX `idx_sch_start` (`plan_start_time`),
    INDEX `idx_sch_end` (`plan_end_time`),
    INDEX `idx_sch_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甘特排程计划表';

-- ========================================
-- 2.1.9 甘特资源分配表 gantt_resource_allocations
-- ========================================
CREATE TABLE IF NOT EXISTS `gantt_resource_allocations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `allocation_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '分配编号 ALC-YYYYMMDD-NNN',
    `schedule_id` INT NOT NULL COMMENT '排程ID → gantt_schedules.id',
    `schedule_code` VARCHAR(50) NOT NULL COMMENT '排程编号（冗余）',
    `resource_type` ENUM('equipment','personnel','zone','lift','material','other') NOT NULL COMMENT '资源类型',
    `resource_code` VARCHAR(100) NOT NULL COMMENT '资源编码',
    `resource_name` VARCHAR(200) NOT NULL COMMENT '资源名称（冗余）',
    `start_time` DATETIME NULL COMMENT '占用开始时间',
    `end_time` DATETIME NULL COMMENT '占用结束时间',
    `hours_allocated` DECIMAL(8,2) DEFAULT 0 COMMENT '分配工时',
    `quantity` INT DEFAULT 1 COMMENT '分配数量（如举升机多台）',
    `priority` INT DEFAULT 0 COMMENT '分配优先级',
    `status` ENUM('planned','in_use','used','released','cancelled') DEFAULT 'planned' COMMENT '分配状态',
    `remark` VARCHAR(500) NULL COMMENT '备注',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_alloc_schedule` (`schedule_id`,`schedule_code`),
    INDEX `idx_alloc_resource` (`resource_type`,`resource_code`),
    INDEX `idx_alloc_status` (`status`),
    INDEX `idx_alloc_start` (`start_time`),
    INDEX `idx_alloc_end` (`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甘特资源分配表';

-- ========================================
-- 2.1.10 甘特资源冲突表 gantt_conflicts
-- ========================================
CREATE TABLE IF NOT EXISTS `gantt_conflicts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    `conflict_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '冲突编号 CFL-YYYY-0001',
    `conflict_type` ENUM('resource_overlap','time_overlap','dependency_miss','deadline_risk','overload','other') NOT NULL COMMENT '冲突类型',
    `severity` ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium' COMMENT '严重级别',
    `schedule_a_id` INT NULL COMMENT '关联排程A',
    `schedule_a_code` VARCHAR(50) NULL COMMENT '排程A编号',
    `schedule_a_name` VARCHAR(200) NULL COMMENT '排程A名称',
    `schedule_b_id` INT NULL COMMENT '关联排程B',
    `schedule_b_code` VARCHAR(50) NULL COMMENT '排程B编号',
    `schedule_b_name` VARCHAR(200) NULL COMMENT '排程B名称',
    `resource_type` VARCHAR(30) NULL COMMENT '冲突资源类型',
    `resource_code` VARCHAR(100) NULL COMMENT '冲突资源编码',
    `resource_name` VARCHAR(200) NULL COMMENT '冲突资源名称',
    `overlap_start` DATETIME NULL COMMENT '重叠开始时间',
    `overlap_end` DATETIME NULL COMMENT '重叠结束时间',
    `overlap_hours` DECIMAL(8,2) DEFAULT 0 COMMENT '重叠小时数',
    `suggestion` TEXT NULL COMMENT '处理建议',
    `status` ENUM('open','in_review','resolved','ignored') NOT NULL DEFAULT 'open' COMMENT '状态',
    `resolution` TEXT NULL COMMENT '解决方式说明',
    `resolved_by` VARCHAR(100) NULL COMMENT '解决人',
    `resolved_at` DATETIME NULL COMMENT '解决时间',
    `detected_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '检测时间',
    `assembly_site` VARCHAR(50) NULL COMMENT '所属装配场地',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_cfl_type` (`conflict_type`),
    INDEX `idx_cfl_severity` (`severity`),
    INDEX `idx_cfl_status` (`status`),
    INDEX `idx_cfl_a` (`schedule_a_id`),
    INDEX `idx_cfl_b` (`schedule_b_id`),
    INDEX `idx_cfl_resource` (`resource_type`,`resource_code`),
    INDEX `idx_cfl_site` (`assembly_site`),
    INDEX `idx_cfl_detected` (`detected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甘特资源冲突检测表';
