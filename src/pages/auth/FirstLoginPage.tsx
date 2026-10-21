import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import { dictionariesApi } from '../../services/dictionariesApi';
import './AuthPages.css';

export default function FirstLoginPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setupProfile, error } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dictionariesApi.getCategories(),
  });

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError("Hasła nie pasują do siebie.");
      return;
    }

    if (password.length < 8) {
      setLocalError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    setLoading(true);
    try {
      await setupProfile({
        new_password: password,
        first_name: firstName,
        last_name: lastName,
        category_ids: selectedCategories
      });
      // React state update in AuthContext will automatically trigger RequireFirstLogin to redirect
    } catch {
      // Error handled by context mostly
    } finally {
      setLoading(false);
    }
  };

  const text = (label: string, value: string, onChange: (value: string) => void, type = 'text') => (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      <input className="field" type={type} value={value} onChange={(e) => onChange(e.target.value)} required disabled={loading} />
    </label>
  );

  return (
    <main className="auth-page">
      <div className="auth-page__inner auth-page__inner--wide">
        <div className="auth-page__brand">HistAno</div>
        <p className="auth-page__lead">Pierwsze logowanie: uzupełnij profil i ustaw własne hasło.</p>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="auth-page__row">
            {text('Imię', firstName, setFirstName)}
            {text('Nazwisko', lastName, setLastName)}
          </div>
          {text('Nowe hasło (min. 8 znaków)', password, setPassword, 'password')}
          {text('Powtórz hasło', confirmPassword, setConfirmPassword, 'password')}

          {categories && categories.length > 0 && (
            <fieldset className="auth-page__categories">
              <legend className="form-field__label">Kategorie, którymi się zajmujesz</legend>
              {categories.map(cat => (
                <label key={cat.id} className="form-check">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  {cat.name}
                </label>
              ))}
            </fieldset>
          )}

          {(localError || error) && <ErrorMessage message={localError || error || ''} />}
          <Button type="submit" variant="primary" block disabled={loading}>
            {loading ? 'Zapisywanie…' : 'Zapisz i kontynuuj'}
          </Button>
        </form>
      </div>
    </main>
  );
}
