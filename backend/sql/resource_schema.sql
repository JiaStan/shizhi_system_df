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
    `alert_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '预警编号',
    `alert_type` ENUM('equipment_timeout','unmanned_operation','personnel_abnormal','task_delay') NOT NULL COMMENT '预警类型',
    `level` ENUM('critical','warning','info') NOT NULL COMMENT '级别：严重/警告/信息',
    `title` VARCHAR(200) NOT NULL COMMENT '预警标题',
    `description` TEXT NULL COMMENT '预警描述',
    `related_equipment` VARCHAR(50) NULL COMMENT '关联设备',
    `related_task` INT NULL COMMENT '关联任务',
    `related_personnel` VARCHAR(50) NULL COMMENT '关联人员',
    `status` ENUM('pending','processing','resolved') NOT NULL DEFAULT 'pending' COMMENT '处理状态',
    `raised_at` DATETIME NOT NULL COMMENT '触发时间',
    `resolved_at` DATETIME NULL COMMENT '解决时间',
    `handler` VARCHAR(50) NULL COMMENT '处理人',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_alert_type` (`alert_type`),
    INDEX `idx_alert_level` (`level`),
    INDEX `idx_alert_status` (`status`),
    INDEX `idx_alert_equipment` (`related_equipment`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异常预警表';

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
