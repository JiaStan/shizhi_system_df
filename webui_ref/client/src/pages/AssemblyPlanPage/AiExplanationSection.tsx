import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRightIcon, BrainCircuitIcon, RefreshCwIcon, SparklesIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Streamdown } from '@/components/ui/streamdown';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import configsData from '@shared/static/configs.json';
import projectsData from '@shared/static/projects.json';
import type { IProjectConfig, IProject } from '@/types';

const configs: IProjectConfig[] = configsData as IProjectConfig[];
const projects: IProject[] = projectsData as IProject[];

const PLUGIN_ID = 'loading_plan_whitebox_explain_1';
const ACTION_KEY = 'textGenerate';

function buildExplanationInput(
  project: IProject,
  projectConfigs: IProjectConfig[]
): string {
  const sorted = [...projectConfigs].sort((a, b) => b.ready_rate - a.ready_rate);
  const lines = sorted.map((cfg, idx) => {
    const statusLabel =
      cfg.ready_rate >= 95 ? '🟢可装' : cfg.ready_rate >= 80 ? '🟡预警' : '🔴阻塞';
    return `${idx + 1}. ${cfg.config_name}(${cfg.config_alias}) — 齐套率 ${cfg.ready_rate}% — ${statusLabel} — 关键件 ${cfg.key_parts_ready}/${cfg.key_parts_total}`;
  });

  return [
    `项目：${project.project_name || project.project_code}`,
    `项目号：${project.project_code}，申请单号：${project.apply_code}`,
    `整体到货率：${project.delivery_rate}%，关键件齐套率：${project.critical_ready_rate}%`,
    '',
    '装配推荐顺序：',
    ...lines,
    '',
    '请解释为什么推荐这样的装配顺序，涉及哪些供应商风险、工艺连续性等因素。',
  ].join('\n');
}

export default function AiExplanationSection() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const project = projects.find((p) => p.id === projectId);
  const projectConfigs = configs.filter((c) => c.project_id === projectId);

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasExplained, setHasExplained] = useState(false);

  const handleExplain = useCallback(async () => {
    if (!project || projectConfigs.length === 0) return;

    setStreamingText('');
    setIsStreaming(true);
    setHasExplained(true);

    try {
      const input = buildExplanationInput(project, projectConfigs);
      const stream = capabilityClient
        .load(PLUGIN_ID)
        .callStream<{ content: string }>(ACTION_KEY, { assembly_data: input });

      for await (const chunk of stream) {
        setStreamingText((prev) => prev + (chunk.content || ''));
      }
    } catch (err) {
      logger.error('AI 装车计划解释生成失败', err);
      setStreamingText('生成失败，请稍后重试。');
    } finally {
      setIsStreaming(false);
    }
  }, [project, projectConfigs]);

  const handleReset = useCallback(() => {
    setStreamingText('');
    setHasExplained(false);
  }, []);

  if (!project) return null;

  return (
    <section className="w-full space-y-4">
      {/* 区块标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuitIcon className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI 推理白盒解释</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasExplained && !isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleReset}
            >
              <RefreshCwIcon className="size-3.5 mr-1.5" />
              重新生成
            </Button>
          )}
        </div>
      </div>

      {/* 面包屑 */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          to="/"
          className="hover:text-foreground transition-colors"
        >
          项目概览
        </Link>
        <ChevronRightIcon className="size-3" />
        <Link
          to={`/projects/${projectId}`}
          className="hover:text-foreground transition-colors"
        >
          {project.project_name || project.project_code}
        </Link>
        <ChevronRightIcon className="size-3" />
        <span className="text-foreground font-medium">装车计划AI推荐</span>
      </nav>

      {/* AI 解释卡片 */}
      <Card className="border-l-3 border-l-primary rounded-sm shadow-none">
        <CardContent className="p-5 space-y-4">
          {/* 卡片头部 */}
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10">
              <SparklesIcon className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                装车顺序推理说明
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI 将基于当前各配置的齐套率与缺件情况，解释推荐排列顺序的依据
              </p>
            </div>
          </div>

          {/* 生成按钮 / 流式输出区域 */}
          {!hasExplained ? (
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleExplain}
                disabled={projectConfigs.length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
              >
                <BrainCircuitIcon className="size-4 mr-2" />
                生成 AI 解释
              </Button>
              {projectConfigs.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  该项目暂无配置数据，无法生成解释
                </span>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* 流式输出状态指示 */}
              {isStreaming && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs text-muted-foreground">AI 正在推理分析中…</span>
                </div>
              )}

              {/* 流式 Markdown 渲染 */}
              {streamingText ? (
                <div className="rounded-sm bg-accent/30 border border-border/60 p-4">
                  <Streamdown>{streamingText}</Streamdown>
                  {isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              ) : isStreaming ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <RefreshCwIcon className="size-4 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">正在连接 AI 模型…</span>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据依据摘要 */}
      {projectConfigs.length > 0 && (
        <Card className="rounded-sm shadow-none">
          <CardContent className="p-5">
            <h4 className="text-sm font-medium text-foreground mb-3">推理数据摘要</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {projectConfigs.map((cfg) => {
                const isSafe = cfg.ready_rate >= 95;
                const isWarning = cfg.ready_rate >= 80 && cfg.ready_rate < 95;
                const statusColor = isSafe
                  ? 'border-t-[hsl(152_55%_40%)] text-[hsl(152_60%_22%)] bg-[hsl(152_45%_95%)]'
                  : isWarning
                    ? 'border-t-[hsl(40_70%_50%)] text-[hsl(40_65%_25%)] bg-[hsl(40_75%_94%)]'
                    : 'border-t-[hsl(4_65%_48%)] text-[hsl(4_60%_28%)] bg-[hsl(4_55%_95%)]';
                const statusLabel = isSafe ? '可装' : isWarning ? '预警' : '阻塞';

                return (
                  <div
                    key={cfg.id}
                    className={`rounded-sm border border-border/60 border-t-2 p-3 ${statusColor.split(' ')[2]}`}
                    style={{ borderTopColor: statusColor.includes('152') ? 'hsl(152 55% 40%)' : statusColor.includes('40') ? 'hsl(40 70% 50%)' : 'hsl(4 65% 48%)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {cfg.config_name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          isSafe
                            ? 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border-[hsl(152_55%_40%)]'
                            : isWarning
                              ? 'bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)] border-[hsl(40_70%_50%)]'
                              : 'bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] border-[hsl(4_65%_48%)]'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-base font-bold font-mono tracking-tight text-foreground">
                      {cfg.ready_rate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      关键件 {cfg.key_parts_ready}/{cfg.key_parts_total}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
