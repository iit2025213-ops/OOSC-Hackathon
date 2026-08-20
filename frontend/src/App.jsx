import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import IntakePage from './pages/IntakePage';
import CaseOverviewPage from './pages/CaseOverviewPage';
import ActionPlanPage from './pages/ActionPlanPage';
import MyCasesPage from './pages/MyCasesPage';
import DocumentsPage from './pages/DocumentsPage';
import PlansListPage from './pages/PlansListPage';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import StaticPage from './pages/StaticPage';
import { staticContent } from './pages/staticContent';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      
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
        path="/dashboard/intake"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <IntakePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/case/:caseId"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CaseOverviewPage />
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

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
