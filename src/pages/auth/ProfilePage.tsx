import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import type { ProfileUpdate } from '../../types/user';
import './ProfilePage.css';

interface InlineFieldProps {
  label: string;
  value: string;
  onSave?: (val: string) => void;
  type?: string;
}

/** A label/value row; with `onSave` the value can be edited in place. */
function InlineField({ label, value, onSave, type = 'text' }: InlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave?.(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div className="profile-row">
      <dt>{label}</dt>
      {isEditing ? (
        <dd className="profile-row__edit">
          <input
            className="field"
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <Button small variant="primary" onClick={handleSave}>Zapisz</Button>
          <Button small onClick={handleCancel}>Anuluj</Button>
        </dd>
      ) : (
        <dd>
          <span className={value || type === 'password' ? undefined : 'text-muted'}>
            {type === 'password' ? '••••••••' : value || 'brak'}
          </span>
          {onSave && <Button small onClick={() => setIsEditing(true)}>{type === 'password' ? 'Zmień' : 'Edytuj'}</Button>}
        </dd>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refetch } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dictionariesApi.getCategories(),
  });

  useEffect(() => {
    if (user?.profile) {
      setSelectedCategories(user.profile.categories.map(c => c.id));
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileUpdate) => usersApi.updateAccount(user!.id, data),
    onSuccess: async () => {
      setSuccessMessage('Zapisano zmiany.');
      await refetch();
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditingCategories(false);
    },
    onError: (err: Error) => {
      setLocalError(err.message || 'Wystąpił błąd podczas aktualizacji.');
    }
  });

  const handleUpdate = (field: keyof ProfileUpdate, value: string | number[]) => {
    setLocalError(null);
    setSuccessMessage(null);

    if (field === 'password' && value.length < 8) {
      setLocalError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    updateMutation.mutate({ [field]: value });
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const cancelCategories = () => {
    if (user?.profile) {
      setSelectedCategories(user.profile.categories.map(c => c.id));
    }
    setIsEditingCategories(false);
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="page-strip">
        <h1 className="page-strip__title">Mój profil</h1>
        {successMessage && <span className="text-muted">{successMessage}</span>}
      </div>
      <div className="profile-page__body">
        {localError && <ErrorMessage message={localError} onDismiss={() => setLocalError(null)} />}
        <dl className="profile-list">
          <InlineField label="Login" value={user.username} />
          <InlineField label="Imię" value={user.profile?.first_name || ''} onSave={(val) => handleUpdate('first_name', val)} />
          <InlineField label="Nazwisko" value={user.profile?.last_name || ''} onSave={(val) => handleUpdate('last_name', val)} />
          <InlineField label="Hasło" value="" type="password" onSave={(val) => handleUpdate('password', val)} />
          <InlineField label="Rola" value={user.role === 'ADMIN' ? 'administrator' : 'annotator'} />
          <InlineField label="Grupa annotatorska" value={user.profile?.group?.name || ''} />

          {categories && categories.length > 0 && (
            <div className="profile-row">
              <dt>Kategorie</dt>
              {isEditingCategories ? (
                <dd className="profile-row__categories">
                  <div className="profile-categories">
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
                  </div>
                  <div className="profile-row__buttons">
                    <Button small variant="primary" onClick={() => handleUpdate('category_ids', selectedCategories)}>Zapisz</Button>
                    <Button small onClick={cancelCategories}>Anuluj</Button>
                  </div>
                </dd>
              ) : (
                <dd>
                  <span className={user.profile?.categories.length ? undefined : 'text-muted'}>
                    {user.profile?.categories.length
                      ? user.profile.categories.map(c => c.name).join(', ')
                      : 'brak powiązanych kategorii'}
                  </span>
                  <Button small onClick={() => setIsEditingCategories(true)}>Edytuj</Button>
                </dd>
              )}
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
