import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cellTypesApi, cellTypeQueryKeys } from '../../services/cellTypesApi';
import { ApiError } from '../../services/httpClient';
import type { CellType } from '../../types/cellType';
import { Pencil, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import AdminAlert from './AdminAlert';
import { getErrorMessage } from '../../utils/errors';
import {
  CELL_TYPE_NAME_MAX_LENGTH,
  CELL_TYPE_NAME_TAKEN_CODE,
  findCellTypeByName,
  normalizeCellTypeName,
} from '../../features/annotations/utils/cellTypeNames';

const duplicateMessage = (existing: CellType) => `Typ komórki „${existing.name}” już istnieje.`;

export default function CellTypesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CellType | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: cellTypes, isLoading } = useQuery({
    queryKey: cellTypeQueryKeys.all,
    queryFn: ({ signal }) => cellTypesApi.list(signal),
  });

  // A name taken in the meantime (another admin, another tab): reload the list, so the duplicate shows up inline.
  const onNameTaken = (err: unknown) => {
    if (err instanceof ApiError && err.code === CELL_TYPE_NAME_TAKEN_CODE) {
      queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
    }
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => cellTypesApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
      setNewName('');
      setApiError(null);
    },
    onError: (err: unknown) => {
      onNameTaken(err);
      setApiError(cellTypeErrorMessage(err, 'Nie udało się utworzyć typu komórki.'));
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
      onNameTaken(err);
      setApiError(cellTypeErrorMessage(err, 'Nie udało się zaktualizować nazwy.'));
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
      setDeleteError(
        err instanceof ApiError && err.status === 409
          ? 'Nie można usunąć — typ komórki jest używany w anotacjach.'
          : getErrorMessage(err, 'Nie udało się usunąć typu komórki.'),
      );
    },
    onSettled: () => setDeleting(null),
  });

  const normalizedNew = normalizeCellTypeName(newName);
  const newDuplicate = findCellTypeByName(cellTypes ?? [], newName);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedNew || newDuplicate) return;
    createMutation.mutate(normalizedNew);
  };

  const rename = (id: number, name: string) => {
    setApiError(null);
    updateMutation.mutate({ id, name });
  };

  const handleDelete = (ct: CellType) => {
    setDeleteError(null);
    setDeleting(ct);
  };

  return (
    <div className="admin-page ct-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Typy komórek
          {cellTypes && <span className="admin-page-count">{cellTypes.length}</span>}
        </h1>
      </div>

      <form onSubmit={handleCreate} className="admin-add">
        <label className="admin-field">
          <span className="admin-field__label">Nowy typ komórki</span>
          <input
            id="new-cell-type-input"
            type="text"
            className={`admin-input${newDuplicate ? ' admin-input--invalid' : ''}`}
            value={newName}
            maxLength={CELL_TYPE_NAME_MAX_LENGTH}
            aria-invalid={newDuplicate ? true : undefined}
            aria-describedby={newDuplicate ? 'new-cell-type-duplicate' : undefined}
            onChange={(e) => {
              setNewName(e.target.value);
              setApiError(null);
            }}
            autoComplete="off"
          />
        </label>
        <Button
          id="add-cell-type-btn"
          type="submit"
          variant="primary"
          disabled={createMutation.isPending || !normalizedNew || newDuplicate !== undefined}
        >
          Dodaj
        </Button>
      </form>

      {newDuplicate ? (
        <div id="new-cell-type-duplicate" className="admin-alert" role="alert">
          <span>{duplicateMessage(newDuplicate)}</span>
        </div>
      ) : (
        apiError && <AdminAlert message={apiError} onDismiss={() => setApiError(null)} />
      )}

      {isLoading ? (
        <div className="admin-loading">Ładowanie…</div>
      ) : (
        <table className="admin-table admin-table--720 admin-table--editable">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th className="admin-table__actions" aria-label="Akcje" />
            </tr>
          </thead>
          <tbody>
            {cellTypes?.length === 0 && (
              <tr className="admin-table__empty">
                <td colSpan={2}>Brak typów komórek.</td>
              </tr>
            )}
            {cellTypes?.map((ct) => {
              // A failed delete is explained under its own row.
              const deleteBlocked = deleteError !== null && deleteMutation.variables === ct.id;
              return (
                <Fragment key={ct.id}>
                  <CellTypeRow
                    cellType={ct}
                    cellTypes={cellTypes}
                    isDuplicateTarget={newDuplicate?.id === ct.id}
                    isEditing={editingId === ct.id}
                    isSaving={updateMutation.isPending && updateMutation.variables?.id === ct.id}
                    isDeleting={deleteMutation.isPending}
                    onStartEdit={() => {
                      setApiError(null);
                      setEditingId(ct.id);
                    }}
                    onCancelEdit={() => setEditingId(null)}
                    onRename={(name) => rename(ct.id, name)}
                    onDelete={() => handleDelete(ct)}
                  />
                  {deleteBlocked && (
                    <tr className="admin-table__error">
                      <td colSpan={2}>
                        <span role="alert">{deleteError}</span>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

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
    </div>
  );
}

interface CellTypeRowProps {
  cellType: CellType;
  /** All cell types, to flag a rename onto a name that is already taken. */
  cellTypes: readonly CellType[];
  /** The name typed in the "add" field already belongs to this type. */
  isDuplicateTarget: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

/** One cell type: the name with rename and delete buttons, or a field with "Zapisz" / "Anuluj" while renaming. */
function CellTypeRow({
  cellType,
  cellTypes,
  isDuplicateTarget,
  isEditing,
  isSaving,
  isDeleting,
  onStartEdit,
  onCancelEdit,
  onRename,
  onDelete,
}: CellTypeRowProps) {
  const [name, setName] = useState(cellType.name);
  const normalized = normalizeCellTypeName(name);
  const duplicate = isEditing ? findCellTypeByName(cellTypes, name, cellType.id) : undefined;
  const save = () => {
    if (!normalized || duplicate) return;
    if (normalized === cellType.name) onCancelEdit();
    else onRename(normalized);
  };
  const startEdit = () => {
    setName(cellType.name);
    onStartEdit();
  };

  if (isEditing) {
    const errorId = `cell-type-${cellType.id}-duplicate`;
    return (
      <>
        <tr>
          <td>
            <input
              type="text"
              className={`admin-edit-input${duplicate ? ' admin-input--invalid' : ''}`}
              aria-label="Nazwa typu komórki"
              aria-invalid={duplicate ? true : undefined}
              aria-describedby={duplicate ? errorId : undefined}
              value={name}
              maxLength={CELL_TYPE_NAME_MAX_LENGTH}
              autoFocus
              disabled={isSaving}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') onCancelEdit();
              }}
            />
          </td>
          <td className="admin-table__actions">
            <span className="admin-row-actions">
              <Button variant="primary" disabled={!normalized || duplicate !== undefined || isSaving} onClick={save}>
                Zapisz
              </Button>
              <Button onClick={onCancelEdit}>Anuluj</Button>
            </span>
          </td>
        </tr>
        {duplicate && (
          <tr className="admin-table__error">
            <td colSpan={2}>
              <span id={errorId} role="alert">
                {duplicateMessage(duplicate)}
              </span>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr className={isDuplicateTarget ? 'admin-table__row--duplicate' : undefined}>
      <td className="admin-table__truncate" title={cellType.name}>
        {cellType.name}
      </td>
      <td className="admin-table__actions">
        <span className="admin-row-actions">
          <button
            type="button"
            className="admin-icon-btn"
            title="Zmień nazwę"
            aria-label="Zmień nazwę"
            onClick={startEdit}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="admin-icon-btn admin-icon-btn--danger"
            title="Usuń typ komórki"
            aria-label="Usuń typ komórki"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 size={13} />
          </button>
        </span>
      </td>
    </tr>
  );
}

/** The API's reason in Polish where the page knows it; a taken name names the type that already has it. */
function cellTypeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.code === CELL_TYPE_NAME_TAKEN_CODE) {
    const name = /^A cell type named '(.*)' already exists\.$/.exec(err.message)?.[1];
    return name ? `Typ komórki „${name}” już istnieje.` : 'Typ komórki o tej nazwie już istnieje.';
  }
  return getErrorMessage(err, fallback);
}
