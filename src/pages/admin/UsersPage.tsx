import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { Trash2, Pencil } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { getErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { useOrganizations } from '../../features/organizations/hooks/useOrganizations';
import { ALL_ROLES, isSystemAdmin, ORGANIZATION_ROLES, ROLE_LABELS } from '../../utils/roles';
import CreateUserModal from '../../features/users/components/CreateUserModal';
import './UsersPage.css';
import type { AccountResponse, ProfileUpdate, Role } from '../../types/user';

const ALL_ORGANIZATIONS = 'all';
type OrganizationFilter = number | typeof ALL_ORGANIZATIONS;

/** "First Last", or null when the profile has neither name set. */
function fullNameOf(user: AccountResponse): string | null {
  const name = `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim();
  return name || null;
}

type RoleFilter = 'all' | Role;

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'Wszyscy' },
  { id: 'ADMIN', label: 'Administratorzy' },
  { id: 'ORG_ADMIN', label: 'Adm. organizacji' },
  { id: 'ANNOTATOR', label: 'Anotatorzy' },
];

const inOrganization = (user: AccountResponse, organization: OrganizationFilter): boolean =>
  organization === ALL_ORGANIZATIONS || user.organization?.id === organization;

/** Client-side list filter: name or login substring, role and (for the system admin) organization. */
function matchesFilter(user: AccountResponse, query: string, role: RoleFilter, organization: OrganizationFilter): boolean {
  if (role !== 'all' && user.role !== role) return false;
  if (!inOrganization(user, organization)) return false;
  if (!query) return true;
  return (fullNameOf(user) ?? '').toLowerCase().includes(query) || user.username.toLowerCase().includes(query);
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const systemAdmin = isSystemAdmin(currentUser);
  const { organizations } = useOrganizations();
  const assignableRoles = systemAdmin ? ALL_ROLES : ORGANIZATION_ROLES;
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilter>(ALL_ORGANIZATIONS);
  const [editRole, setEditRole] = useState<Role>('ANNOTATOR');
  const [editOrganizationId, setEditOrganizationId] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccountResponse | null>(null);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCanUpload, setEditCanUpload] = useState(false);

  const [deletingUser, setDeletingUser] = useState<AccountResponse | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
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

  const openCreateModal = () => setIsModalOpen(true);

  const openDeleteDialog = (user: AccountResponse) => {
    deleteMutation.reset();
    setDeletingUser(user);
  };

  const openEditModal = (user: AccountResponse) => {
    setEditingUser(user);
    setEditFirstName(user.profile?.first_name || '');
    setEditLastName(user.profile?.last_name || '');
    setEditCanUpload(user.profile?.can_upload || false);
    setEditRole(user.role);
    setEditOrganizationId(user.organization?.id ?? '');
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
    if (editRole !== editingUser.role) updateData.role = editRole;
    const movesOrganization = editOrganizationId !== '' && editOrganizationId !== editingUser.organization?.id;
    if (systemAdmin && editRole !== 'ADMIN' && movesOrganization) updateData.organization_id = editOrganizationId;

    updateMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const roleSelect = (value: Role, onChange: (value: Role) => void, disabled = false) => (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as Role)}>
      {(assignableRoles.includes(value) ? assignableRoles : [value, ...assignableRoles]).map((role) => (
        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
      ))}
    </select>
  );

  const organizationSelect = (value: number | '', onChange: (value: number | '') => void) => (
    <select value={value} required onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
      {value === '' && <option value="">Wybierz organizację</option>}
      {organizations.map((organization) => (
        <option key={organization.id} value={organization.id}>{organization.name}</option>
      ))}
    </select>
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleUsers = users?.filter((user) => matchesFilter(user, normalizedQuery, roleFilter, organizationFilter));
  const filteredByOrganization = users?.filter((user) => inOrganization(user, organizationFilter));
  const roleCount = (role: RoleFilter) =>
    role === 'all'
      ? (filteredByOrganization?.length ?? 0)
      : (filteredByOrganization?.filter((user) => user.role === role).length ?? 0);
  const roleFilters = systemAdmin ? ROLE_FILTERS : ROLE_FILTERS.filter((filter) => filter.id !== 'ADMIN');
  const columnCount = systemAdmin ? 7 : 6;

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
        {systemAdmin && organizations.length > 0 && (
          <select
            className="users-org-filter"
            aria-label="Filtr organizacji"
            value={organizationFilter}
            onChange={(e) =>
              setOrganizationFilter(e.target.value === ALL_ORGANIZATIONS ? ALL_ORGANIZATIONS : Number(e.target.value))
            }
          >
            <option value={ALL_ORGANIZATIONS}>Wszystkie organizacje</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
        )}
        <div className="segmented" role="group" aria-label="Filtr roli">
          {roleFilters.map((filter) => {
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
              {systemAdmin && <th>Organizacja</th>}
              <th>Wgrywanie</th>
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
                <td>{(ROLE_LABELS[user.role] ?? user.role).toLowerCase()}</td>
                {systemAdmin && (
                  <td className="admin-table__muted admin-table__truncate users-org" title={user.organization?.name}>
                    {user.organization?.name ?? <span className="admin-table__faint">—</span>}
                  </td>
                )}
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
                <td colSpan={columnCount}>Brak użytkowników.</td>
              </tr>
            )}
            {users && users.length > 0 && visibleUsers?.length === 0 && (
              <tr className="admin-table__empty">
                <td colSpan={columnCount}>Brak użytkowników pasujących do wyszukiwania.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <CreateUserModal
          // A list filtered to one organization suggests where the new account goes.
          organizationId={organizationFilter !== ALL_ORGANIZATIONS ? organizationFilter : null}
          onClose={() => setIsModalOpen(false)}
        />
      )}

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
            <span className="admin-field__label">Rola</span>
            {roleSelect(editRole, setEditRole, editingUser?.id === currentUser?.id)}
          </label>
          {systemAdmin && editRole !== 'ADMIN' && (
            <label className="admin-field">
              <span className="admin-field__label">Organizacja</span>
              {organizationSelect(editOrganizationId, setEditOrganizationId)}
            </label>
          )}
          <label className="users-check">
            <input type="checkbox" checked={editCanUpload} onChange={(e) => setEditCanUpload(e.target.checked)} />
            Może wgrywać pliki
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
