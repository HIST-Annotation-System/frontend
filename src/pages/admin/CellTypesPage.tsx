import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cellTypesApi, cellTypeQueryKeys } from '../../services/cellTypesApi';
import type { CellType } from '../../types/cellType';
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react';
import './CellTypesPage.css';

export default function CellTypesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
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
    },
    onError: (err: unknown) => {
      setApiError(extractError(err, 'Nie można usunąć — typ komórki jest używany w anotacjach.'));
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
    if (window.confirm(`Usunąć typ komórki „${ct.name}"?`)) {
      deleteMutation.mutate(ct.id);
    }
  };

  return (
    <div className="ct-page">
      <div className="page-header">
        <h1 className="page-title">Typy komórek</h1>
        <p className="page-subtitle">
          Zarządzaj dostępnymi typami komórek używanymi podczas anotacji hotspotów.
        </p>
      </div>

      {apiError && (
        <div className="ct-api-error" role="alert">
          <span>{apiError}</span>
          <button type="button" className="ct-api-error__dismiss" onClick={() => setApiError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="ct-card">
        <div className="ct-card__header">
          <h2>Dostępne typy komórek</h2>
          <span className="ct-badge">{cellTypes?.length ?? 0}</span>
        </div>

        {/* Create form */}
        <form onSubmit={handleCreate} className="ct-add-form">
          <input
            id="new-cell-type-input"
            type="text"
            className="ct-input"
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
            <Plus size={15} />
            Dodaj
          </button>
        </form>

        {/* List */}
        <div className="ct-list-container">
          {isLoading ? (
            <div className="ct-loading">Ładowanie…</div>
          ) : (
            <ul className="ct-list" role="list">
              {cellTypes?.length === 0 && (
                <li className="ct-empty">Brak typów komórek. Dodaj pierwszy powyżej.</li>
              )}
              {cellTypes?.map((ct) => (
                <li key={ct.id} className="ct-item">
                  {editingId === ct.id ? (
                    /* Inline edit row */
                    <div className="ct-item__edit-row">
                      <input
                        id={`edit-cell-type-${ct.id}`}
                        type="text"
                        className="ct-input ct-input--inline"
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
                        className="icon-button success"
                        title="Zapisz"
                        onClick={() => confirmEdit(ct.id)}
                        disabled={updateMutation.isPending || !editName.trim()}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Anuluj"
                        onClick={cancelEdit}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    /* Normal row */
                    <>
                      <span className="ct-item__name">{ct.name}</span>
                      <div className="ct-item__actions">
                        <button
                          type="button"
                          className="icon-button"
                          title="Edytuj"
                          onClick={() => startEdit(ct)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          title="Usuń"
                          onClick={() => handleDelete(ct)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
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
