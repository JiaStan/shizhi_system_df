import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage/ProjectDetailPage';
import PendingInspectionPage from './pages/PendingInspectionPage/PendingInspectionPage';
import UnqualifiedPendingPage from './pages/UnqualifiedPendingPage/UnqualifiedPendingPage';
import AssemblyPlanPage from './pages/AssemblyPlanPage/AssemblyPlanPage';
import AllPartsPage from './pages/AllPartsPage/AllPartsPage';
import AuditLogPage from './pages/AuditLogPage/AuditLogPage';
import SystemSettingsPage from './pages/SystemSettingsPage/SystemSettingsPage';

// 试制资源模块页面
import ResourceDashboardPage from './pages/ResourceDashboardPage/ResourceDashboardPage';
import EquipmentLedgerPage from './pages/EquipmentLedgerPage/EquipmentLedgerPage';
import CampusMapPage from './pages/CampusMapPage/CampusMapPage';
import ResourceBoardPage from './pages/ResourceBoardPage/ResourceBoardPage';
import PersonnelBoardPage from './pages/PersonnelBoardPage/PersonnelBoardPage';
import GanttSchedulePage from './pages/GanttSchedulePage/GanttSchedulePage';
import PersonnelEfficiencyPage from './pages/PersonnelEfficiencyPage/PersonnelEfficiencyPage';
import AlertCenterPage from './pages/AlertCenterPage/AlertCenterPage';
import TaskManagementPage from './pages/TaskManagementPage/TaskManagementPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/pending-inspection" element={<PendingInspectionPage />} />
        <Route path="projects/:id/unqualified-pending" element={<UnqualifiedPendingPage />} />
        <Route path="projects/:id/assembly-plan" element={<AssemblyPlanPage />} />
        <Route path="all-parts" element={<AllPartsPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
        
        {/* 试制资源模块路由 */}
        <Route path="resource/dashboard" element={<ResourceDashboardPage />} />
        <Route path="resource/equipment" element={<EquipmentLedgerPage />} />
        <Route path="resource/zones" element={<CampusMapPage />} />
        <Route path="resource/utilization" element={<ResourceBoardPage />} />
        <Route path="resource/personnel" element={<PersonnelBoardPage />} />
        <Route path="resource/gantt" element={<GanttSchedulePage />} />
        <Route path="resource/efficiency" element={<PersonnelEfficiencyPage />} />
        <Route path="resource/alerts" element={<AlertCenterPage />} />
        <Route path="resource/tasks" element={<TaskManagementPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
