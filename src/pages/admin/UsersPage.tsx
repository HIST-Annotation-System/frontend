import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import { UserPlus, Trash2, Pencil, X, CircleCheck, Minus, Search } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import './UsersPage.css';
import type { AccountCreate, AccountResponse, ProfileUpdate, Role } from '../../types/user';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Administrator', ANNOTATOR: 'Anotator' };

/** Two-letter avatar text: first + last name initials, falling back to the login. */
function initialsOf(user: AccountResponse): string {
  const first = user.profile?.first_name?.trim() ?? '';
  const last = user.profile?.last_name?.trim() ?? '';
  const fromName = `${first.charAt(0)}${last.charAt(0)}`;
  return (fromName || user.username.slice(0, 2)).toUpperCase();
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
  const fullName = `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.toLowerCase();
  return fullName.includes(query) || user.username.toLowerCase().includes(query);
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

  const handleDeleteUser = (id: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
      deleteMutation.mutate(id);
    }
  };

  const openEditModal = (user: AccountResponse) => {
    setEditingUser(user);
    setEditFirstName(user.profile?.first_name || '');
    setEditLastName(user.profile?.last_name || '');
    setEditCanUpload(user.profile?.can_upload || false);
    setEditGroupId(user.profile?.group?.id || '');
    setEditPassword('');
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleUsers = users?.filter((user) => matchesFilter(user, normalizedQuery, roleFilter));
  const roleCount = (role: RoleFilter) =>
    role === 'all' ? (users?.length ?? 0) : (users?.filter((user) => user.role === role).length ?? 0);

  return (
    <div className="admin-page users-page">
      <div className="admin-page-header">
        <div className="admin-page-header__text">
          <h1 className="page-title">Użytkownicy</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <UserPlus size={16} />
          <span>Dodaj użytkownika</span>
        </button>
      </div>

      <div className="users-toolbar">
        <div className="users-search">
          <Search size={16} className="users-search__icon" aria-hidden="true" />
          <input
            type="search"
            className="users-search__input"
            placeholder="Szukaj po imieniu lub loginie"
            aria-label="Szukaj użytkowników"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="btn-group users-role-filter" role="group" aria-label="Filtr roli">
          {ROLE_FILTERS.map((filter) => (
            <Button key={filter.id} active={roleFilter === filter.id} onClick={() => setRoleFilter(filter.id)}>
              {filter.label}
              <span className="users-role-filter__count">{roleCount(filter.id)}</span>
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="admin-loading">Ładowanie użytkowników…</div>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Imię i nazwisko</th>
                <th>Nazwa użytkownika</th>
                <th>Rola</th>
                <th>Grupa</th>
                <th>Upload</th>
                <th>Status</th>
                <th className="users-table__actions-head">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers?.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="users-person">
                      <span className="users-avatar" aria-hidden="true">{initialsOf(user)}</span>
                      {user.profile ? (
                        user.profile.first_name || user.profile.last_name
                        ? <span className="users-person__name">{`${user.profile.first_name} ${user.profile.last_name}`}</span>
                        : <span className="users-muted">Profil ukryty</span>
                      ) : <span className="users-muted">Brak profilu</span>}
                    </span>
                  </td>
                  <td className="users-login">{user.username}</td>
                  <td>
                    <span className={`users-role users-role--${user.role.toLowerCase()}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="users-group">
                    {user.profile?.group?.name || <span className="users-muted">—</span>}
                  </td>
                  <td>
                    {user.profile?.can_upload ? (
                      <span className="users-upload users-upload--yes"><CircleCheck size={15} />Tak</span>
                    ) : (
                      <span className="users-upload"><Minus size={15} />Nie</span>
                    )}
                  </td>
                  <td>
                    {user.is_first_login ? (
                      <Badge tone="warn">Oczekuje na pierwsze logowanie</Badge>
                    ) : (
                      <Badge tone="success">Aktywny</Badge>
                    )}
                  </td>
                  <td>
                    <div className="users-actions">
                      <button onClick={() => openEditModal(user)} className="admin-icon-btn" title="Edytuj">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="admin-icon-btn admin-icon-btn--danger" title="Usuń">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={7} className="users-table__empty">Brak użytkowników.</td>
                </tr>
              )}
              {users && users.length > 0 && visibleUsers?.length === 0 && (
                <tr>
                  <td colSpan={7} className="users-table__empty">Brak użytkowników pasujących do wyszukiwania.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="users-modal-scrim">
          <div className="users-modal" role="dialog" aria-modal="true" aria-labelledby="users-modal-create-title">
            <div className="users-modal__header">
              <h2 id="users-modal-create-title" className="users-modal__title">Dodaj anotatora</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="admin-icon-btn" title="Zamknij">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="users-modal__grid">
                <div className="users-field">
                  <label htmlFor="new_username">Nazwa użytkownika</label>
                  <input
                    id="new_username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="users-field">
                  <label htmlFor="new_password">Hasło tymczasowe</label>
                  <input
                    id="new_password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="users-field__mono"
                  />
                </div>
                <div className="users-field users-field--wide">
                  <label htmlFor="new_group">Grupa anotatorów</label>
                  <select
                    id="new_group"
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Brak grupy</option>
                    {groups?.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <label htmlFor="new_can_upload" className="users-toggle">
                  <input
                    type="checkbox"
                    id="new_can_upload"
                    checked={newCanUpload}
                    onChange={(e) => setNewCanUpload(e.target.checked)}
                  />
                  <span className="users-toggle__text">
                    <span className="users-toggle__title">Uprawnienia do wgrywania plików</span>
                  </span>
                </label>
              </div>
              <div className="users-modal__actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Anuluj</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Tworzenie…' : 'Utwórz konto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingUser && (
        <div className="users-modal-scrim">
          <div className="users-modal" role="dialog" aria-modal="true" aria-labelledby="users-modal-edit-title">
            <div className="users-modal__header">
              <h2 id="users-modal-edit-title" className="users-modal__title">
                Edytuj użytkownika: <span className="users-modal__login">{editingUser.username}</span>
              </h2>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="admin-icon-btn" title="Zamknij">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditUser}>
              <div className="users-modal__grid">
                <div className="users-field">
                  <label htmlFor="edit_first_name">Imię</label>
                  <input
                    id="edit_first_name"
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                  />
                </div>
                <div className="users-field">
                  <label htmlFor="edit_last_name">Nazwisko</label>
                  <input
                    id="edit_last_name"
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                  />
                </div>
                <div className="users-field">
                  <label htmlFor="edit_password">Nowe hasło</label>
                  <input
                    id="edit_password"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                  <span className="users-field__hint">Pozostaw puste, by nie zmieniać.</span>
                </div>
                <div className="users-field">
                  <label htmlFor="edit_group">Grupa anotatorów</label>
                  <select
                    id="edit_group"
                    value={editGroupId}
                    onChange={(e) => setEditGroupId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Brak grupy</option>
                    {groups?.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <label htmlFor="can_upload" className="users-toggle">
                  <input
                    type="checkbox"
                    id="can_upload"
                    checked={editCanUpload}
                    onChange={(e) => setEditCanUpload(e.target.checked)}
                  />
                  <span className="users-toggle__text">
                    <span className="users-toggle__title">Uprawnienia do wgrywania plików</span>
                  </span>
                </label>
              </div>
              <div className="users-modal__actions">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary">Anuluj</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                  {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
