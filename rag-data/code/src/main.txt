import { Buffer } from "buffer"
window.Buffer = Buffer
import Index from './pages/Index.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { ClaimPage } from './App.tsx'
import { AdminPanel } from './AdminPanel.tsx'
import { AuthPage } from './AuthPage.tsx'
import { AdminDashboard } from './AdminDashboard.tsx'
import AnalyticsDashboard from './AnalyticsDashboard.tsx'
import { ProjectPage } from './ProjectPage.tsx'
import { SuperAdmin } from './SuperAdmin.tsx'
import { SubscriptionPage } from './SubscriptionPage.tsx'
import { ResetPasswordPage } from './ResetPasswordPage.tsx'
import WebhookDashboard from './WebhookDashboard.tsx'
import FraudDashboard from './FraudDashboard.tsx'
import { ThemeProvider } from './ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/claim" element={<ClaimPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/project/:projectId" element={<ProjectPage />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/webhooks" element={<WebhookDashboard />} />
        <Route path="/fraud" element={<FraudDashboard />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)// force rebuild
