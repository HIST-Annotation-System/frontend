import { useAuth } from '../context/AuthContext';
import SlideList from '../features/slides/components/SlideList';
import WsiUploader from '../features/upload/components/WsiUploader';
import './SlidesPage.css';

export default function SlidesPage() {
  const { user } = useAuth();
  return (
    <div className="slides-page">
      <div className="slides-page__inner">
        <h1 className="slides-page__title">Biblioteka slajdów</h1>
        {/* Adding slides is an administrator task (the upload API enforces it too). */}
        {user?.role === 'ADMIN' && <WsiUploader />}
        <SlideList />
      </div>
    </div>
  );
}
