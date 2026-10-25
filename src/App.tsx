import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthContext"
import { Layout } from "./components/Layout"
import { RequireAuth } from "./components/RequireAuth"
import { LearnPage } from "./learn/LearnPage"
import { NodeScope } from "./org/NodeScope"
import { OrgsProvider } from "./org/OrgsContext"
import { AuditPage } from "./pages/AuditPage"
import { BindingsPage } from "./pages/BindingsPage"
import { CallbackPage } from "./pages/CallbackPage"
import { HomePage } from "./pages/HomePage"
import { InvitesPage } from "./pages/InvitesPage"
import { LoginPage } from "./pages/LoginPage"
import { MembersPage } from "./pages/MembersPage"
import { OrgsPage } from "./pages/OrgsPage"
import { ProjectsPage } from "./pages/ProjectsPage"
import { ServiceAccountsPage } from "./pages/ServiceAccountsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { TasksPage } from "./pages/TasksPage"
import { UserKeysPage } from "./pages/UserKeysPage"
import { UserPage } from "./pages/UserPage"

// Paths mirror the gateway's: /user/…, /orgs/{organization}/…, and
// /orgs/{organization}/projects/{project}/…, by slug.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrgsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="callback" element={<CallbackPage />} />
              <Route path="learn" element={<LearnPage />} />
              <Route
                path="user"
                element={
                  <RequireAuth>
                    <UserPage />
                  </RequireAuth>
                }
              />
              <Route
                path="user/keys"
                element={
                  <RequireAuth>
                    <UserKeysPage />
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
                path="orgs/:org"
                element={
                  <RequireAuth>
                    <NodeScope kind="organization" param="org" />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="projects" replace />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="bindings" element={<BindingsPage />} />
                <Route path="service-accounts" element={<ServiceAccountsPage />} />
                <Route path="invites" element={<InvitesPage />} />
                <Route path="audit-events" element={<AuditPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="projects/:project" element={<NodeScope kind="project" param="project" />}>
                  <Route index element={<Navigate to="tasks" replace />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="bindings" element={<BindingsPage />} />
                  <Route path="service-accounts" element={<ServiceAccountsPage />} />
                  <Route path="invites" element={<InvitesPage />} />
                  <Route path="audit-events" element={<AuditPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </OrgsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
