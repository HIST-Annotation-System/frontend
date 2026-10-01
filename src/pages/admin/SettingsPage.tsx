import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dictionariesApi } from '../../services/dictionariesApi';
import { Trash2, Plus } from 'lucide-react';
import './SettingsPage.css';

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
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Kategorie i grupy</h1>
      </div>

      <div className="settings-grid">
        {/* Categories Section */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Kategorie obrazów</h2>
          </div>

          <form onSubmit={handleAddCategory} className="settings-add-form">
            <input
              type="text"
              placeholder="Nowa kategoria..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="settings-input"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={createCategoryMutation.isPending || !newCategoryName.trim()}>
              <Plus size={16} /> Dodaj
            </button>
          </form>

          <div className="dict-list-container">
            {loadingCategories ? (
              <div className="loading-state">Ładowanie...</div>
            ) : (
              <ul className="dict-list">
                {categories?.map(category => (
                  <li key={category.id} className="dict-item">
                    <span>{category.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="icon-button danger"
                      title="Usuń"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {categories?.length === 0 && <li className="empty-state">Brak kategorii</li>}
              </ul>
            )}
          </div>
        </section>

        {/* Groups Section */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Grupy annotatorskie</h2>
          </div>

          <form onSubmit={handleAddGroup} className="settings-add-form">
            <input
              type="text"
              placeholder="Nowa grupa..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="settings-input"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={createGroupMutation.isPending || !newGroupName.trim()}>
              <Plus size={16} /> Dodaj
            </button>
          </form>

          <div className="dict-list-container">
            {loadingGroups ? (
              <div className="loading-state">Ładowanie...</div>
            ) : (
              <ul className="dict-list">
                {groups?.map(group => (
                  <li key={group.id} className="dict-item">
                    <span>{group.name}</span>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="icon-button danger"
                      title="Usuń"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {groups?.length === 0 && <li className="empty-state">Brak grup</li>}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
