import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import { dictionariesApi } from '../../services/dictionariesApi';
import './SettingsPage.css';

interface DictionaryItem {
  id: number;
  name: string;
}

interface DictionaryListProps {
  title: string;
  placeholder: string;
  items: DictionaryItem[] | undefined;
  isLoading: boolean;
  isCreating: boolean;
  onCreate: (name: string) => void;
  onDelete: (item: DictionaryItem) => void;
}

function DictionaryList({ title, placeholder, items, isLoading, isCreating, onCreate, onDelete }: DictionaryListProps) {
  const [name, setName] = useState('');

  return (
    <section className="settings-list">
      <h2 className="settings-list__title">
        {title}
        {items && <span className="page-strip__count">{items.length}</span>}
      </h2>
      <form
        className="admin-page__add"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onCreate(name.trim());
          setName('');
        }}
      >
        <input className="field settings-list__input" placeholder={placeholder} value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" disabled={isCreating || !name.trim()}>
          Dodaj
        </Button>
      </form>
      {isLoading ? (
        <Spinner />
      ) : (
        <table className="data-table settings-list__table">
          <tbody>
            {items?.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="admin-page__row-actions">
                  <Button small variant="danger" onClick={() => onDelete(item)}>
                    Usuń
                  </Button>
                </td>
              </tr>
            ))}
            {items?.length === 0 && (
              <tr>
                <td className="data-table__muted" colSpan={2}>
                  Brak pozycji.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<{ kind: 'category' | 'group'; item: DictionaryItem } | null>(null);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dictionariesApi.getCategories(),
  });

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => dictionariesApi.getGroups(),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => dictionariesApi.createCategory(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => dictionariesApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => dictionariesApi.createGroup(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => dictionariesApi.deleteGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });

  const confirmDelete = () => {
    if (!deleting) return;
    (deleting.kind === 'category' ? deleteCategoryMutation : deleteGroupMutation).mutate(deleting.item.id);
    setDeleting(null);
  };

  return (
    <>
      <div className="page-strip">
        <h1 className="page-strip__title">Kategorie i grupy</h1>
      </div>
      <div className="settings-page">
        <DictionaryList
          title="Kategorie obrazów"
          placeholder="Nowa kategoria"
          items={categories}
          isLoading={loadingCategories}
          isCreating={createCategoryMutation.isPending}
          onCreate={(name) => createCategoryMutation.mutate(name)}
          onDelete={(item) => setDeleting({ kind: 'category', item })}
        />
        <DictionaryList
          title="Grupy annotatorskie"
          placeholder="Nowa grupa"
          items={groups}
          isLoading={loadingGroups}
          isCreating={createGroupMutation.isPending}
          onCreate={(name) => createGroupMutation.mutate(name)}
          onDelete={(item) => setDeleting({ kind: 'group', item })}
        />
      </div>
      <ConfirmDialog
        title={deleting?.kind === 'group' ? 'Usuń grupę' : 'Usuń kategorię'}
        open={deleting !== null}
        confirmLabel="Usuń"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        {deleting?.kind === 'group'
          ? `Czy usunąć grupę „${deleting.item.name}”? Zostanie ona usunięta ze wszystkich profili.`
          : `Czy usunąć kategorię „${deleting?.item.name}”?`}
      </ConfirmDialog>
    </>
  );
}
