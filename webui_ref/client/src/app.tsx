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
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
