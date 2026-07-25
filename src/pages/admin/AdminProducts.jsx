import { useEffect, useState } from 'react';
import { getAdminPlants, deleteAdminPlant } from './AdminUtils';
import './AdminModule.css';
import { Package, Search, Tag, MapPin, Eye, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

export default function AdminProducts() {
  const [plants, setPlants] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadPlants = async () => {
    setLoading(true);
    const data = await getAdminPlants();
    setPlants(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const handleDeletePlant = async (plant) => {
    if (!window.confirm(`Are you sure you want to remove listing "${plant.name}"?`)) return;
    setPlants(plants.filter(p => p.id !== plant.id));
    await deleteAdminPlant(plant.id);
    setMessage(`Plant listing "${plant.name}" removed successfully`);
    setTimeout(() => setMessage(''), 3000);
  };

  const safePlants = Array.isArray(plants) ? plants : [];
  const filteredPlants = safePlants.filter(p => 
    (p.name || '').toLowerCase().includes(query.toLowerCase()) || 
    (p.type || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="admin-content-inner animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Marketplace Inventory</h1>
          <p className="module-copy">Global view of all plant listings across nurseries and community sellers.</p>
        </div>
      </div>

      {message && (
        <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '12px 18px', borderRadius: '8px', margin: '16px 0 0 0', fontWeight: '600' }}>
          {message}
        </div>
      )}

      <div className="filter-row mt-6">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Filter by name or type..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-products-table mt-6 panel-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plant</th>
                <th>Category</th>
                <th>Seller Info</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">No plants matching your search.</td>
                </tr>
              ) : (
                filteredPlants.map((plant) => (
                  <tr key={plant.id}>
                    <td>
                      <div className="plant-cell">
                        <img 
                          src={plant.image && plant.image.startsWith('http') ? plant.image : `${API_BASE_URL}${plant.image}`} 
                          alt={plant.name} 
                          className="plant-thumb"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; }}
                        />
                        <div className="plant-meta">
                          <span className="font-semibold">{plant.name}</span>
                          <span className="scientific-name">{plant.scientific_name}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="type-badge">{plant.type}</span></td>
                    <td>
                      <div className="seller-cell">
                        <span className="seller-name">{plant.nursery_name || 'Community Seller'}</span>
                        <div className="seller-loc"><MapPin size={12} /> {plant.location}</div>
                      </div>
                    </td>
                    <td><strong>Rs. {plant.price}</strong></td>
                    <td>
                      <span className={`status-chip ${plant.is_sold ? 'sold' : 'available'}`}>
                        {plant.is_sold ? 'Sold' : 'Available'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="icon-btn text-danger" onClick={() => handleDeletePlant(plant)} title="Remove Listing"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
