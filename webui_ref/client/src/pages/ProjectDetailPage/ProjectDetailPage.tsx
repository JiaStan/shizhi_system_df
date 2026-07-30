import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PackageIcon,
  TruckIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Sections — 到货监控
import PbomUploadSection from './PbomUploadSection';
import CriticalPartsSection from './CriticalPartsSection';
import DeliveryStatusSection from './DeliveryStatusSection';
import DeliveryDetailSection from './DeliveryDetailSection';
import UnmatchedPartsSection from './UnmatchedPartsSection';
import ProjectKpiSection from './ProjectKpiSection';
import CriticalReadinessSection from './CriticalReadinessSection';

// Sections — 装车计划
import AssemblyPlanImportSection from '../AssemblyPlanPage/AssemblyPlanImportSection';
import RecommendationListSection from '../AssemblyPlanPage/RecommendationListSection';
import WeightControlSection from '../AssemblyPlanPage/WeightControlSection';
import AiExplanationSection from '../AssemblyPlanPage/AiExplanationSection';

// Static data
import projectsData from '@shared/static/projects.json';
import type { IProject } from '@/types';

const projects: IProject[] = projectsData as IProject[];

const STORAGE_KEY = '__global_dfmc_currentProject';

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // 根据 URL 初始化 tab：/projects/:id/assembly-plan → assembly
  const isAssemblyUrl = location.pathname.endsWith('/assembly-plan');
  const [activeTab, setActiveTab] = useState<'monitor' | 'assembly'>(
    isAssemblyUrl ? 'assembly' : 'monitor'
  );

  // URL 变化时同步 tab 状态
  useEffect(() => {
    setActiveTab(location.pathname.endsWith('/assembly-plan') ? 'assembly' : 'monitor');
  }, [location.pathname]);

  const project = useMemo(() => {
    if (!id) return null;
    return projects.find((p) => p.id === Number(id)) ?? null;
  }, [id]);

  // Store current project in sessionStorage for cross-page sharing
  useEffect(() => {
    if (project) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        // ignore
      }
    }
    return () => {
      sessionStorage.removeItem(STORAGE_KEY);
    };
  }, [project]);

  // Tab 切换 — 仅切换内容，不跳转页面
  const handleTabChange = (tab: 'monitor' | 'assembly') => {
    setActiveTab(tab);
  };

  if (!project) {
    return (
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="w-full space-y-6"
      >
        <div className="w-full bg-card border border-border rounded-sm p-12 text-center">
          <PackageIcon className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            项目不存在
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            未找到 ID 为「{id}」的项目，请返回项目列表查看
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            返回项目概览
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6"
    >
      {/* ── Tab Switch ───────────────────────────────── */}
      <div className="w-full border-b border-slate-100">
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => handleTabChange('monitor')}
            className={`
              relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors
              ${
                activeTab === 'monitor'
                  ? 'text-[#1a1a1a]'
                  : 'text-slate-400 hover:text-slate-600'
              }
            `}
          >
            <TruckIcon className="size-4" />
            <span>到货监控</span>
            {activeTab === 'monitor' && (
              <motion.div
                layoutId="project-detail-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] rounded-full"
                transition={{ type: 'tween', duration: 0.2 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('assembly')}
            className={`
              relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors
              ${
                activeTab === 'assembly'
                  ? 'text-[#1a1a1a]'
                  : 'text-slate-400 hover:text-slate-600'
              }
            `}
          >
            <PackageIcon className="size-4" />
            <span>装车计划</span>
            {activeTab === 'assembly' && (
              <motion.div
                layoutId="project-detail-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] rounded-full"
                transition={{ type: 'tween', duration: 0.2 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ── 到货监控 Tab ── */}
      {activeTab === 'monitor' && (
        <div className="w-full space-y-6">
          <ProjectKpiSection />
          <PbomUploadSection />
          <CriticalPartsSection />
          <DeliveryStatusSection />
          <CriticalReadinessSection />
          <DeliveryDetailSection />
          <UnmatchedPartsSection />
        </div>
      )}

      {/* ── 装车计划 Tab ── */}
      {activeTab === 'assembly' && (
        <div className="w-full space-y-6">
          <AssemblyPlanImportSection />
          <RecommendationListSection />
          <WeightControlSection />
          <AiExplanationSection />
        </div>
      )}
    </motion.div>
  );
}
