import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboardIcon, SettingsIcon, ChevronUpIcon, FactoryIcon, PackageIcon, 
  SearchIcon, BellIcon, FileTextIcon, ChevronRightIcon,
  MonitorIcon, CpuIcon, MapIcon, BarChart3Icon, UsersIcon,
  CalendarIcon, TrendingUpIcon, AlertTriangleIcon, ClipboardListIcon,
  BuildingIcon
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { Button } from '@/components/ui/button';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import projectsData from '@shared/static/projects.json';
import type { IProject } from '@/types';

const projectsList: IProject[] = projectsData as IProject[];

const NAV_ITEMS = [
  { path: '/', label: '项目概览', icon: LayoutDashboardIcon },
  { path: '/all-parts', label: '仓库到货', icon: PackageIcon },
  { path: '/audit-log', label: '操作日志', icon: FileTextIcon },
  { path: '/settings', label: '系统设置', icon: SettingsIcon },
];

// 试制资源模块导航项
const RESOURCE_NAV_ITEMS = [
  { path: '/resource/dashboard', label: '综合驾驶舱', icon: MonitorIcon },
  { path: '/resource/equipment', label: '设备台账', icon: CpuIcon },
  { path: '/resource/zones', label: '园区地图', icon: MapIcon },
  { path: '/resource/utilization', label: '资源占用', icon: BarChart3Icon },
  { path: '/resource/personnel', label: '人员看板', icon: UsersIcon },
  { path: '/resource/gantt', label: '甘特排程', icon: CalendarIcon },
  { path: '/resource/efficiency', label: '人效分析', icon: TrendingUpIcon },
  { path: '/resource/alerts', label: '异常预警', icon: AlertTriangleIcon },
  { path: '/resource/tasks', label: '任务管理', icon: ClipboardListIcon },
];

/* ── 面包屑标题映射（路由 → 页面名称） ── */
const BC: Record<string, string> = {
  '/': '项目概览',
  '/all-parts': '仓库到货',
  '/audit-log': '操作日志',
  '/settings': '系统设置',
  // 试制资源模块
  '/resource/dashboard': '综合驾驶舱',
  '/resource/equipment': '设备台账',
  '/resource/zones': '园区地图',
  '/resource/utilization': '资源占用',
  '/resource/personnel': '人员看板',
  '/resource/gantt': '甘特排程',
  '/resource/efficiency': '人效分析',
  '/resource/alerts': '异常预警',
  '/resource/tasks': '任务管理',
};

function Breadcrumb() {
  const { pathname } = useLocation();
  // 强制每次路由变化时重新渲染，确保读取最新 sessionStorage
  const [, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, [pathname]);

  const getProjectName = (id: string) => {
    // 优先 sessionStorage（ProjectDetailPage 设置）
    try {
      const raw = sessionStorage.getItem('__global_dfmc_currentProject');
      if (raw) {
        const p = JSON.parse(raw) as IProject;
        if (String(p.id) === id) return p.project_name || p.project_code || '项目';
      }
    } catch { /* ignore */ }
    // 兑底：从导入的 projects 数据中按 ID 查找
    const found = projectsList.find((p) => String(p.id) === id);
    return found?.project_name || found?.project_code || '项目';
  };

  const segs = pathname.split('/').filter(Boolean); // e.g. ['projects', '1', 'assembly-plan']
  const isProjectRoute = segs[0] === 'projects';
  const currentLabel = BC[pathname];

  /* ── 试制资源模块路由 ── */
  const isResourceRoute = segs[0] === 'resource';
  if (isResourceRoute && currentLabel) {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">首页</Link>
        <ChevronRightIcon className="size-3.5 text-border shrink-0" />
        <Link to="/resource/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">试制资源</Link>
        <ChevronRightIcon className="size-3.5 text-border shrink-0" />
        <span className="font-medium text-foreground">{currentLabel}</span>
      </nav>
    );
  }

  /* ── 项目详情页 或 项目子页面（统一显示两级） ── */
  if (isProjectRoute && segs.length >= 2) {
    // assembly-plan 作为 Tab 内嵌，不显示第三层级
    const isStandaloneSubPage = segs.length >= 3 && segs[2] !== 'assembly-plan';
    const subLabels: Record<string, string> = {
      'pending-inspection': '待检明细',
      'unqualified-pending': '不合格待判定',
    };
    const sub = isStandaloneSubPage ? (subLabels[segs[2]] || segs[2]) : null;

    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">项目概览</Link>
        <ChevronRightIcon className="size-3.5 text-border shrink-0" />
        {sub ? (
          <>
            <Link to={`/projects/${segs[1]}`} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-36">{getProjectName(segs[1])}</Link>
            <ChevronRightIcon className="size-3.5 text-border shrink-0" />
            <span className="font-medium text-foreground">{sub}</span>
          </>
        ) : (
          <span className="font-medium text-foreground truncate max-w-48">{getProjectName(segs[1])}</span>
        )}
      </nav>
    );
  }

  /* ── 一级页面（非首页） ── */
  if (currentLabel && currentLabel !== '项目概览') {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">项目概览</Link>
        <ChevronRightIcon className="size-3.5 text-border shrink-0" />
        <span className="font-medium text-foreground">{currentLabel}</span>
      </nav>
    );
  }

  /* ── 首页 ── */
  return (
    <nav className="flex items-center gap-2 text-sm">
      <span className="font-medium text-foreground">项目概览</span>
    </nav>
  );
}

