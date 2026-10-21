import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cellTypesApi, cellTypeQueryKeys } from '../../services/cellTypesApi';
import type { CellType } from '../../types/cellType';
import { Trash2, Plus, Pencil, Check, X, CircleAlert } from 'lucide-react';
import './CellTypesPage.css';

export default function CellTypesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    onError: (err: unknown) => {
      setApiError(extractError(err, 'Nie udało się utworzyć typu komórki.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => cellTypesApi.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
      setEditingId(null);
      setApiError(null);
    },
    onError: (err: unknown) => {
      setApiError(extractError(err, 'Nie udało się zaktualizować nazwy.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cellTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
      setApiError(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      setDeleteError(extractError(err, 'Nie można usunąć — typ komórki jest używany w anotacjach.'));
    },
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

  const cancelEdit = () => {
    setEditingId(null);
    setApiError(null);
  };

  const confirmEdit = (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    updateMutation.mutate({ id, name: trimmed });
  };

  const handleDelete = (ct: CellType) => {
    setDeleteError(null);
    if (window.confirm(`Usunąć typ komórki „${ct.name}"?`)) {
      deleteMutation.mutate(ct.id);
    }
  };

  return (
    <div className="admin-page ct-page">
      <div className="admin-page-header">
        <div className="admin-page-header__text">
          <h1 className="page-title">Typy komórek</h1>
          <p className="page-subtitle">
            Zarządzaj dostępnymi typami komórek używanymi podczas anotacji hotspotów.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="admin-alert admin-card--narrow" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{apiError}</span>
          <button type="button" className="admin-alert__dismiss" title="Zamknij" onClick={() => setApiError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="admin-card admin-card--narrow">
        <div className="admin-card__header">
          <h2 className="admin-card__title">Dostępne typy komórek</h2>
          <span className="admin-card__count">{cellTypes?.length ?? 0}</span>
        </div>

        {/* Create form */}
        <form onSubmit={handleCreate} className="admin-add-form">
          <input
            id="new-cell-type-input"
            type="text"
            className="admin-input"
            placeholder="Nazwa nowego typu komórki…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoComplete="off"
          />
          <button
            id="add-cell-type-btn"
            type="submit"
            className="btn-primary btn-sm"
            disabled={createMutation.isPending || !newName.trim()}
          >
            <Plus size={14} />
            Dodaj
          </button>
        </form>

        {/* List */}
        <div className="admin-list__scroll">
          {isLoading ? (
            <div className="admin-loading">Ładowanie…</div>
          ) : (
            <ul className="ct-list" role="list">
              {cellTypes && cellTypes.length > 0 && (
                <li className="ct-list__head" aria-hidden="true">
                  <span>Nazwa</span>
                  <span />
                </li>
              )}
              {cellTypes?.length === 0 && (
                <li className="admin-empty">Brak typów komórek. Dodaj pierwszy powyżej.</li>
              )}
              {cellTypes?.map((ct) => {
                // A failed delete is explained under its own row, as in the design.
                const deleteBlocked = deleteError !== null && deleteMutation.variables === ct.id;
                return (
                  <li key={ct.id} className="ct-item">
                    <div className="ct-item__row">
                      {editingId === ct.id ? (
                        /* Inline edit row */
                        <div className="ct-item__edit-row">
                          <input
                            id={`edit-cell-type-${ct.id}`}
                            type="text"
                            className="admin-input admin-input--inline ct-input--editing"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmEdit(ct.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn--success"
                            title="Zapisz"
                            onClick={() => confirmEdit(ct.id)}
                            disabled={updateMutation.isPending || !editName.trim()}
                          >
                            <Check size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            title="Anuluj"
                            onClick={cancelEdit}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="ct-item__name-cell">
                          <span className="ct-item__name">{ct.name}</span>
                          <button
                            type="button"
                            className="admin-icon-btn ct-item__rename"
                            title="Zmień nazwę"
                            onClick={() => startEdit(ct)}
                          >
                            <Pencil size={13} />
                          </button>
                        </span>
                      )}
                      <span className="ct-item__actions">
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Usuń typ"
                          onClick={() => handleDelete(ct)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </div>
                    {deleteBlocked && (
                      <div className="ct-item__blocked" role="alert">
                        <CircleAlert size={14} aria-hidden="true" />
                        <span>{deleteError}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function extractError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return fallback;
}
