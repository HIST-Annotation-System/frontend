import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Spinner from '../../components/ui/Spinner';
import { cellTypesApi, cellTypeQueryKeys } from '../../services/cellTypesApi';
import type { CellType } from '../../types/cellType';
import { getErrorMessage } from '../../utils/errors';

export default function CellTypesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<CellType | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: cellTypes, isLoading } = useQuery({
    queryKey: cellTypeQueryKeys.all,
    queryFn: ({ signal }) => cellTypesApi.list(signal),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => cellTypesApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
      setNewName('');
      setApiError(null);
    },
    onError: (err: unknown) => setApiError(getErrorMessage(err, 'Nie udało się utworzyć typu komórki.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => cellTypesApi.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
      setEditingId(null);
      setApiError(null);
    },
    onError: (err: unknown) => setApiError(getErrorMessage(err, 'Nie udało się zaktualizować nazwy.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cellTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
      setApiError(null);
    },
    onError: (err: unknown) =>
      setApiError(getErrorMessage(err, 'Nie można usunąć: typ komórki jest używany w anotacjach.')),
    onSettled: () => setDeleting(null),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  const startEdit = (ct: CellType) => {
    setEditingId(ct.id);
    setEditName(ct.name);
    setApiError(null);
  };

  const confirmEdit = (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    updateMutation.mutate({ id, name: trimmed });
  };

  return (
    <>
      <div className="page-strip">
        <h1 className="page-strip__title">
          Typy komórek
          {cellTypes && <span className="page-strip__count">{cellTypes.length}</span>}
        </h1>
      </div>
      <div className="admin-page__body">
        <p className="admin-page__intro">Typy komórek, które annotatorzy przypisują do anotacji hotspotów.</p>
        <form onSubmit={handleCreate} className="admin-page__add">
          <label className="form-field">
            <span className="form-field__label">Nowy typ komórki</span>
            <input
              className="field"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
            Dodaj
          </Button>
        </form>
        {apiError && <ErrorMessage message={apiError} onDismiss={() => setApiError(null)} />}

        {isLoading ? (
          <Spinner />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th aria-label="Akcje" />
              </tr>
            </thead>
            <tbody>
              {cellTypes?.map((ct) => (
                <tr key={ct.id}>
                  {editingId === ct.id ? (
                    <>
                      <td>
                        <input
                          className="field admin-page__inline-input"
                          type="text"
                          aria-label="Nazwa typu komórki"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEdit(ct.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                        />
                      </td>
                      <td className="admin-page__row-actions">
                        <Button small disabled={updateMutation.isPending || !editName.trim()} onClick={() => confirmEdit(ct.id)}>
                          Zapisz
                        </Button>
                        <Button small onClick={() => setEditingId(null)}>
                          Anuluj
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{ct.name}</td>
                      <td className="admin-page__row-actions">
                        <Button small onClick={() => startEdit(ct)}>
                          Zmień nazwę
                        </Button>
                        <Button small variant="danger" disabled={deleteMutation.isPending} onClick={() => setDeleting(ct)}>
                          Usuń
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {cellTypes?.length === 0 && (
                <tr>
                  <td className="data-table__muted" colSpan={2}>
                    Brak typów komórek. Dodaj pierwszy powyżej.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog
        title="Usuń typ komórki"
        open={deleting !== null}
        confirmLabel="Usuń"
        busy={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      >
        Usunąć typ komórki „{deleting?.name}”?
      </ConfirmDialog>
    </>
  );
}
