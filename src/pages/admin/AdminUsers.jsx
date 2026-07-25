import { useEffect, useState } from 'react';
import { getAdminUsers, updateAdminUser, deleteAdminUser } from './AdminUtils';
import './AdminModule.css';
import { User, Mail, Shield, Calendar, Edit, Trash2, X, Check } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', role: 'User' });
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.full_name || '',
      email: user.email || '',
      role: user.role || 'User'
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Update local state first for instant UI response
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, full_name: editForm.fullName, email: editForm.email, role: editForm.role } : u));
    
    await updateAdminUser(editingUser.id, editForm);
    setEditingUser(null);
    setMessage('User details updated successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.full_name || user.email}"?`)) return;
    
    // Update local state immediately
    setUsers(users.filter(u => u.id !== user.id));
    
    await deleteAdminUser(user.id);
    setMessage('User removed successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="admin-content-inner flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-content-inner animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>User Management</h1>
          <p className="module-copy">Manage customer accounts, roles, and administrative privileges.</p>
        </div>
      </div>

      {message && (
        <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '12px 18px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600' }}>
          {message}
        </div>
      )}

      <div className="panel-card mt-6">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th><User size={16} /> User</th>
                <th><Mail size={16} /> Email</th>
                <th><Shield size={16} /> Role</th>
                <th><Calendar size={16} /> Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!users || users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-row">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar-small">
                          {(user.full_name || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <span className="font-semibold">{user.full_name || 'Anonymous User'}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status-chip role-${(user.role || 'user').toLowerCase()}`}>
                        {user.role || 'User'}
                      </span>
                    </td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recent'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="text-button" onClick={() => handleEditClick(user)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Edit size={14} /> Edit
                        </button>
                        <button className="text-button text-danger" onClick={() => handleDeleteUser(user)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '420px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Edit User Account</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Full Name</label>
                <input 
                  type="text" 
                  value={editForm.fullName} 
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} 
                  className="input-field"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Email Address</label>
                <input 
                  type="email" 
                  value={editForm.email} 
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                  className="input-field"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Role</label>
                <select 
                  value={editForm.role} 
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="Nursery">Nursery Owner</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--color-primary, #2D6A4F)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
