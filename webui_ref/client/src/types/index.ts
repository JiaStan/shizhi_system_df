// client/src/types/index.ts

// 导出其他类型
export * from './common';

/* ============================================================
 *  现场-仓储同步系统 共享类型定义
 *  命名规范：interface 统一使用 I 前缀
 * ============================================================ */

// ─── 项目管理 ────────────────────────────────────────────────

/** 项目 */
export interface IProject {
  /** 项目ID */
  id: number;
  /** 项目名称 */
  project_name: string | null;
  /** 项目号，对应 delivery_detail.PRO_CODE */
  project_code: string;
  /** 试制申请单号，对应 delivery_detail.APPLY_CODE */
  apply_code: string;
  /** PBOM零件总数 */
  parts_count: number;
  /** 到货率（0-100） */
  delivery_rate: number;
  /** 关键件齐套率（0-100） */
  critical_ready_rate: number;
  /** 创建时间 ISO 字符串 */
  created_at: string;
}

/** 创建/编辑项目表单 */
export interface IProjectFormValues {
  project_name: string;
  project_code: string;
  apply_code: string;
}

// ─── PBOM 零件 ───────────────────────────────────────────────

/** PBOM 零件 */
export interface IPart {
  id: number;
  project_id: number;
  /** 零件号 */
  part_code: string;
  /** 零件名称 */
  part_name: string;
  /** 需求量 */
  demand_quantity: number;
  /** 关键件加权总分（1-5） */
  critical_level: number;
  /** 关键件评分理由 */
  critical_reason: string;
  /** 安全件维度 1-5 */
  safety: number;
  /** 大件维度 1-5 */
  size: number;
  /** 紧缺件维度 1-5 */
  scarcity: number;
  /** 工艺件维度 1-5 */
  process: number;
}

/** 关键件等级标签 */
export type CriticalLevelTag = 'critical' | 'sub-critical' | 'normal';

// ─── 到货记录 ────────────────────────────────────────────────

/** 到货单据状态 */
export type DeliveryState =
  | '入库完成'
  | '已检待入库'
  | '待检'
  | '不合格待判定'
  | '其他';

/** 数据来源 */
export type DeliverySource = 'warehouse' | 'feishu';

/** 匹配级别 */
export type MatchLevel = 'strong' | 'weak' | 'fuzzy' | 'unique';

/** 到货记录 */
export interface IDeliveryRecord {
  id: number;
  project_id: number;
  /** 送货单号 */
  delivery_code: string;
  /** 单据状态 */
  state: DeliveryState;
  /** 零件号 */
  part_code: string;
  /** 零件名 */
  part_name: string;
  /** 订单数量 */
  order_qty: number;
  /** 收货数量 */
  received_qty: number;
  /** 入库数量 */
  in_qty: number;
  /** 不合格数量 */
  unqualified_qty: number;
  /** 到货仓库 */
  warehouse: string;
  /** 专业师 */
  professional: string;
  /** 数据来源 */
  source: DeliverySource;
  /** 匹配级别 */
  match_level: MatchLevel;
  /** 收货时间 */
  recive_time: string;
}

// ─── 项目配置（车型/配置列）─────────────────────────────────

/** 配置状态 */
export type ConfigStatus = 'safe' | 'warning' | 'danger';

/** 项目配置（车型/配置列） */
export interface IProjectConfig {
  id: number;
  project_id: number;
  /** 配置编码，如 M101 */
  config_name: string;
  /** 配置别名，如 "标准续航版" */
  config_alias: string;
  /** 零件数量 */
  part_count: number;
  /** 值范围 */
  value_range: string;
  /** 关键件总数 */
  key_parts_total: number;
  /** 关键件已到货数 */
  key_parts_ready: number;
  /** 齐套率（0-100） */
  ready_rate: number;
  /** 状态 */
  status: ConfigStatus;
}

// ─── 待检 / 不合格汇总 ──────────────────────────────────────

