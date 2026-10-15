import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuditLogPage } from "./pages/AuditLogPage"
import { AuthProvider } from "./auth/AuthContext"
import { Layout } from "./components/Layout"
import { RequireAuth } from "./components/RequireAuth"
import { OrgProvider } from "./org/OrgContext"
import { ApiKeysPage } from "./pages/ApiKeysPage"
import { CallbackPage } from "./pages/CallbackPage"
import { HomePage } from "./pages/HomePage"
import { LearnPage } from "./learn/LearnPage"
import { LoginPage } from "./pages/LoginPage"
import { OrgDetailPage } from "./pages/OrgDetailPage"
import { OrgsPage } from "./pages/OrgsPage"
import { ProfilePage } from "./pages/ProfilePage"
import { ProjectDetailPage } from "./pages/ProjectDetailPage"
import { ProjectsPage } from "./pages/ProjectsPage"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrgProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="callback" element={<CallbackPage />} />
              <Route path="learn" element={<LearnPage />} />
              <Route
                path="profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="orgs"
                element={
                  <RequireAuth>
                    <OrgsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="orgs/:orgId/:section?"
                element={
                  <RequireAuth>
                    <OrgDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="api-keys"
                element={
                  <RequireAuth>
                    <ApiKeysPage />
                  </RequireAuth>
                }
              />
              <Route
                path="projects"
                element={
                  <RequireAuth>
                    <ProjectsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="projects/:projectId"
                element={
                  <RequireAuth>
                    <ProjectDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="audit"
                element={
                  <RequireAuth>
                    <AuditLogPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </OrgProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
