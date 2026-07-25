import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { Store, Camera, Trophy, LayoutDashboard, MapPin, LogOut, Settings, Users, LogIn } from 'lucide-react';
import './Layout.css';
import logo from "../assets/Leaf and Life logo.png";
import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal';
import { API_BASE_URL } from '../apiConfig';

export default function Layout() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('leafLifeAuthenticated') === 'true';
  });
  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') return 'Guest';
    return localStorage.getItem('leafLifeUserName') || 'Guest';
  });
  const [userId, setUserId] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return localStorage.getItem('leafLifeUserId') || 1;
  });
  const [userAvatar, setUserAvatar] = useState(null);
  const [commNotifCount, setCommNotifCount] = useState(0);


  const openAuthModal = () => setAuthOpen(true);
  const openSettingsModal = () => {
    if (!isAuthenticated) {
      openAuthModal();
    } else {
      setSettingsOpen(true);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    openAuthModal();
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('leafLifeAuthenticated');
    localStorage.removeItem('leafLifeUserName');
    localStorage.removeItem('leafLifeUserId');
    localStorage.removeItem('leafLifeGuestScanCount');
    localStorage.removeItem('leafLifeGuestRecCount');
    setIsAuthenticated(false);
    setUserName('Guest');
    setUserId(1);
    openAuthModal();
  };

  useEffect(() => {
    if (!authOpen && !settingsOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [authOpen, settingsOpen]);

  const fetchNotifCount = () => {
    if (!isAuthenticated || !userId) return;
    fetch(`${API_BASE_URL}/api/trade/notifications/count/${userId}`)
      .then(res => res.json())
      .then(data => setCommNotifCount(data.count || 0))
      .catch(err => console.error("Notif fetch error:", err));
  };

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetch(`${API_BASE_URL}/api/auth/profile/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.profile_image) {
            setUserAvatar(data.profile_image.startsWith('http') ? data.profile_image : `${API_BASE_URL}${data.profile_image}`);
          }
        })
        .catch(err => console.error("Profile fetch error:", err));

      fetchNotifCount();
      const interval = setInterval(fetchNotifCount, 30000); // Check every 30s
      
      const handleRefresh = () => fetchNotifCount();
      window.addEventListener('refreshNotifications', handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', handleRefresh);
      };
    }
  }, [isAuthenticated, userId]);


  return (
    <div className="app-container dashboard-layout">
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(data) => {
          localStorage.setItem('leafLifeAuthenticated', 'true');
          localStorage.removeItem('leafLifeGuestScanCount');
          localStorage.removeItem('leafLifeGuestRecCount');
          const finalId = data.userId || 1;
          localStorage.setItem('leafLifeUserId', finalId);
          const nameToSet = data.fullName || data.email.split('@')[0];
          localStorage.setItem('leafLifeUserName', nameToSet);
          
          setIsAuthenticated(true);
          setUserName(nameToSet);
          setUserId(finalId);
          
          // Initial fetch for avatar after login
          fetch(`${API_BASE_URL}/api/auth/profile/${finalId}`)
            .then(res => res.json())
            .then(userData => {
              if (userData.profile_image) {
                setUserAvatar(userData.profile_image.startsWith('http') ? userData.profile_image : `${API_BASE_URL}${userData.profile_image}`);
              }
            });

          setAuthOpen(false);

          navigate('/dashboard');
        }}
      />

      <SettingsModal 
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userId={userId}
        currentUserName={userName}
        onUpdateName={(newName) => setUserName(newName)}
        onUpdateAvatar={(newAvatar) => setUserAvatar(newAvatar)}
      />

      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link to="/" className="sidebar-logo">
            <img src={logo} alt="Leaf and Life" className="sidebar-logo-img" />
            <span className="sidebar-logo-text">Leaf &amp; Life</span>
          </Link>
          
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className="sidebar-nav-item">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/scan" className="sidebar-nav-item">
              <Camera size={20} />
              <span>Smart Scan</span>
            </NavLink>
            <NavLink to="/marketplace" className="sidebar-nav-item">
              <Store size={20} />
              <span>Marketplace</span>
            </NavLink>
            <NavLink to="/community" className="sidebar-nav-item" style={{ position: 'relative' }}>
              <Users size={20} />
              <span>Community</span>
              {commNotifCount > 0 && (
                <span className="comm-badge-sidebar">{commNotifCount}</span>
              )}
            </NavLink>
            <NavLink to="/rewards" className="sidebar-nav-item">
              <Trophy size={20} />
              <span>Rewards</span>
            </NavLink>
            <NavLink to="/recommendation" className="sidebar-nav-item">
              <MapPin size={20} />
              <span>Smart Recs</span>
            </NavLink>
          </nav>
        </div>
        
        <div className="sidebar-bottom" style={!isAuthenticated ? { flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' } : {}}>
          <div className="user-profile">
            <img 
              src={isAuthenticated ? (userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=E2E8CE&color=2D5A27`) : `https://ui-avatars.com/api/?name=Guest+User&background=E2E8CE&color=2D5A27`} 
              alt={isAuthenticated ? userName : "Guest"} 
              className="user-avatar" 
            />

            <div className="user-info">
              <span className="user-name">{isAuthenticated ? userName : 'Guest User'}</span>
              <span className="user-role" style={!isAuthenticated ? { color: '#10B981', fontWeight: 600 } : {}}>{isAuthenticated ? 'Plant Parent' : 'Guest Mode'}</span>
            </div>
          </div>

          {!isAuthenticated ? (
            <button 
              type="button"
              className="guest-auth-sidebar-btn"
              onClick={openAuthModal}
            >
              <LogIn size={16} />
              <span>Log In / Sign Up</span>
            </button>
          ) : (
            <div className="sidebar-actions">
              <button className="sidebar-action-btn" onClick={openSettingsModal} title="Settings">
                <Settings size={18} />
              </button>
              <button className="sidebar-action-btn" onClick={handleSwitchAccount} title="Switch Account">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet context={{ openAuthModal, isAuthenticated, userName, userId }} />
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/recommendation" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <MapPin size={24} />
          <span>Smart Rec</span>
        </NavLink>
        <NavLink to="/scan" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <div className="scan-btn">
            <Camera size={28} />
          </div>
          <span>Smart Scan</span>
        </NavLink>
        <NavLink to="/community" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} style={{ position: 'relative' }}>
          <Users size={24} />
          <span>Community</span>
          {commNotifCount > 0 && (
            <span className="comm-badge-mobile">{commNotifCount}</span>
          )}
        </NavLink>
        <NavLink to="/rewards" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Trophy size={24} />
          <span>Rewards</span>
        </NavLink>
      </nav>
    </div>
  );
}
