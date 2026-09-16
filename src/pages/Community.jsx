import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeftRight, ShoppingCart, Check, X, Clock, MapPin, Search, MessageCircle, ExternalLink, Loader2 } from 'lucide-react';
import './Community.css';
import { API_BASE_URL } from '../apiConfig';

export default function Community() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('leafLifeUserId') || 1;
  const [activeTab, setActiveTab] = useState('connect'); // 'connect', 'requests'
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersRes = await fetch(`${API_BASE_URL}/api/community/users?currentUserId=${userId}`);
      if (!usersRes.ok) throw new Error(`Community users request failed (${usersRes.status})`);
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Fetch requests
      const requestsRes = await fetch(`${API_BASE_URL}/api/trade/requests/${userId}`);
      if (!requestsRes.ok) throw new Error(`Trade requests request failed (${requestsRes.status})`);
      const requestsData = await requestsRes.json();
      setRequests({
        incoming: Array.isArray(requestsData.incoming) ? requestsData.incoming : [],
        outgoing: Array.isArray(requestsData.outgoing) ? requestsData.outgoing : []
      });
    } catch (err) {
      console.error("Error fetching community data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
    if (activeTab === 'requests') {
      fetch(`${API_BASE_URL}/api/trade/notifications/clear/${userId}`, { method: 'POST' })
        .then(() => {
          // Notify the sidebar to refresh its count
          window.dispatchEvent(new Event('refreshNotifications'));
          // Refresh local data to update tab badge immediately
          fetchCommunityData();
        })
        .catch(err => console.error("Clear notifications error:", err));
    }
  }, [userId, activeTab]);

  const handleRespond = async (requestId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trade/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, userId })
      });
      const data = await response.json();
      if (data.success) {
        fetchCommunityData();
      }
    } catch (err) {
      console.error("Error responding to request:", err);
    }
  };

  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="community-page animate-fade-in">
      <header className="community-header">
        <div className="header-content">
          <h1 className="community-title">Community Connect</h1>
          <p className="community-subtitle">Swap, buy, and grow with fellow plant enthusiasts.</p>
        </div>
        
        <div className="community-tabs">
          <button 
            className={`tab-btn ${activeTab === 'connect' ? 'active' : ''}`}
            onClick={() => setActiveTab('connect')}
          >
            <Users size={18} />
            Connect
          </button>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <ArrowLeftRight size={18} />
            Requests
            {(requests.incoming.filter(r => r.status === 'pending' && r.receiver_seen === 0).length + 
              requests.outgoing.filter(r => (r.status === 'accepted' || r.status === 'rejected') && r.sender_seen === 0).length > 0) && (
              <span className="badge">
                {requests.incoming.filter(r => r.status === 'pending' && r.receiver_seen === 0).length + 
                 requests.outgoing.filter(r => (r.status === 'accepted' || r.status === 'rejected') && r.sender_seen === 0).length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="community-main">
        {activeTab === 'connect' && (
          <div className="connect-section">
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search plant parents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="loading-state">
                <Loader2 size={40} className="animate-spin" />
                <p>Loading the community...</p>
              </div>
            ) : (
              <div className="users-grid">
                {filteredUsers.map(user => (
                  <div key={user.id} className="user-card glass-panel">
                    <div className="user-card-header">
                      <img 
                        src={user.profile_image 
                          ? (user.profile_image.startsWith('http') ? user.profile_image : `${API_BASE_URL}${user.profile_image}`)
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=E2E8CE&color=2D5A27`
                        } 
                        alt={user.full_name} 
                        className="user-avatar-large"
                      />
                      <div className="user-meta">
                        <h3>{user.full_name}</h3>
                        <p className="location">
                          <MapPin size={14} />
                          {user.preferred_location || 'Kathmandu, NP'}
                        </p>
                      </div>
                    </div>
                    <div className="user-stats">
                      <div className="stat">
                        <span className="stat-value">{user.listing_count}</span>
                        <span className="stat-label">Listings</span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button className="btn-secondary" onClick={() => navigate(`/marketplace?seller=${user.id}`)}>
                        View Plants
                        <ExternalLink size={14} />
                      </button>
                      <button className="btn-icon">
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-section">
            <div className="requests-container">
              <div className="requests-group">
                <h2 className="group-title">Incoming Requests</h2>
                <div className="requests-list">
                  {requests.incoming.length === 0 ? (
                    <div className="empty-state">
                      <Clock size={40} />
                      <p>No incoming requests yet.</p>
                    </div>
                  ) : (
                    requests.incoming.map(req => (
                      <div key={req.id} className="request-card glass-panel">
                        <div className="request-info">
                          <img 
                             src={req.plant_image?.startsWith('http') ? req.plant_image : `${API_BASE_URL}${encodeURI(req.plant_image)}`}
                             alt={req.plant_name}
                             className="request-plant-img"
                          />
                          <div className="request-details">
                            <div className="request-header-row">
                              <span className="request-type-badge" style={{ backgroundColor: req.request_type === 'exchange' ? '#3B82F6' : '#10B981', color: 'white' }}>
                                {req.request_type === 'exchange' ? 'SWAP REQUEST' : 'BUY REQUEST'}
                              </span>
                              <span className="request-time">{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3>{req.plant_name}</h3>
                            <p className="sender-info">From: <strong>{req.sender_name || 'Anonymous User'}</strong></p>
                            {req.offer_details && (
                              <div className="offer-box">
                                <MessageCircle size={14} />
                                <span>"{req.offer_details}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="request-status-actions">
                          {req.status === 'pending' ? (
                            <div className="action-buttons">
                              <button className="btn-approve" onClick={() => handleRespond(req.id, 'accepted')}>
                                <Check size={18} />
                                Accept
                              </button>
                              <button className="btn-reject" onClick={() => handleRespond(req.id, 'rejected')}>
                                <X size={18} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`status-text ${req.status}`}>{req.status.toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="requests-group">
                <h2 className="group-title">Outgoing Requests</h2>
                <div className="requests-list">
                  {requests.outgoing.length === 0 ? (
                    <div className="empty-state">
                      <Clock size={40} />
                      <p>You haven't sent any requests yet.</p>
                    </div>
                  ) : (
                    requests.outgoing.map(req => (
                      <div key={req.id} className="request-card glass-panel">
                        <div className="request-info">
                          <img 
                             src={req.plant_image?.startsWith('http') ? req.plant_image : `${API_BASE_URL}${encodeURI(req.plant_image)}`}
                             alt={req.plant_name}
                             className="request-plant-img"
                          />
                          <div className="request-details">
                            <div className="request-header-row">
                                <span className="request-type-badge" style={{ backgroundColor: req.request_type === 'exchange' ? '#3B82F6' : '#10B981', color: 'white' }}>
                                  {req.request_type === 'exchange' ? 'SWAP REQUEST' : 'BUY REQUEST'}
                                </span>
                                <span className="request-time">{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3>{req.plant_name}</h3>
                            <p className="sender-info">To: <strong>{req.receiver_name || 'Anonymous User'}</strong></p>
                          </div>
                        </div>
                        <span className={`status-text ${req.status}`}>{req.status.toUpperCase()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
