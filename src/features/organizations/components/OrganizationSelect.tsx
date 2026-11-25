import { Building2 } from 'lucide-react';
import type { OrganizationRef } from '../../../types/organization';
import './OrganizationSelect.css';

interface OrganizationSelectProps {
  organizations: OrganizationRef[];
  value: number | null;
  onChange: (organizationId: number) => void;
  disabled?: boolean;
}

export default function OrganizationSelect({ organizations, value, onChange, disabled }: OrganizationSelectProps) {
  return (
    <label className="organization-select" title="Organizacja">
      <Building2 size={14} aria-hidden="true" />
      <select
        aria-label="Organizacja"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
