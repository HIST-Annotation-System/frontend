import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dictionariesApi } from '../../services/dictionariesApi';
import { Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import './SettingsPage.css';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dictionariesApi.getCategories(),
  });

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

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate(newCategoryName);
  };

  const confirmDelete = () => {
    if (deleting === null) return;
    deleteCategoryMutation.mutate(deleting);
    setDeleting(null);
  };

  return (
    <div className="admin-page settings-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Kategorie</h1>
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
                        onClick={() => setDeleting(category.id)}
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

      </div>

      <ConfirmDialog
        title="Usuń kategorię"
        open={deleting !== null}
        confirmLabel="Usuń"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        Czy usunąć tę kategorię?
      </ConfirmDialog>
    </div>
  );
}
