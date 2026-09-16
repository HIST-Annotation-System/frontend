import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import './UsersPage.css';
import type { AccountCreate, AccountResponse, ProfileUpdate } from '../../types/user';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccountResponse | null>(null);
  
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCanUpload, setEditCanUpload] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: AccountCreate) => usersApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setNewUsername('');
      setNewPassword('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: number) => usersApi.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: ProfileUpdate }) => usersApi.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setEditingUser(null);
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ username: newUsername, password: newPassword, role: 'ANNOTATOR' });
  };

  const handleDeleteUser = (id: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
      deleteMutation.mutate(id);
    }
  };

  const openEditModal = (user: AccountResponse) => {
    setEditingUser(user);
    setEditFirstName(user.profile?.first_name || '');
    setEditLastName(user.profile?.last_name || '');
    setEditCanUpload(user.profile?.can_upload || false);
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const updateData: ProfileUpdate = {};
    if (editFirstName) updateData.first_name = editFirstName;
    if (editLastName) updateData.last_name = editLastName;
    if (editPassword) updateData.password = editPassword;
    updateData.can_upload = editCanUpload;

    updateMutation.mutate({ id: editingUser.id, data: updateData });
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Zarządzanie Użytkownikami</h1>
          <p className="page-subtitle">Lista wszystkich kont annotatorów i administratorów.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <UserPlus size={16} />
          <span>Dodaj użytkownika</span>
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state">Ładowanie użytkowników...</div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nazwa Użytkownika</th>
                <th>Rola</th>
                <th>Imię i Nazwisko</th>
                <th>Upload</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>
                    <span className={`role-badge role-${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : <span className="text-muted">Brak profilu</span>}
                  </td>
                  <td>
                    {user.profile?.can_upload ? (
                      <span className="status-yes">Tak</span>
                    ) : (
                      <span className="status-no">Nie</span>
                    )}
                  </td>
                  <td>
                    {user.is_first_login ? (
                      <span className="status-badge warning">Oczekuje na setup</span>
                    ) : (
                      <span className="status-badge success">Aktywny</span>
                    )}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button onClick={() => openEditModal(user)} className="icon-button" title="Edytuj">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="icon-button danger" title="Usuń">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">Brak użytkowników.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Dodaj Nowego Annotatora</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Nazwa Użytkownika</label>
                <input 
                  type="text" 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)} 
                  required 
                  className="modal-input"
                />
              </div>
              <div className="form-group">
                <label>Hasło Tymczasowe</label>
                <input 
                  type="text" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  className="modal-input"
                />
                <small>Użytkownik zostanie poproszony o jego zmianę przy pierwszym logowaniu.</small>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Anuluj</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Tworzenie...' : 'Utwórz konto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edytuj Użytkownika: {editingUser.username}</h2>
            <form onSubmit={handleEditUser}>
              <div className="form-group">
                <label>Imię</label>
                <input 
                  type="text" 
                  value={editFirstName} 
                  onChange={(e) => setEditFirstName(e.target.value)} 
                  className="modal-input"
                />
              </div>
              <div className="form-group">
                <label>Nazwisko</label>
                <input 
                  type="text" 
                  value={editLastName} 
                  onChange={(e) => setEditLastName(e.target.value)} 
                  className="modal-input"
                />
              </div>
              <div className="form-group">
                <label>Nowe Hasło (pozostaw puste, by nie zmieniać)</label>
                <input 
                  type="password" 
                  value={editPassword} 
                  onChange={(e) => setEditPassword(e.target.value)} 
                  className="modal-input"
                />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="can_upload"
                  checked={editCanUpload} 
                  onChange={(e) => setEditCanUpload(e.target.checked)} 
                />
                <label htmlFor="can_upload">Uprawnienia do uploadu plików</label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary">Anuluj</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                  {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
