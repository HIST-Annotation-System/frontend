import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Spinner from './components/ui/Spinner';
import QueryProvider from './context/QueryProvider';
import NotFound from './pages/NotFound';
import SlidesPage from './pages/SlidesPage';

// The viewer pulls in OpenSeadragon and Annotorious (WebGL); load it only when a slide is opened.
const SlideViewerPage = lazy(() => import('./pages/SlideViewerPage'));

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<SlidesPage />} />
            <Route
              path="/slides/:slideId"
              element={
                <Suspense fallback={<Spinner label="Wczytywanie przeglądarki…" />}>
                  <SlideViewerPage />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
