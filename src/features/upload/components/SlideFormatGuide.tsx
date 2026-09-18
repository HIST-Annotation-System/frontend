import { SLIDE_FORMATS } from '../slideFileRules';
import './SlideFormatGuide.css';

/** Every supported slide format and how to upload it. */
export default function SlideFormatGuide() {
  return (
    <details className="format-guide">
      <summary>Obsługiwane formaty i sposób przesyłania</summary>
      <div className="format-guide__table-wrap">
        <table className="format-guide__table">
          <thead>
            <tr>
              <th scope="col">Format</th>
              <th scope="col">Rozszerzenie</th>
              <th scope="col">Jak przesłać</th>
            </tr>
          </thead>
          <tbody>
            {SLIDE_FORMATS.map((format) => (
              <tr key={format.name} className={format.multiFile ? 'format-guide__row--archive' : undefined}>
                <td>{format.name}</td>
                <td className="mono-data">{format.extensions.join(', ')}</td>
                <td>{format.upload}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="format-guide__note">
        Każdy slajd musi zawierać rozdzielczość (MPP), a slajdy większe niż 10 000 px muszą być piramidalne. Archiwum
        .zip może zawierać tylko jeden slajd wieloplikowy – plików jednoplikowych nie pakuj. Nieobsługiwane: obrazy
        JPG/PNG/BMP, płaskie i OME-TIFF, Olympus VSI, Philips iSyntax.
      </p>
    </details>
  );
}
