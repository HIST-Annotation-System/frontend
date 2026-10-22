import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import type { ProfileUpdate, Role } from '../../types/user';
import Button from '../../components/ui/Button';
import { Pencil, Lock, X } from 'lucide-react';
import './ProfilePage.css';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Administrator', ANNOTATOR: 'Anotator' };

interface InlineFieldProps {
  label: string;
  value: string;
  displayValue?: string;
  onSave: (val: string) => void;
  type?: string;
  disabled?: boolean;
  mono?: boolean;
}

function InlineField({ label, value, displayValue, onSave, type = 'text', disabled = false, mono = false }: InlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div className="profile-row">
      <div className="profile-row__label">{label}</div>
      {!isEditing ? (
        <div className={`profile-row__value${mono ? ' profile-row__value--mono' : ''}`}>
          {type === 'password' ? '••••••••' : (displayValue || value || <span className="profile-muted">Brak</span>)}
        </div>
      ) : (
        <div className="profile-row__edit">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className={`profile-input${mono ? ' profile-input--mono' : ''}`}
            placeholder={type === 'password' ? 'Nowe hasło' : undefined}
            autoComplete={type === 'password' ? 'new-password' : undefined}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <div className="profile-row__edit-actions">
            <Button variant="primary" className="btn-sm" onClick={handleSave} title="Zapisz">
              Zapisz
            </Button>
            <Button className="btn-sm" onClick={handleCancel} title="Anuluj">
              Anuluj
            </Button>
          </div>
        </div>
      )}
      <div className="profile-row__trailing">
        {disabled ? (
          <span className="profile-lock" title="Tego pola nie można zmienić">
            <Lock size={14} aria-hidden="true" />
          </span>
        ) : (
          !isEditing && (
            <button onClick={() => setIsEditing(true)} className="profile-icon-btn" title="Edytuj">
              <Pencil size={15} />
            </button>
          )
        )}
      </div>
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
      setSuccessMessage('Profil został zaktualizowany.');
      await refetch();
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditingCategories(false);
    },
    onError: (err: Error) => {
      setLocalError(err.message || 'Wystąpił błąd podczas aktualizacji.');
    }
  });

  const handleUpdate = (field: keyof ProfileUpdate, value: any) => {
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

  const saveCategories = () => {
    handleUpdate('category_ids', selectedCategories);
  };

  const cancelCategories = () => {
    if (user?.profile) {
      setSelectedCategories(user.profile.categories.map(c => c.id));
    }
    setIsEditingCategories(false);
  };

  if (!user) return null;

  const initials = (
    `${user.profile?.first_name?.trim().charAt(0) ?? ''}${user.profile?.last_name?.trim().charAt(0) ?? ''}` ||
    user.username.slice(0, 2)
  ).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-content">
        <div className="profile-header">
          <span className="profile-avatar" aria-hidden="true">{initials}</span>
          <div className="profile-header__text">
            <h1 className="page-title">Mój profil</h1>
          </div>
        </div>

        {localError && (
          <div className="profile-alert profile-alert--error" role="alert">
            <span>{localError}</span>
            <button type="button" className="profile-alert__close" title="Zamknij" onClick={() => setLocalError(null)}>
              <X size={14} />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="profile-alert profile-alert--success" role="status">
            <span>{successMessage}</span>
            <button type="button" className="profile-alert__close" title="Zamknij" onClick={() => setSuccessMessage(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="profile-card">
          <InlineField
            label="Imię"
            value={user.profile?.first_name || ''}
            onSave={(val) => handleUpdate('first_name', val)}
          />
          <InlineField
            label="Nazwisko"
            value={user.profile?.last_name || ''}
            onSave={(val) => handleUpdate('last_name', val)}
          />
          <InlineField
            label="Nazwa użytkownika"
            value={user.username}
            onSave={() => {}}
            disabled
            mono
          />
          <InlineField
            label="Rola"
            value={user.role}
            displayValue={ROLE_LABELS[user.role]}
            onSave={() => {}}
            disabled
          />
          <InlineField
            label="Grupa anotatorów"
            value={user.profile?.group?.name || 'Brak'}
            onSave={() => {}}
            disabled
          />
          <InlineField
            label="Hasło"
            value=""
            type="password"
            onSave={(val) => handleUpdate('password', val)}
          />

          {categories && categories.length > 0 && (
            <div className="profile-row">
              <div className="profile-row__label">Kategorie</div>
              {!isEditingCategories ? (
                <div className="profile-row__value profile-chips">
                  {user.profile?.categories && user.profile.categories.length > 0 ? (
                    user.profile.categories.map(c => (
                      <span key={c.id} className="profile-chip">
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="profile-muted">Brak powiązanych kategorii</span>
                  )}
                </div>
              ) : (
                <div className="profile-row__edit">
                  <div className="profile-chips">
                    {categories.map(cat => (
                      <label
                        key={cat.id}
                        className={`profile-chip-toggle${selectedCategories.includes(cat.id) ? ' is-on' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                  <div className="profile-row__edit-actions">
                    <Button variant="primary" className="btn-sm" onClick={saveCategories} title="Zapisz">
                      Zapisz
                    </Button>
                    <Button className="btn-sm" onClick={cancelCategories} title="Anuluj">
                      Anuluj
                    </Button>
                  </div>
                </div>
              )}
              <div className="profile-row__trailing">
                {!isEditingCategories && (
                  <button onClick={() => setIsEditingCategories(true)} className="profile-icon-btn" title="Edytuj">
                    <Pencil size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
