import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { organizationQueryKeys, organizationsApi } from '../../../services/organizationsApi';
import { isSystemAdmin } from '../../../utils/roles';

/** Every organization, for the system admin only (everyone else works in their own and gets an empty list). */
export function useOrganizations() {
  const { user } = useAuth();
  const enabled = isSystemAdmin(user);
  const query = useQuery({
    queryKey: organizationQueryKeys.all,
    queryFn: ({ signal }) => organizationsApi.list(signal),
    enabled,
  });
  const organizations = enabled ? (query.data ?? []) : [];
  return {
    ...query,
    organizations,
    /** The system admin has to say where new slides, folders and accounts go once there is more than one. */
    needsChoice: organizations.length > 1,
  };
}