/** 专业师汇总统计 */
export interface IProfessionalSummary {
  /** 专业师名称 */
  professional: string;
  /** 待检/不合格数量 */
  quantity: number;
  /** 涉及送货单数 */
  delivery_count: number;
}

/** 待检明细行 */
export interface IInspectionItem {
  /** 送货单号 */
  delivery_code: string;
  /** 零件号 */
  part_code: string;
  /** 零件名 */
  part_name: string;
  /** 专业师 */
  professional: string;
  /** 订单数量 */
  order_qty: number;
  /** 收货数量 */
  received_qty: number;
}

/** 不合格明细行 */
export interface IUnqualifiedItem {
  /** 送货单号 */
  delivery_code: string;
  /** 零件号 */
  part_code: string;
  /** 零件名 */
  part_name: string;
  /** 专业师 */
  professional: string;
  /** 不合格数量 */
  unqualified_qty: number;
  /** 订单数量 */
  order_qty: number;
  /** 不合格率（0-100） */
  unqualified_rate: number;
}

// ─── 装车计划 AI 推荐 ───────────────────────────────────────

/** 多目标权重配置 */
export interface IAssemblyWeights {
  /** 齐套率权重 α，默认 0.5 */
  completeness: number;
  /** 工时均衡权重 β，默认 0.3 */
  workload_balance: number;
  /** 风险分散权重 γ，默认 0.2 */
  risk_dispersion: number;
}

/** 装配推荐状态 */
export type AssemblyStatus = 'ready' | 'warning' | 'blocked';

/** 缺件信息 */
export interface IMissingPart {
  /** 零件号 */
  part_code: string;
  /** 零件名 */
  part_name: string;
  /** 缺口数量 */
  shortage_qty: number;
  /** 预计到货日期 */
  estimated_arrival: string;
}

/** 装配顺序推荐项 */
export interface IAssemblyRecommendation {
  /** 配置ID */
  config_id: number;
  /** 车型/配置名 */
  config_name: string;
  /** 配置别名 */
  config_alias: string;
  /** 关键件齐套率（0-100） */
  ready_rate: number;
  /** 当前状态 */
  status: AssemblyStatus;
  /** 缺件清单（若 status 为 blocked/warning） */
  missing_parts: IMissingPart[];
  /** 推荐排序权重分 */
  score: number;
}

// ─── 系统设置 ────────────────────────────────────────────────

/** 爬虫运行状态 */
export type SpiderStatus = 'running' | 'idle' | 'error' | 'paused';

/** 爬虫状态信息 */
export interface ISpiderStatusInfo {
  status: SpiderStatus;
  last_run: string;
  next_run: string;
}

/** 爬虫日志级别 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

/** 爬虫日志条目 */
export interface ISpiderLog {
  timestamp: string;
  level: LogLevel;
  content: string;
}

/** 凭证信息 */
export interface ICredentials {
  authorization: string;
  cookie: string;
  last_updated: string;
  is_valid: boolean;
}

/** 系统参数阈值 */
export interface ISystemThresholds {
  /** 关键件分数下限（默认 4.0） */
  critical_min: number;
  /** 次关键件分数下限（默认 3.0） */
  sub_critical_min: number;
  /** 到货率安全阈值（默认 95） */
  delivery_safe: number;
  /** 到货率预警阈值（默认 80） */
  delivery_warning: number;
}

// ─── 饼状图数据 ──────────────────────────────────────────────

/** 到货状态分布项 */
export interface IDeliveryStateDistribution {
  state: DeliveryState;
  count: number;
  percentage: number;
  color: string;
}

// ─── PBOM 列检测 ────────────────────────────────────────────

/** 列类型 */
export type ColumnType = 'config' | 'metadata' | 'unknown';

/** PBOM 列检测结果项 */
export interface IColumnDetectionResult {
  column_name: string;
  column_type: ColumnType;
  confidence: number;
  reason: string;
}
