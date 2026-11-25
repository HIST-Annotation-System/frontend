import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Trash2, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useOrganizations } from '../../features/organizations/hooks/useOrganizations';
import { ApiError } from '../../services/httpClient';
import { organizationQueryKeys, organizationsApi } from '../../services/organizationsApi';
import { usersApi } from '../../services/usersApi';
import type { Organization } from '../../types/organization';
import { getErrorMessage } from '../../utils/errors';
import { formatDateTime, formatRelativeDate } from '../../utils/format';
import CreateUserModal from '../../features/users/components/CreateUserModal';
import AdminAlert from './AdminAlert';
import { AdminEmpty, AdminSkeleton } from './AdminParts';
import './UsersPage.css';

const NAME_MAX_LENGTH = 255;

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const { organizations, isLoading } = useOrganizations();
  const [newName, setNewName] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Organization | null>(null);
  const [adminFor, setAdminFor] = useState<Organization | null>(null);
  // To tell which organizations already have an administrator.
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll() });
  const hasAdmin = (organization: Organization) =>
    users?.some((user) => user.role === 'ORG_ADMIN' && user.organization?.id === organization.id) ?? false;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: organizationQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => organizationsApi.create(name),
    onSuccess: () => {
      refresh();
      setNewName('');
      setApiError(null);
    },
    onError: (err: unknown) => setApiError(getErrorMessage(err, 'Nie udało się utworzyć organizacji.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => organizationsApi.delete(id),
    onSuccess: () => {
      refresh();
      setDeleting(null);
    },
  });

  const trimmedName = newName.trim();
  const nameTaken = organizations.some((organization) => organization.name === trimmedName);

  const openAdminDialog = (organization: Organization) => setAdminFor(organization);

  const openDeleteDialog = (organization: Organization) => {
    deleteMutation.reset();
    setDeleting(organization);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Organizacje
          <span className="admin-page-count">{organizations.length}</span>
        </h1>
        <span className="admin-page-spacer" />
        <form
          className="admin-header-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmedName && !nameTaken) createMutation.mutate(trimmedName);
          }}
        >
          <input
            type="text"
            className={`admin-input${nameTaken ? ' admin-input--invalid' : ''}`}
            placeholder="Nazwa nowej organizacji"
            aria-label="Nazwa nowej organizacji"
            value={newName}
            maxLength={NAME_MAX_LENGTH}
            aria-invalid={nameTaken ? true : undefined}
            onChange={(e) => {
              setNewName(e.target.value);
              setApiError(null);
            }}
            autoComplete="off"
          />
          <Button type="submit" variant="primary" disabled={createMutation.isPending || !trimmedName || nameTaken}>
            Dodaj
          </Button>
        </form>
      </div>

      <div className="admin-list">
        <div className="admin-list__col">
          <p className="admin-page-desc">
            Organizacja zamyka w sobie konta, slajdy i foldery hotspotów. Po założeniu dodaj jej administratora.
          </p>

          {nameTaken ? (
            <div className="admin-alert" role="alert">
              <span>Organizacja „{trimmedName}” już istnieje.</span>
            </div>
          ) : (
            apiError && <AdminAlert message={apiError} onDismiss={() => setApiError(null)} />
          )}

          {isLoading ? (
            <AdminSkeleton />
          ) : organizations.length === 0 ? (
            <AdminEmpty
              icon={<Building2 size={32} aria-hidden="true" />}
              title="Brak organizacji"
              text="Wpisz nazwę powyżej, aby założyć pierwszą."
            />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th className="admin-table__num">Członkowie</th>
                  <th>Administrator</th>
                  <th>Utworzono</th>
                  <th className="admin-table__actions" aria-label="Akcje" />
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="admin-table__truncate" title={organization.name}>
                      {organization.name}
                    </td>
                    <td className="admin-table__num admin-table__muted">{organization.member_count}</td>
                    <td>
                      {users === undefined ? null : hasAdmin(organization) ? (
                        <span className="admin-dot">istnieje</span>
                      ) : (
                        <span className="admin-chip admin-chip--warn">brak</span>
                      )}
                    </td>
                    <td className="admin-table__muted" title={formatDateTime(organization.created_at)}>
                      {formatRelativeDate(organization.created_at)}
                    </td>
                    <td className="admin-table__actions">
                      <span className="admin-row-actions">
                        <button
                          type="button"
                          onClick={() => openAdminDialog(organization)}
                          className="admin-icon-btn"
                          title="Dodaj użytkownika"
                          aria-label={`Dodaj użytkownika do organizacji ${organization.name}`}
                        >
                          <UserPlus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(organization)}
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Usuń organizację"
                          aria-label={`Usuń organizację ${organization.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {adminFor && (
        <CreateUserModal
          organizationId={adminFor.id}
          // The first account of an organization is usually its administrator; after that, annotators.
          role={hasAdmin(adminFor) ? 'ANNOTATOR' : 'ORG_ADMIN'}
          onClose={() => {
            setAdminFor(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        title="Usuń organizację"
        open={deleting !== null}
        confirmLabel="Usuń"
        busy={deleteMutation.isPending}
        error={
          deleteMutation.isError
            ? deleteMutation.error instanceof ApiError && deleteMutation.error.status === 409
              ? 'Nie można usunąć — organizacja ma jeszcze konta, slajdy lub foldery hotspotów.'
              : getErrorMessage(deleteMutation.error, 'Nie udało się usunąć organizacji.')
            : null
        }
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      >
        Czy na pewno chcesz usunąć organizację „{deleting?.name}”?
      </ConfirmDialog>
    </div>
  );
}
