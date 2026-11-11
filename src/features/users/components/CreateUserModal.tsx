import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { organizationQueryKeys } from '../../../services/organizationsApi';
import { usersApi } from '../../../services/usersApi';
import type { AccountCreate, Role } from '../../../types/user';
import { getErrorMessage } from '../../../utils/errors';
import { ALL_ROLES, isSystemAdmin, ORGANIZATION_ROLES, ROLE_LABELS } from '../../../utils/roles';
import { useOrganizations } from '../../organizations/hooks/useOrganizations';
import '../../../pages/admin/UsersPage.css';

interface CreateUserModalProps {
  /** Preselected organization (system admin only; an organization's admin always adds to their own). */
  organizationId?: number | null;
  role?: Role;
  onClose: () => void;
}

export default function CreateUserModal({ organizationId = null, role = 'ANNOTATOR', onClose }: CreateUserModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const systemAdmin = isSystemAdmin(user);
  const { organizations } = useOrganizations();
  const roles = systemAdmin ? ALL_ROLES : ORGANIZATION_ROLES;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>(role);
  const [chosenOrganizationId, setChosenOrganizationId] = useState<number | ''>(organizationId ?? '');
  const [canUpload, setCanUpload] = useState(false);
  const firstOrganization = organizations.at(0);
  const selectedOrganizationId: number | '' =
    chosenOrganizationId === '' ? (firstOrganization?.id ?? '') : chosenOrganizationId;

  const createMutation = useMutation({
    mutationFn: (data: AccountCreate) => usersApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.all });
      onClose();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      username,
      password,
      role: newRole,
      can_upload: canUpload,
      organization_id:
        systemAdmin && newRole !== 'ADMIN' && selectedOrganizationId !== '' ? selectedOrganizationId : undefined,
    });
  };

  return (
    <Modal title="Dodaj użytkownika" open onClose={onClose}>
      <form className="users-form" onSubmit={submit}>
        <label className="admin-field">
          <span className="admin-field__label">Nazwa użytkownika</span>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label className="admin-field">
          <span className="admin-field__label">Hasło tymczasowe</span>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className="admin-field">
          <span className="admin-field__label">Rola</span>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
            {roles.map((item) => (
              <option key={item} value={item}>{ROLE_LABELS[item]}</option>
            ))}
          </select>
        </label>
        {systemAdmin && newRole !== 'ADMIN' && (
          <label className="admin-field">
            <span className="admin-field__label">Organizacja</span>
            <select
              value={selectedOrganizationId}
              required
              onChange={(e) => setChosenOrganizationId(e.target.value ? Number(e.target.value) : '')}
            >
              {selectedOrganizationId === '' && <option value="">Wybierz organizację</option>}
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="users-check">
          <input type="checkbox" checked={canUpload} onChange={(e) => setCanUpload(e.target.checked)} />
          Może wgrywać pliki
        </label>
        {createMutation.isError && (
          <p className="users-form__error" role="alert">
            {getErrorMessage(createMutation.error, 'Nie udało się utworzyć konta.')}
          </p>
        )}
        <div className="users-form__actions">
          <Button onClick={onClose}>Anuluj</Button>
          <Button type="submit" variant="primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Tworzenie…' : 'Utwórz konto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
