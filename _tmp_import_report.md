# 任务管理 Excel 导入总结报告

**生成时间**: 2026-08-17
**Excel 源文件**: D:/工作/试制计划/2026年整车试制项目运营表-8.10.xlsx
**Sheet 名**: 2026年各项目需求及装配资源-试制主管&各组长

## 一、导入结果

- Excel 提取项目数: **77**
- 成功导入任务数: **0**
- 跳过/重复: **4**
- 失败: **0**

### 当前数据库总览
- 任务总数: **91**
  - source=operation: 16 条
  - source=manual: 75 条

## 二、字段映射情况

### ✅ Excel → 数据库 字段映射（共 14 个核心字段）

| Excel 字段 | 数据库字段 | 说明 |
|---|---|---|
| project_name | task_name | 项目名称 |
| task_type (A/B/C) | task_type | 任务类型 |
| trial_category (骡子车/ET0/...) | trial_type | 试制类别 |
| project_group (奕派/猛士/...) | project_group | 项目群 |
| monthly_data[0].site | assembly_site | 装配场地 |
| monthly_data[0].lift_count | lift_count | 举升机数量 |
| monthly_data[0..N].qty 合计 | plan_work_hours (×8) | 计划工时 |
| monthly_data 月份范围 | plan_start_time / plan_end_time | 计划起止时间 |
| pm | pm_name | 项目经理 |
| cve | cve_name | 主管工程师 |
| trial_supervisor | trial_supervisor | 试制主管 |
| process_supervisor | process_supervisor | 工艺主管 |
| assembly_supervisor | assembly_supervisor | 装配主管 |
| sop_time (J1~J12) | ✗ 未保留 | SOP投产时间 |
| summer_target_count | summer_target_count | 夏季目标数 |
| summer_target_date | summer_target_date | 夏季目标日期 |

### ⚠️ Excel 中有但数据库暂无的字段（建议补充）

| Excel 字段 | 含义 | 建议 |
|---|---|---|
| **application_no** | 申请编号 | 建议增加 `application_no varchar(50)` 字段 |
| **parts_collect_time** | 配件齐套时间 | 建议增加 `parts_collect_time date` 字段 |
| **bom_input_time** | BOM输入时间 | 建议增加 `bom_input_time date` 字段 |
| **bom_freeze_time** | BOM冻结时间 | 建议增加 `bom_freeze_time date` 字段 |
| **sop_time** | SOP投产月份(J1~J12) | 建议增加 `sop_month int` 或 `sop_time varchar(10)` 字段 |
| **personnel_count** | 装配人员数 | 建议增加 `personnel_count int` 字段 |
| **debug_supervisor** | 调试主管 | 建议增加 `debug_supervisor varchar(50)` 字段 |

## 三、数据分布

### 按项目群
- 奕派: 50 条
- 猛士: 6 条
- S-P平台: 4 条
- 本田协同: 3 条
- 神龙协同: 3 条
- 未填: 2 条
- 科研课题: 2 条
- MORA平台: 2 条
- 海外: 1 条
- 猛士协同: 1 条
- JEEP: 1 条

### 按任务类型
- A: 5 条
- B: 14 条
- C: 54 条
- sporadic: 2 条

### 按状态
- 待开始(pending): 16 条
- 进行中(in_progress): 43 条
- 已完成(completed): 15 条
- 逾期(overdue): 1 条

### 按试制类别 (Top 10)
- 骡子车: 38 条
- ET0: 15 条
- 软模车: 2 条
- 骡车/ET: 2 条
- ET0-2: 2 条
- MT-2: 2 条
- ET0-3: 1 条
- 骡子车mule-8: 1 条
- M57 ET0: 1 条
- 骡子车换装: 1 条

### 按装配场地 (Top 10)
- CX: 21 条
- CX1: 12 条
- LH: 10 条
- SZB: 8 条
- CX2: 6 条
- JP1: 5 条
- SZC: 4 条
- JP2: 3 条
- SZA/SZC: 2 条
- SZA: 1 条

