import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Spinner from './components/ui/Spinner';
import QueryProvider from './context/QueryProvider';
import NotFound from './pages/NotFound';
import SlidesPage from './pages/SlidesPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import FirstLoginPage from './pages/auth/FirstLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProfilePage from './pages/auth/ProfilePage';

const SlideViewerPage = lazy(() => import('./pages/SlideViewerPage'));

function RequireAuth({ children, role }: { children: JSX.Element, role?: 'ADMIN' | 'ANNOTATOR' }) {
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

function RequireGuest({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Spinner label="Ładowanie sesji..." />;
  if (user) return <Navigate to="/" replace />;
  
  return children;
}

function RequireFirstLogin({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Spinner label="Ładowanie sesji..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_first_login) return <Navigate to="/" replace />;
  
  return children;
}

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
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
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
