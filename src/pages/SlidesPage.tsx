import SlideList from '../features/slides/components/SlideList';
import WsiUploader from '../features/upload/components/WsiUploader';
import './SlidesPage.css';

export default function SlidesPage() {
  return (
    <div className="slides-page">
      <div className="slides-page__inner">
        <h1 className="slides-page__title">Biblioteka slajdów</h1>
        <WsiUploader />
        <SlideList />
      </div>
    </div>
  );
}
