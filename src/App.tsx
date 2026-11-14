import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Spinner from './components/ui/Spinner';
import HotspotUploadProvider from './context/HotspotUploadProvider';
import QueryProvider from './context/QueryProvider';
import ThemeProvider from './context/ThemeProvider';
import UploadProvider from './context/UploadProvider';
import NotFound from './pages/NotFound';
import SlidesPage from './pages/SlidesPage';
import HotspotsPage from './pages/HotspotsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import FirstLoginPage from './pages/auth/FirstLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import UsersPage from './pages/admin/UsersPage';
import CellTypesPage from './pages/admin/CellTypesPage';
import TagsPage from './pages/admin/TagsPage';
import ProfilePage from './pages/auth/ProfilePage';
import StatsPage from './pages/admin/StatsPage';
import OrganizationsPage from './pages/admin/OrganizationsPage';
import AgreementPage from './pages/admin/AgreementPage';
import type { Role } from './types/user';

const SlideViewerPage = lazy(() => import('./pages/SlideViewerPage'));
const HotspotViewerPage = lazy(() => import('./pages/HotspotViewerPage'));

const MANAGERS: Role[] = ['ADMIN', 'ORG_ADMIN'];
const SYSTEM_ADMIN: Role[] = ['ADMIN'];

function RequireAuth({ children, roles }: { children: ReactElement; roles?: Role[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner label="Ładowanie sesji…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.is_first_login) {
    return <Navigate to="/setup" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireGuest({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spinner label="Ładowanie sesji…" />;
  if (user) return <Navigate to="/" replace />;

  return children;
}

function RequireFirstLogin({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spinner label="Ładowanie sesji…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_first_login) return <Navigate to="/" replace />;

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          {/* Above the router: an upload keeps running (and stays visible) across page navigations. */}
          <UploadProvider>
            <HotspotUploadProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
                  <Route path="/setup" element={<RequireFirstLogin><FirstLoginPage /></RequireFirstLogin>} />

                  <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                    <Route path="/" element={<SlidesPage />} />
                    <Route
                      path="/slides/:slideId"
                      element={
                        <Suspense fallback={<Spinner label="Wczytywanie przeglądarki…" />}>
                          <SlideViewerPage />
                        </Suspense>
                      }
                    />
                    <Route path="/hotspots" element={<HotspotsPage />} />
                    <Route
                      path="/hotspots/:hotspotId"
                      element={
                        <Suspense fallback={<Spinner label="Wczytywanie przeglądarki…" />}>
                          <HotspotViewerPage />
                        </Suspense>
                      }
                    />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/admin" element={<RequireAuth roles={MANAGERS}><AdminLayout /></RequireAuth>}>
                      <Route index element={<Navigate to="users" replace />} />
                      <Route path="users" element={<UsersPage />} />
                      <Route path="agreement" element={<AgreementPage />} />
                      {/* Shared by every organization, so managed by the system admin only. */}
                      <Route path="stats" element={<RequireAuth roles={SYSTEM_ADMIN}><StatsPage /></RequireAuth>} />
                      <Route
                        path="organizations"
                        element={<RequireAuth roles={SYSTEM_ADMIN}><OrganizationsPage /></RequireAuth>}
                      />
                      <Route path="cell-types" element={<RequireAuth roles={SYSTEM_ADMIN}><CellTypesPage /></RequireAuth>} />
                      <Route path="tags" element={<RequireAuth roles={SYSTEM_ADMIN}><TagsPage /></RequireAuth>} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </HotspotUploadProvider>
          </UploadProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
