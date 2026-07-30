// ---- plugin:loading_plan_whitebox_explain_1 ----
// ============================================================
// 插件 loading_plan_whitebox_explain_1 (装车计划白盒解释插件) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface LoadingPlanWhiteboxExplainOneInput {
  /** 当前装配推荐数据，包含车型、配置、齐套率、缺件清单等信息 */
  assembly_data: string;
}

/**
 * capabilityClient.load('loading_plan_whitebox_explain_1').call<LoadingPlanWhiteboxExplainOneOutput>('textGenerate', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { content, response } = result;
 */
export interface LoadingPlanWhiteboxExplainOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:loading_plan_whitebox_explain_1 ----

// ---- plugin:pbom_column_header_recognition_1 ----
// ============================================================
// 插件 pbom_column_header_recognition_1 (PBOM列头智能识别) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface PbomColumnHeaderRecognitionOneInput {
  /** 待识别的Excel列名文本，多个列名用换行或逗号分隔 */
  excel_column_names: string;
}

/**
 * capabilityClient.load('pbom_column_header_recognition_1').call<PbomColumnHeaderRecognitionOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { column_list } = result;
 */
export interface PbomColumnHeaderRecognitionOneOutput {
  /** 列识别结果列表，items schema: {column_name: string(列名), column_type: string(列类型，只能是config/metadata/unknown), confidence: number(置信度0-1), reason: string(判断理由)} */
  column_list: unknown[];
}
// ---- end:pbom_column_header_recognition_1 ----