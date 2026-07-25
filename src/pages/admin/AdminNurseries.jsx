import { useEffect, useState } from 'react';
import { getAdminNurseries, approveAdminNursery, deleteAdminNursery } from './AdminUtils';
import './AdminModule.css';
import { Store, MapPin, Phone, Mail, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export default function AdminNurseries() {
  const [nurseries, setNurseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadNurseries = async () => {
    setLoading(true);
    try {
      const data = await getAdminNurseries();
      setNurseries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch nurseries error:', err);
      setNurseries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNurseries();
  }, []);

  const handleApprove = async (nursery) => {
    setNurseries(nurseries.map(n => n.id === nursery.id ? { ...n, role: 'Verified' } : n));
    await approveAdminNursery(nursery.id || nursery.external_id);
    setMessage(`Nursery "${nursery.nursery_name}" verified successfully`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (nursery) => {
    if (!window.confirm(`Are you sure you want to remove nursery "${nursery.nursery_name}"?`)) return;
    setNurseries(nurseries.filter(n => n.id !== nursery.id));
    await deleteAdminNursery(nursery.id || nursery.external_id);
    setMessage(`Nursery "${nursery.nursery_name}" removed`);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="admin-content-inner animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Partner Nurseries</h1>
          <p className="module-copy">Manage registered nurseries and verify their application status.</p>
        </div>
      </div>

      {message && (
        <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '12px 18px', borderRadius: '8px', margin: '16px 0 0 0', fontWeight: '600' }}>
          {message}
        </div>
      )}

      <div className="admin-grid-layout mt-6">
        {nurseries.length === 0 ? (
          <div className="panel-card empty-state">
            <Store size={48} />
            <p>No registered nurseries found.</p>
          </div>
        ) : (
          nurseries.map((nursery) => (
            <div key={nursery.id || nursery.external_id} className="panel-card nursery-admin-card">
              <div className="card-top">
                <div className="nursery-logo">{nursery.nursery_name ? nursery.nursery_name[0] : 'N'}</div>
                <div className="nursery-info">
                  <h3>{nursery.nursery_name}</h3>
                  <span className="id-tag">ID: {nursery.external_id || nursery.id}</span>
                </div>
                <div className={`status-pill ${nursery.role === 'Verified' ? 'verified' : 'pending'}`}>
                  {nursery.role === 'Verified' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {nursery.role === 'Verified' ? 'Verified' : 'Pending Verification'}
                </div>
              </div>
              
              <div className="card-details">
                <div className="detail-item">
                  <Mail size={14} /> <span>{nursery.email}</span>
                </div>
                <div className="detail-item">
                  <Phone size={14} /> <span>{nursery.phone || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <MapPin size={14} /> <span>{nursery.address || nursery.location || 'Kathmandu'}</span>
                </div>
              </div>

              <div className="card-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {nursery.role !== 'Verified' && (
                  <button className="primary-inline" onClick={() => handleApprove(nursery)}>
                    <CheckCircle size={14} /> Verify Nursery
                  </button>
                )}
                <button className="secondary-inline" onClick={() => handleDelete(nursery)} style={{ color: '#D32F2F', borderColor: '#FFCDD2' }}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
