import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Spinner from './components/ui/Spinner';
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
import SettingsPage from './pages/admin/SettingsPage';
import ProfilePage from './pages/auth/ProfilePage';
import StoragePage from './pages/admin/StoragePage';

const SlideViewerPage = lazy(() => import('./pages/SlideViewerPage'));
const HotspotViewerPage = lazy(() => import('./pages/HotspotViewerPage'));

function RequireAuth({ children, role }: { children: ReactElement, role?: 'ADMIN' | 'ANNOTATOR' }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner label="Ładowanie sesji..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.is_first_login) {
    return <Navigate to="/setup" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireGuest({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Spinner label="Ładowanie sesji..." />;
  if (user) return <Navigate to="/" replace />;
  
  return children;
}

function RequireFirstLogin({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Spinner label="Ładowanie sesji..." />;
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
                  <Route path="/admin" element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
                    <Route index element={<Navigate to="users" replace />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="storage" element={<StoragePage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </UploadProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
