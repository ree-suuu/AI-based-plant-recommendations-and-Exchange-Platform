import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNurserySession, getNurseryProfile, updateNurseryProfile } from './NurseryUtils';
import './NurseryModule.css';

export default function NurseryProfile() {
  const navigate = useNavigate();
  const session = getNurserySession();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ nurseryName: '', ownerName: '', email: '', phone: '', address: '' });
  const [message, setMessage] = useState('');

  const userId = session?.userId;

  useEffect(() => {
    if (!userId) {
      navigate('/nursery/signin');
      return;
    }
    const fetchProfile = async () => {
      const storedProfile = await getNurseryProfile(userId);
      setProfile(storedProfile);
      setForm({
        nurseryName: storedProfile.nurseryName || storedProfile.nursery_name || '',
        ownerName: storedProfile.ownerName || storedProfile.owner_name || '',
        email: storedProfile.email || '',
        phone: storedProfile.phone || '',
        address: storedProfile.address || '',
      });
    };
    fetchProfile();
  }, [navigate, userId]);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateNurseryProfile(session.userId, form);
    setMessage('Profile saved successfully.');
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="module-page nursery-page animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">Nursery Profile</p>
          <h1>Business details</h1>
          <p className="module-copy">Keep your nursery information accurate for customers and marketplace listings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel-card form-panel grid-form">
        <label className="input-label input-full">
          Nursery Name
          <input value={form.nurseryName} onChange={handleChange('nurseryName')} className="input-field" required />
        </label>
        <label className="input-label input-full">
          Owner Name
          <input value={form.ownerName} onChange={handleChange('ownerName')} className="input-field" required />
        </label>
        <label className="input-label input-full">
          Email
          <input type="email" value={form.email} onChange={handleChange('email')} className="input-field" required />
        </label>
        <label className="input-label input-full">
          Phone
          <input type="tel" value={form.phone} onChange={handleChange('phone')} className="input-field" required />
        </label>
        <label className="input-label input-full">
          Address
          <input value={form.address} onChange={handleChange('address')} className="input-field" required />
        </label>

        {message && <div className="form-success">{message}</div>}
        <button type="submit" className="btn-primary btn-block">Save Profile</button>
      </form>
    </div>
  );
}