function LayoutContent() {
  const { pathname } = useLocation();
  const userInfo = useCurrentUserProfile();
  const [searchOpen, setSearchOpen] = useState(false);


  // 路由切换时滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const handleLogout = async () => {
    const dataloom = await getDataloom();
    await dataloom.service.session.signOut();
    window.location.reload();
  };

  const renderNavItems = () =>
    NAV_ITEMS.map((item) => (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton asChild isActive={pathname === item.path}>
          <Link to={item.path}>
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const renderResourceNavItems = () =>
    RESOURCE_NAV_ITEMS.map((item) => (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton asChild isActive={pathname === item.path}>
          <Link to={item.path}>
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const renderLogo = (collapsed = false) => (
    <>
      <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-2xl bg-[#d6e9e9]">
        <FactoryIcon className="size-4 text-[#1a1a1a]" />
      </div>
      <div
        className={`grid flex-1 text-left text-sm leading-tight ${collapsed ? 'hidden' : ''}`}
      >
        <span className="truncate font-bold text-[#1a1a1a] tracking-tight">
          现场-仓储同步
        </span>
        <span className="truncate text-xs text-slate-400">PBOM 智能装配系统</span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar collapsible="icon" variant="sidebar">
        {/* Brand */}
        <SidebarHeader className="border-b border-slate-100 px-3 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  {renderLogo()}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {/* 荧光绿 2px 底部装饰线 */}
          <div className="mt-3 h-0.5 bg-[#e2f163] rounded-full" />
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent>
          {/* 主菜单 */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderNavItems()}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 试制资源模块 */}
          <SidebarGroup>
            <SidebarGroupLabel>试制资源</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderResourceNavItems()}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User Footer */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      {(userInfo.name || '用')[0]}
                    </div>
                    <span className="truncate text-slate-600">
                      {userInfo.name || '用户'}
                    </span>
                    <ChevronUpIcon className="ml-auto size-3.5 text-slate-400" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem onClick={handleLogout}>
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header Bar - 面包屑 + 用户信息 */}
        <header className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm px-6 lg:px-10 py-3.5">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" />
            <Breadcrumb />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <SearchIcon className="size-3.5" />
              <span className="hidden sm:inline">搜索</span>

            </button>
            <NotificationCenter />
            <span>{userInfo.name || '用户'}</span>
          </div>
        </header>

        {/* Page Content - 薄荷荧光风格大间距 */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 min-w-0">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <style jsx>{`
        :global([data-sidebar="sidebar"]) {
          background: #ffffff !important;
          border-right-color: #e2e8f0 !important;
        }
        :global([data-sidebar="sidebar-inner"]) {
          background: #ffffff !important;
        }
        :global([data-slot="sidebar-container"]) {
          border-right-color: #e2e8f0 !important;
        }
        :global([data-sidebar="menu-button"]:hover) {
          background: #f1f5f9 !important;
          color: #1a1a1a !important;
        }
        :global([data-sidebar="menu-button"][data-active="true"]) {
          background: #1a1a1a !important;
          color: #ffffff !important;
        }
        :global([data-sidebar="menu-button"][data-active="true"]:hover) {
          background: #333333 !important;
        }
        :global([data-sidebar="trigger"]) {
          color: #64748b !important;
        }
        :global([data-sidebar="trigger"]:hover) {
          background: #f1f5f9 !important;
          color: #1a1a1a !important;
        }
        /* 试制资源模块分组标签样式 */
        :global([data-sidebar="group-label"]) {
          color: #64748b !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.05em !important;
        }
        /* 深色主题支持 */
        @media (prefers-color-scheme: dark) {
          :global([data-sidebar="sidebar"]) {
            background: #1a1a1a !important;
            border-right-color: #333333 !important;
          }
          :global([data-sidebar="sidebar-inner"]) {
            background: #1a1a1a !important;
          }
          :global([data-slot="sidebar-container"]) {
            border-right-color: #333333 !important;
          }
          :global([data-sidebar="menu-button"]:hover) {
            background: #333333 !important;
            color: #ffffff !important;
          }
          :global([data-sidebar="menu-button"][data-active="true"]) {
            background: #e2f163 !important;
            color: #1a1a1a !important;
          }
          :global([data-sidebar="menu-button"][data-active="true"]:hover) {
            background: #c8d94f !important;
          }
          :global([data-sidebar="group-label"]) {
            color: #94a3b8 !important;
          }
        }
      `}</style>
    </>
  );
}

const Layout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default Layout;
