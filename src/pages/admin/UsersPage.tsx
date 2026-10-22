import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import { Trash2, Pencil } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { getErrorMessage } from '../../utils/errors';
import './UsersPage.css';
import type { AccountCreate, AccountResponse, ProfileUpdate, Role } from '../../types/user';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'administrator', ANNOTATOR: 'anotator' };

/** "First Last", or null when the profile has neither name set. */
function fullNameOf(user: AccountResponse): string | null {
  const name = `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim();
  return name || null;
}

type RoleFilter = 'all' | Role;

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'Wszyscy' },
  { id: 'ADMIN', label: 'Administratorzy' },
  { id: 'ANNOTATOR', label: 'Anotatorzy' },
];

/** Client-side list filter: name or login substring plus role. */
function matchesFilter(user: AccountResponse, query: string, role: RoleFilter): boolean {
  if (role !== 'all' && user.role !== role) return false;
  if (!query) return true;
  return (fullNameOf(user) ?? '').toLowerCase().includes(query) || user.username.toLowerCase().includes(query);
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCanUpload, setNewCanUpload] = useState(false);
  const [newGroupId, setNewGroupId] = useState<number | ''>('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccountResponse | null>(null);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCanUpload, setEditCanUpload] = useState(false);
  const [editGroupId, setEditGroupId] = useState<number | ''>('');

  const [deletingUser, setDeletingUser] = useState<AccountResponse | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

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
      setIsEditModalOpen(false);
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

  const openCreateModal = () => {
    createMutation.reset();
    setIsModalOpen(true);
  };

  const openDeleteDialog = (user: AccountResponse) => {
    deleteMutation.reset();
    setDeletingUser(user);
  };

  const openEditModal = (user: AccountResponse) => {
    setEditingUser(user);
    setEditFirstName(user.profile?.first_name || '');
    setEditLastName(user.profile?.last_name || '');
    setEditCanUpload(user.profile?.can_upload || false);
    setEditGroupId(user.profile?.group?.id || '');
    setEditPassword('');
    updateMutation.reset();
    setIsEditModalOpen(true);
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
    <select value={value} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
      <option value="">Brak grupy</option>
      {groups?.map(g => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleUsers = users?.filter((user) => matchesFilter(user, normalizedQuery, roleFilter));
  const roleCount = (role: RoleFilter) =>
    role === 'all' ? (users?.length ?? 0) : (users?.filter((user) => user.role === role).length ?? 0);

  return (
    <div className="admin-page users-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Użytkownicy
          {users && <span className="admin-page-count">{users.length}</span>}
        </h1>
        <span className="admin-page-spacer" />
        <label className="admin-search">
          <input
            type="search"
            placeholder="Szukaj po imieniu lub loginie"
            aria-label="Szukaj użytkowników"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <div className="segmented" role="group" aria-label="Filtr roli">
          {ROLE_FILTERS.map((filter) => {
            const active = roleFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                className={`segmented__option${active ? ' segmented__option--active' : ''}`}
                aria-pressed={active}
                onClick={() => setRoleFilter(filter.id)}
              >
                {filter.label} {roleCount(filter.id)}
              </button>
            );
          })}
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          Dodaj użytkownika
        </Button>
      </div>

      {isLoading ? (
        <div className="admin-loading">Ładowanie użytkowników…</div>
      ) : (
        <table className="admin-table users-table">
          <thead>
            <tr>
              <th>Imię i nazwisko</th>
              <th>Nazwa użytkownika</th>
              <th>Rola</th>
              <th>Grupa</th>
              <th>Przesyłanie</th>
              <th>Stan</th>
              <th className="admin-table__actions" aria-label="Akcje" />
            </tr>
          </thead>
          <tbody>
            {visibleUsers?.map((user) => (
              <tr key={user.id}>
                <td className="admin-table__truncate users-name" title={fullNameOf(user) ?? undefined}>
                  {user.profile ? (
                    fullNameOf(user) ?? <span className="admin-table__faint">profil ukryty</span>
                  ) : <span className="admin-table__faint">brak profilu</span>}
                </td>
                <td className="admin-table__truncate users-login" title={user.username}>{user.username}</td>
                <td>{ROLE_LABELS[user.role] ?? user.role}</td>
                <td className="admin-table__muted admin-table__truncate users-group" title={user.profile?.group?.name}>
                  {user.profile?.group?.name || <span className="admin-table__faint">—</span>}
                </td>
                <td className={user.profile?.can_upload ? undefined : 'admin-table__muted'}>
                  {user.profile?.can_upload ? 'tak' : 'nie'}
                </td>
                <td className="admin-table__muted">
                  {user.is_first_login ? 'oczekuje na pierwsze logowanie' : 'aktywny'}
                </td>
                <td className="admin-table__actions">
                  <span className="admin-row-actions">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="admin-icon-btn"
                      title="Edytuj użytkownika"
                      aria-label="Edytuj użytkownika"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteDialog(user)}
                      className="admin-icon-btn admin-icon-btn--danger"
                      title="Usuń użytkownika"
                      aria-label="Usuń użytkownika"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr className="admin-table__empty">
                <td colSpan={7}>Brak użytkowników.</td>
              </tr>
            )}
            {users && users.length > 0 && visibleUsers?.length === 0 && (
              <tr className="admin-table__empty">
                <td colSpan={7}>Brak użytkowników pasujących do wyszukiwania.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal title="Dodaj użytkownika" open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form className="users-form" onSubmit={handleCreateUser}>
          <label className="admin-field">
            <span className="admin-field__label">Nazwa użytkownika</span>
            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
          </label>
          <label className="admin-field">
            <span className="admin-field__label">Hasło tymczasowe</span>
            <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <label className="admin-field">
            <span className="admin-field__label">Grupa anotatorów</span>
            {groupSelect(newGroupId, setNewGroupId)}
          </label>
          <label className="users-check">
            <input type="checkbox" checked={newCanUpload} onChange={(e) => setNewCanUpload(e.target.checked)} />
            Może przesyłać pliki
          </label>
          {createMutation.isError && (
            <p className="users-form__error" role="alert">
              {getErrorMessage(createMutation.error, 'Nie udało się utworzyć konta.')}
            </p>
          )}
          <div className="users-form__actions">
            <Button onClick={() => setIsModalOpen(false)}>Anuluj</Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Tworzenie…' : 'Utwórz konto'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Edytuj użytkownika: ${editingUser?.username ?? ''}`}
        open={isEditModalOpen && editingUser !== null}
        onClose={() => setIsEditModalOpen(false)}
      >
        <form className="users-form" onSubmit={handleEditUser}>
          <label className="admin-field">
            <span className="admin-field__label">Imię</span>
            <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
          </label>
          <label className="admin-field">
            <span className="admin-field__label">Nazwisko</span>
            <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
          </label>
          <label className="admin-field">
            <span className="admin-field__label">Nowe hasło</span>
            <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
          </label>
          <label className="admin-field">
            <span className="admin-field__label">Grupa anotatorów</span>
            {groupSelect(editGroupId, setEditGroupId)}
          </label>
          <label className="users-check">
            <input type="checkbox" checked={editCanUpload} onChange={(e) => setEditCanUpload(e.target.checked)} />
            Może przesyłać pliki
          </label>
          {updateMutation.isError && (
            <p className="users-form__error" role="alert">
              {getErrorMessage(updateMutation.error, 'Nie udało się zapisać zmian.')}
            </p>
          )}
          <div className="users-form__actions">
            <Button onClick={() => setIsEditModalOpen(false)}>Anuluj</Button>
            <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz zmiany'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        title="Usuń użytkownika"
        open={deletingUser !== null}
        confirmLabel="Usuń"
        busy={deleteMutation.isPending}
        error={deleteMutation.isError ? getErrorMessage(deleteMutation.error, 'Nie udało się usunąć konta.') : null}
        onConfirm={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
        onCancel={() => setDeletingUser(null)}
      >
        Czy na pewno chcesz usunąć tego użytkownika?
      </ConfirmDialog>
    </div>
  );
}
