import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dictionariesApi } from '../../services/dictionariesApi';
import { usersApi } from '../../services/usersApi';
import { Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import './SettingsPage.css';

interface PendingDelete {
  kind: 'category' | 'group';
  id: number;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  const [deleting, setDeleting] = useState<PendingDelete | null>(null);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dictionariesApi.getCategories(),
  });

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => dictionariesApi.getGroups(),
  });

  // Read-only: member counts per group (same cache as the users page)
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });
  const memberCount = (groupId: number) =>
    users?.filter((user) => user.profile?.group?.id === groupId).length ?? 0;

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => dictionariesApi.createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCategoryName('');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => dictionariesApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => dictionariesApi.createGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setNewGroupName('');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => dictionariesApi.deleteGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] })
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate(newCategoryName);
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate(newGroupName);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    (deleting.kind === 'category' ? deleteCategoryMutation : deleteGroupMutation).mutate(deleting.id);
    setDeleting(null);
  };

  return (
    <div className="admin-page settings-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Kategorie i grupy</h1>
      </div>

      <div className="settings-split">
        <section className="settings-section" aria-labelledby="settings-categories-title">
          <h2 id="settings-categories-title" className="settings-section__title">
            Kategorie obrazów
            {categories && <span className="admin-page-count">{categories.length}</span>}
          </h2>
          <form onSubmit={handleAddCategory} className="admin-add">
            <label className="admin-field">
              <span className="admin-field__label">Nowa kategoria</span>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="admin-input"
                autoComplete="off"
              />
            </label>
            <Button type="submit" variant="primary" disabled={createCategoryMutation.isPending || !newCategoryName.trim()}>
              Dodaj
            </Button>
          </form>

          {loadingCategories ? (
            <div className="admin-loading">Ładowanie…</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th className="admin-table__actions" aria-label="Akcje" />
                </tr>
              </thead>
              <tbody>
                {categories?.map(category => (
                  <tr key={category.id}>
                    <td className="admin-table__truncate settings-name" title={category.name}>{category.name}</td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        onClick={() => setDeleting({ kind: 'category', id: category.id })}
                        className="admin-icon-btn admin-icon-btn--danger"
                        title="Usuń kategorię"
                        aria-label="Usuń kategorię"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {categories?.length === 0 && (
                  <tr className="admin-table__empty">
                    <td colSpan={2}>Brak kategorii</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        <section className="settings-section" aria-labelledby="settings-groups-title">
          <h2 id="settings-groups-title" className="settings-section__title">
            Grupy anotatorów
            {groups && <span className="admin-page-count">{groups.length}</span>}
          </h2>
          <form onSubmit={handleAddGroup} className="admin-add">
            <label className="admin-field">
              <span className="admin-field__label">Nowa grupa</span>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="admin-input"
                autoComplete="off"
              />
            </label>
            <Button type="submit" variant="primary" disabled={createGroupMutation.isPending || !newGroupName.trim()}>
              Dodaj
            </Button>
          </form>

          {loadingGroups ? (
            <div className="admin-loading">Ładowanie…</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  {users && <th className="admin-table__num">Osoby</th>}
                  <th className="admin-table__actions" aria-label="Akcje" />
                </tr>
              </thead>
              <tbody>
                {groups?.map(group => (
                  <tr key={group.id}>
                    <td className="admin-table__truncate settings-name" title={group.name}>{group.name}</td>
                    {users && <td className="admin-table__num admin-table__muted">{memberCount(group.id)}</td>}
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        onClick={() => setDeleting({ kind: 'group', id: group.id })}
                        className="admin-icon-btn admin-icon-btn--danger"
                        title="Usuń grupę"
                        aria-label="Usuń grupę"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {groups?.length === 0 && (
                  <tr className="admin-table__empty">
                    <td colSpan={users ? 3 : 2}>Brak grup</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <ConfirmDialog
        title={deleting?.kind === 'group' ? 'Usuń grupę' : 'Usuń kategorię'}
        open={deleting !== null}
        confirmLabel="Usuń"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        {deleting?.kind === 'group'
          ? 'Czy usunąć tę grupę? Zostanie ona usunięta ze wszystkich profili.'
          : 'Czy usunąć tę kategorię?'}
      </ConfirmDialog>
    </div>
  );
}
