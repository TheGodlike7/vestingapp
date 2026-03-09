import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AdminPanel } from './AdminPanel.tsx'
import { AuthPage } from './AuthPage.tsx'
import { Dashboard } from './Dashboard.tsx'
import { ProjectPage } from './ProjectPage.tsx'
import { SuperAdmin } from './SuperAdmin.tsx'
import { SubscriptionPage } from './SubscriptionPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<ProjectPage />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)