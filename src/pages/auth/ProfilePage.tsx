import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import type { ProfileUpdate } from '../../types/user';
import { Edit2, Check, X } from 'lucide-react';
import './ProfilePage.css';

interface InlineFieldProps {
  label: string;
  value: string;
  displayValue?: string;
  onSave: (val: string) => void;
  type?: string;
  disabled?: boolean;
}

function InlineField({ label, value, displayValue, onSave, type = 'text', disabled = false }: InlineFieldProps) {
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
    <div className="profile-item">
      <div className="profile-item-label">{label}</div>
      <div className="profile-item-content">
        {!isEditing ? (
          <>
            <span className="profile-item-value">
              {type === 'password' ? '••••••••' : (displayValue || value || <span className="text-muted">Brak</span>)}
            </span>
            {!disabled && (
              <button onClick={() => setIsEditing(true)} className="icon-button" title="Edytuj">
                <Edit2 size={16} />
              </button>
            )}
          </>
        ) : (
          <>
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="profile-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="profile-item-edit-actions">
              <button onClick={handleSave} className="icon-button success" title="Zapisz">
                <Check size={18} />
              </button>
              <button onClick={handleCancel} className="icon-button danger" title="Anuluj">
                <X size={18} />
              </button>
            </div>
          </>
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

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1 className="profile-title">Mój Profil</h1>
        <p className="profile-subtitle">Przeglądaj i aktualizuj swoje dane.</p>

        {localError && <div className="profile-alert profile-alert-error">{localError}</div>}
        {successMessage && <div className="profile-alert profile-alert-success">{successMessage}</div>}

        <div className="profile-list">
          <InlineField 
            label="Login" 
            value={user.username} 
            onSave={() => {}} 
            disabled 
          />
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
            label="Hasło" 
            value="" 
            type="password"
            onSave={(val) => handleUpdate('password', val)} 
          />
          <InlineField 
            label="Rola" 
            value={user.role} 
            onSave={() => {}} 
            disabled 
          />
          <InlineField 
            label="Grupa Annotatorska" 
            value={user.profile?.group?.name || 'Brak'} 
            onSave={() => {}} 
            disabled 
          />
          
          {categories && categories.length > 0 && (
            <div className="profile-item" style={{ alignItems: 'flex-start' }}>
              <div className="profile-item-label" style={{ paddingTop: '0.5rem' }}>Kategorie</div>
              <div className="profile-item-content">
                {!isEditingCategories ? (
                  <>
                    <div className="profile-item-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {user.profile?.categories && user.profile.categories.length > 0 ? (
                        user.profile.categories.map(c => (
                          <span key={c.id} style={{ background: 'var(--color-surface-lowest)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                            {c.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">Brak powiązanych kategorii</span>
                      )}
                    </div>
                    <button onClick={() => setIsEditingCategories(true)} className="icon-button" title="Edytuj">
                      <Edit2 size={16} />
                    </button>
                  </>
                ) : (
                  <div style={{ width: '100%' }}>
                    <div className="profile-categories-grid">
                      {categories.map(cat => (
                        <label key={cat.id} className="profile-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                          />
                          {cat.name}
                        </label>
                      ))}
                    </div>
                    <div className="profile-item-edit-actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                      <button onClick={saveCategories} className="icon-button success" title="Zapisz">
                        <Check size={18} />
                      </button>
                      <button onClick={cancelCategories} className="icon-button danger" title="Anuluj">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
