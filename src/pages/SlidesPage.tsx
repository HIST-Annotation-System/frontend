import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import SlideList from '../features/slides/components/SlideList';
import { useSlides } from '../features/slides/hooks/useSlides';
import WsiUploader from '../features/upload/components/WsiUploader';
import './SlidesPage.css';

const describeCount = (count: number): string => {
  if (count === 1) return '1 slajd';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 10 || lastTwo >= 20);
  return `${count} ${few ? 'slajdy' : 'slajdów'}`;
};

export default function SlidesPage() {
  const { user } = useAuth();
  // Same query as the list below (shared cache), only read for the count next to the title.
  const { data } = useSlides();
  const isAdmin = user?.role === 'ADMIN';
  const [isUploadOpen, setIsUploadOpen] = useState(true);
  const showUploadPanel = isAdmin && isUploadOpen;

  return (
    <div className="slides-page">
      <div className="slides-page__main">
        <header className="slides-page__header">
          <div className="slides-page__title">
            <h1 className="page-title">Biblioteka slajdów</h1>
            {data && <span className="slides-page__count">{describeCount(data.length)}</span>}
          </div>
          {isAdmin && !isUploadOpen && (
            <Button variant="primary" icon={<Upload size={16} />} onClick={() => setIsUploadOpen(true)}>
              Wgraj slajdy
            </Button>
          )}
        </header>
        <SlideList />
      </div>
      {/* Adding slides is an administrator task (the upload API enforces it too). The panel stays mounted
          when closed, so a running storage import or an open picker keeps its state. */}
      {isAdmin && (
        <aside className="slides-page__upload" hidden={!showUploadPanel} aria-label="Wgraj slajdy">
          <div className="slides-page__upload-header">
            <h2 className="slides-page__upload-title">Wgraj slajdy</h2>
            <Button
              variant="ghost"
              icon={<X size={16} />}
              title="Zamknij"
              aria-label="Zamknij panel wgrywania"
              onClick={() => setIsUploadOpen(false)}
            />
          </div>
          <div className="slides-page__upload-body">
            <WsiUploader />
          </div>
        </aside>
      )}
    </div>
  );
}
