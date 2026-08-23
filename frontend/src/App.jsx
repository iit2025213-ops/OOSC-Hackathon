import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import CasePage from './pages/CasePage';
import ActionPlanPage from './pages/ActionPlanPage';
import SchemeNavigatorPage from './pages/SchemeNavigatorPage';
import MyCasesPage from './pages/MyCasesPage';
import DocumentsPage from './pages/DocumentsPage';
import PlansListPage from './pages/PlansListPage';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import StaticPage from './pages/StaticPage';
import { staticContent } from './pages/staticContent';
import WorkflowPage from './pages/WorkflowPage';
import FormFillerPage from './pages/FormFillerPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/workflow" element={<WorkflowPage />} />
      
      {/* Static Informational Pages */}
      <Route path="/privacy" element={<StaticPage {...staticContent.privacy} />} />
      <Route path="/terms" element={<StaticPage {...staticContent.terms} />} />
      <Route path="/disclaimer" element={<StaticPage {...staticContent.disclaimer} />} />
      <Route path="/contact" element={<StaticPage {...staticContent.contact} />} />
      <Route path="/press" element={<StaticPage {...staticContent.press} />} />
      <Route path="/how-it-works" element={<StaticPage {...staticContent.howItWorks} />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <HomePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/cases"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MyCasesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/documents"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DocumentsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/plans"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PlansListPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/schemes"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SchemeNavigatorPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/case/:caseId"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CasePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/case/:caseId/plan"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ActionPlanPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/forms"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FormFillerPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
