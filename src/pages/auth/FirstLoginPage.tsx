import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dictionariesApi } from '../../services/dictionariesApi';
import { Microscope } from 'lucide-react';
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
  const navigate = useNavigate();

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
    } catch (err) {
      // Error handled by context mostly
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <Microscope size={48} />
          </div>
          <h1>Pierwsze logowanie</h1>
          <p>Uzupełnij swój profil aby kontynuować</p>
        </div>

        {(error || localError) && (
          <div className="auth-error">{localError || error}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Imię</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
                className="auth-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Nazwisko</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
                className="auth-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Nowe hasło</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Potwierdź nowe hasło</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          {categories && categories.length > 0 && (
            <div className="form-group">
              <label>Kategorie, którymi się zajmujesz</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                {categories.map(cat => (
                  <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-button" style={{ marginTop: '1rem' }}>
            {loading ? 'Zapisywanie...' : 'Zapisz i kontynuuj'}
          </button>
        </form>
      </div>
    </div>
  );
}
