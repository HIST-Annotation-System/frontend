import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import { getErrorMessage } from '../../utils/errors';
import type { AccountCreate, AccountResponse, ProfileUpdate } from '../../types/user';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCanUpload, setNewCanUpload] = useState(false);
  const [newGroupId, setNewGroupId] = useState<number | ''>('');

  const [editingUser, setEditingUser] = useState<AccountResponse | null>(null);
  const [deletingUser, setDeletingUser] = useState<AccountResponse | null>(null);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCanUpload, setEditCanUpload] = useState(false);
  const [editGroupId, setEditGroupId] = useState<number | ''>('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => dictionariesApi.getGroups(),
  });

  const createMutation = useMutation({
    mutationFn: (data: AccountCreate) => usersApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewCanUpload(false);
      setNewGroupId('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: number) => usersApi.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeletingUser(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: ProfileUpdate }) => usersApi.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      username: newUsername,
      password: newPassword,
      role: 'ANNOTATOR',
      can_upload: newCanUpload,
      group_id: newGroupId === '' ? undefined : Number(newGroupId)
    });
  };

  const openEditModal = (user: AccountResponse) => {
    setEditingUser(user);
    setEditFirstName(user.profile?.first_name || '');
    setEditLastName(user.profile?.last_name || '');
    setEditCanUpload(user.profile?.can_upload || false);
    setEditGroupId(user.profile?.group?.id || '');
    setEditPassword('');
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updateData: ProfileUpdate = {};
    if (editFirstName) updateData.first_name = editFirstName;
    if (editLastName) updateData.last_name = editLastName;
    if (editPassword) updateData.password = editPassword;
    updateData.can_upload = editCanUpload;
    updateData.group_id = editGroupId === '' ? null : Number(editGroupId);

    updateMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const groupSelect = (value: number | '', onChange: (value: number | '') => void) => (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
      <option value="">Brak grupy</option>
      {groups?.map(g => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  );

  return (
    <>
      <div className="page-strip">
        <h1 className="page-strip__title">
          Użytkownicy
          {users && <span className="page-strip__count">{users.length}</span>}
        </h1>
        <span className="page-strip__spacer" />
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Dodaj użytkownika…
        </Button>
      </div>

      {isLoading ? (
        <Spinner label="Wczytywanie użytkowników…" />
      ) : (
        <div className="admin-page__scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Login</th>
                <th>Rola</th>
                <th>Imię i nazwisko</th>
                <th>Grupa</th>
                <th>Przesyłanie</th>
                <th>Stan</th>
                <th aria-label="Akcje" />
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.role === 'ADMIN' ? 'administrator' : 'annotator'}</td>
                  <td>
                    {user.profile ? (
                      user.profile.first_name || user.profile.last_name
                      ? `${user.profile.first_name} ${user.profile.last_name}`
                      : <span className="data-table__muted">profil ukryty</span>
                    ) : <span className="data-table__muted">brak profilu</span>}
                  </td>
                  <td className={user.profile?.group ? undefined : 'data-table__muted'}>
                    {user.profile?.group?.name || '—'}
                  </td>
                  <td className="data-table__muted">{user.profile?.can_upload ? 'tak' : 'nie'}</td>
                  <td className="data-table__muted">{user.is_first_login ? 'oczekuje na pierwsze logowanie' : 'aktywny'}</td>
                  <td className="admin-page__row-actions">
                    <Button small onClick={() => openEditModal(user)}>Edytuj</Button>
                    <Button small variant="danger" onClick={() => setDeletingUser(user)}>Usuń</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users?.length === 0 && <p className="admin-page__empty">Brak użytkowników.</p>}
        </div>
      )}

      <Modal title="Nowy annotator" open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form className="form-stack" onSubmit={handleCreateUser}>
          <label className="form-field">
            <span className="form-field__label">Login</span>
            <input className="field" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
          </label>
          <label className="form-field">
            <span className="form-field__label">Hasło tymczasowe</span>
            <input className="field" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <label className="form-field">
            <span className="form-field__label">Grupa annotatorska</span>
            {groupSelect(newGroupId, setNewGroupId)}
          </label>
          <label className="form-check">
            <input type="checkbox" checked={newCanUpload} onChange={(e) => setNewCanUpload(e.target.checked)} />
            Może przesyłać pliki
          </label>
          {createMutation.isError && (
            <ErrorMessage message={getErrorMessage(createMutation.error, 'Nie udało się utworzyć konta.')} />
          )}
          <div className="modal-actions">
            <Button onClick={() => setIsModalOpen(false)}>Anuluj</Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Tworzenie…' : 'Utwórz konto'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title={`Edytuj: ${editingUser?.username ?? ''}`} open={editingUser !== null} onClose={() => setEditingUser(null)}>
        <form className="form-stack" onSubmit={handleEditUser}>
          <label className="form-field">
            <span className="form-field__label">Imię</span>
            <input className="field" type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-field__label">Nazwisko</span>
            <input className="field" type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-field__label">Nowe hasło (puste: bez zmian)</span>
            <input className="field" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-field__label">Grupa annotatorska</span>
            {groupSelect(editGroupId, setEditGroupId)}
          </label>
          <label className="form-check">
            <input type="checkbox" checked={editCanUpload} onChange={(e) => setEditCanUpload(e.target.checked)} />
            Może przesyłać pliki
          </label>
          {updateMutation.isError && (
            <ErrorMessage message={getErrorMessage(updateMutation.error, 'Nie udało się zapisać zmian.')} />
          )}
          <div className="modal-actions">
            <Button onClick={() => setEditingUser(null)}>Anuluj</Button>
            <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz zmiany'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title="Usuń użytkownika" open={deletingUser !== null} onClose={() => setDeletingUser(null)}>
        <p>Czy na pewno chcesz usunąć konto „{deletingUser?.username}”?</p>
        {deleteMutation.isError && (
          <ErrorMessage message={getErrorMessage(deleteMutation.error, 'Nie udało się usunąć konta.')} />
        )}
        <div className="modal-actions">
          <Button onClick={() => setDeletingUser(null)}>Wróć</Button>
          <Button
            variant="primary"
            disabled={deleteMutation.isPending}
            onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
          >
            {deleteMutation.isPending ? 'Usuwanie…' : 'Usuń konto'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