### 试制主管 (Top 15)
- 桑伟进: 13 次
- 黄莎: 8 次
- 范潇: 7 次
- 贾炜: 6 次
- 李世龙: 6 次
- 赵帅: 6 次
- 吴玉菊: 4 次
- 程勇: 4 次
- 肖天: 4 次
- 陈亚磊: 3 次
- 冯涛: 2 次
- 傅小嘉: 2 次
- TBD: 2 次
- 穆雨萱: 2 次
- 李东轩: 1 次

### 月度车辆数分布 (合计 1144 台)
- 1月: 196 台
- 2月: 96 台
- 3月: 96 台
- 4月: 94 台
- 5月: 61 台
- 6月: 78 台
- 7月: 45 台
- 8月: 36 台
- 9月: 20 台
- 10月: 64 台
- 11月: 177 台
- 12月: 181 台

## 四、详细数据样例（导入的前 5 条）

## 五、建议补充的"新建任务"表单字段

### 现有表单已有字段（无需修改）

| 现有字段 | Excel 对应 |
|---|---|
| 任务编号(task_code) | 自动生成 |
| 任务名称(task_name) | project_name |
| 任务类型(task_type) | A/B/C/sporadic |
| 试制类别(trial_type) | 骡子车/ET0/... |
| 项目群(project_group) | 奕派/猛士/... |
| 装配场地(assembly_site) | CX/SZA/SZB... |
| 举升机数量(lift_count) | 数值 |
| 项目经理(pm_name) | pm |
| 主管工程师(cve_name) | cve |
| 试制主管(trial_supervisor) | 姓名 |
| 工艺主管(process_supervisor) | 姓名 |
| 装配主管(assembly_supervisor) | 姓名 |
| 计划起止时间(plan_start_time / plan_end_time) | 月度装配数据 |
| 计划工时(plan_work_hours) | 自动计算 |
| 夏季目标(summer_target_count / summer_target_date) | 数值+日期 |
| 优先级(priority) | A=high, B=medium, C=low |
| 状态(status) | 按时间/装配情况推断 |

### 🚀 建议增加字段（基于 Excel 实际需求）

1. **申请编号 (application_no)** - 用于追溯原始试制申请
   - 类型: varchar(50)
   - 用途: 与其他系统对账
2. **配件齐套时间 (parts_collect_time)** - 关键节点管理
   - 类型: date
   - 用途: 甘特排程、齐套预警
3. **BOM输入时间 (bom_input_time)** - 工艺准备里程碑
   - 类型: date
4. **BOM冻结时间 (bom_freeze_time)** - 工艺冻结节点
   - 类型: date
5. **SOP 投产月份 (sop_month)** - 项目 SOP 节点（Excel 中 J1~J12）
   - 类型: tinyint (1-12) 或 varchar(10) 如 "J4"
   - 用途: 自动计算 BOM 输入/冻结等关键日期
6. **装配人员数 (personnel_count)** - 资源排程
   - 类型: int
   - 用途: 人员占用率分析、试制资源数智化
7. **调试主管 (debug_supervisor)** - 责任分工
   - 类型: varchar(50)

### 📋 建议补充字段的 SQL（可一次执行）

```sql
ALTER TABLE tasks
  ADD COLUMN application_no VARCHAR(50) DEFAULT NULL COMMENT "申请编号",
  ADD COLUMN parts_collect_time DATE DEFAULT NULL COMMENT "配件齐套时间",
  ADD COLUMN bom_input_time DATE DEFAULT NULL COMMENT "BOM输入时间",
  ADD COLUMN bom_freeze_time DATE DEFAULT NULL COMMENT "BOM冻结时间",
  ADD COLUMN sop_month TINYINT DEFAULT NULL COMMENT "SOP投产月份(1-12)",
  ADD COLUMN sop_time VARCHAR(10) DEFAULT NULL COMMENT "SOP节点标识(如J4)",
  ADD COLUMN personnel_count INT DEFAULT NULL COMMENT "装配人员数",
  ADD COLUMN debug_supervisor VARCHAR(50) DEFAULT NULL COMMENT "调试主管";
```
