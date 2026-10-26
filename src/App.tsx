import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { CHAIN, isRoot, KINDS } from "./api/tree"
import { AuthProvider } from "./auth/AuthContext"
import { Layout } from "./components/Layout"
import { RequireAuth } from "./components/RequireAuth"
import { LearnPage } from "./learn/LearnPage"
import { NodeScope } from "./org/NodeScope"
import { OrgsProvider } from "./org/OrgsContext"
import { AuditPage } from "./pages/AuditPage"
import { BindingsPage } from "./pages/BindingsPage"
import { CallbackPage } from "./pages/CallbackPage"
import { ChildrenPage } from "./pages/ChildrenPage"
import { HomePage } from "./pages/HomePage"
import { InvitesPage } from "./pages/InvitesPage"
import { LoginPage } from "./pages/LoginPage"
import { MembersPage } from "./pages/MembersPage"
import { OrgsPage } from "./pages/OrgsPage"
import { ServiceAccountsPage } from "./pages/ServiceAccountsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { TasksPage } from "./pages/TasksPage"
import { UserKeysPage } from "./pages/UserKeysPage"
import { UserPage } from "./pages/UserPage"

// Paths mirror the gateway's, by slug: /user/…, /orgs/{organization}/…,
// /orgs/{organization}/projects/{project}/…, and …/envs/{environment}/….
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
                element={
                  <RequireAuth>
                    <Outlet />
                  </RequireAuth>
                }
              >
                {nodeRoutes(CHAIN[0]!)}
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </OrgsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

/**
 * A kind's pages, and its child kind's below them: each node has Access, Invites,
 * Audit log and Settings; its children's list, or at the bottom, your API's tasks;
 * Members on a root; Service accounts where they belong.
 */
function nodeRoutes(kind: string) {
  const k = KINDS[kind]!
  return (
    <Route path={`${k.collection}/:${kind}`} element={<NodeScope kind={kind} param={kind} />}>
      <Route index element={<Navigate to={k.home} replace />} />
      {k.child && <Route path={KINDS[k.child]!.collection} element={<ChildrenPage kind={k.child} />} />}
      {!k.child && <Route path="tasks" element={<TasksPage />} />}
      {isRoot(kind) && <Route path="members" element={<MembersPage />} />}
      <Route path="bindings" element={<BindingsPage />} />
      {k.serviceAccounts && <Route path="service-accounts" element={<ServiceAccountsPage />} />}
      <Route path="invites" element={<InvitesPage />} />
      <Route path="audit-events" element={<AuditPage />} />
      <Route path="settings" element={<SettingsPage />} />
      {k.child && nodeRoutes(k.child)}
    </Route>
  )
}
