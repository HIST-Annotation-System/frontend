import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dictionariesApi } from '../../services/dictionariesApi';
import { usersApi } from '../../services/usersApi';
import { Trash2, Plus, Tag, Users } from 'lucide-react';
import './SettingsPage.css';

/** Polish plural of "osoba" for a member count. */
function peopleLabel(count: number): string {
  if (count === 1) return '1 osoba';
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} osoby`;
  return `${count} osób`;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Categories state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Groups state
  const [newGroupName, setNewGroupName] = useState('');

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

  // Mutations
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

  // Handlers
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

  const handleDeleteCategory = (id: number) => {
    if (window.confirm('Czy usunąć tę kategorię?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleDeleteGroup = (id: number) => {
    if (window.confirm('Czy usunąć tę grupę? Zostanie ona usunięta ze wszystkich profili.')) {
      deleteGroupMutation.mutate(id);
    }
  };

  return (
    <div className="admin-page settings-page">
      <div className="admin-page-header">
        <div className="admin-page-header__text">
          <h1 className="page-title">Kategorie i grupy</h1>
        </div>
      </div>

      <div className="settings-grid">
        {/* Categories Section */}
        <section className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Kategorie obrazów</h2>
            {categories && <span className="admin-card__count">{categories.length}</span>}
          </div>

          <form onSubmit={handleAddCategory} className="admin-add-form">
            <input
              type="text"
              placeholder="Nowa kategoria…"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="admin-input"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={createCategoryMutation.isPending || !newCategoryName.trim()}>
              <Plus size={14} /> Dodaj
            </button>
          </form>

          <div className="admin-list__scroll">
            {loadingCategories ? (
              <div className="admin-loading">Ładowanie…</div>
            ) : (
              <ul className="admin-list">
                {categories?.map(category => (
                  <li key={category.id} className="admin-list__item">
                    <Tag size={15} className="admin-list__icon" aria-hidden="true" />
                    <span className="admin-list__name">{category.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="admin-icon-btn admin-icon-btn--danger"
                      title="Usuń"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
                {categories?.length === 0 && <li className="admin-empty">Brak kategorii</li>}
              </ul>
            )}
          </div>
        </section>

        {/* Groups Section */}
        <section className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Grupy anotatorów</h2>
            {groups && <span className="admin-card__count">{groups.length}</span>}
          </div>

          <form onSubmit={handleAddGroup} className="admin-add-form">
            <input
              type="text"
              placeholder="Nowa grupa…"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="admin-input"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={createGroupMutation.isPending || !newGroupName.trim()}>
              <Plus size={14} /> Dodaj
            </button>
          </form>

          <div className="admin-list__scroll">
            {loadingGroups ? (
              <div className="admin-loading">Ładowanie…</div>
            ) : (
              <ul className="admin-list">
                {groups?.map(group => (
                  <li key={group.id} className="admin-list__item">
                    <Users size={15} className="admin-list__icon" aria-hidden="true" />
                    <span className="admin-list__name">{group.name}</span>
                    {users && <span className="admin-list__usage">{peopleLabel(memberCount(group.id))}</span>}
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="admin-icon-btn admin-icon-btn--danger"
                      title="Usuń"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
                {groups?.length === 0 && <li className="admin-empty">Brak grup</li>}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
