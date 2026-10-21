import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import type { ProfileUpdate, Role } from '../../types/user';
import { Pencil, Check, Lock, Info, CircleAlert, CircleCheck, X } from 'lucide-react';
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
            <button onClick={handleSave} className="btn-primary btn-sm" title="Zapisz">
              <Check size={14} />
              Zapisz
            </button>
            <button onClick={handleCancel} className="btn-secondary btn-sm" title="Anuluj">
              Anuluj
            </button>
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
            <p className="page-subtitle">Przeglądaj i aktualizuj swoje dane.</p>
          </div>
        </div>

        {localError && (
          <div className="profile-alert profile-alert--error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>{localError}</span>
            <button type="button" className="profile-alert__close" title="Zamknij" onClick={() => setLocalError(null)}>
              <X size={14} />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="profile-alert profile-alert--success" role="status">
            <CircleCheck size={16} aria-hidden="true" />
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
            label="Login"
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
                    <button onClick={saveCategories} className="btn-primary btn-sm" title="Zapisz">
                      <Check size={14} />
                      Zapisz
                    </button>
                    <button onClick={cancelCategories} className="btn-secondary btn-sm" title="Anuluj">
                      Anuluj
                    </button>
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

        <p className="profile-note">
          <Info size={13} aria-hidden="true" />
          Rolę i grupę anotatorów może zmienić tylko administrator.
        </p>
      </div>
    </div>
  );
}
