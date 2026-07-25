import { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Store, Camera, Trophy, LayoutDashboard, MapPin, LogOut, Settings, Users, LogIn, MoreHorizontal, X, User, ChevronRight } from 'lucide-react';
import './Layout.css';
import logo from "../assets/Leaf and Life logo.png";
import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal';
import { API_BASE_URL } from '../apiConfig';

export default function Layout() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
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
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  // Close More sheet and Profile sheet on route change
  useEffect(() => { setMoreOpen(false); setProfileSheetOpen(false); }, [location.pathname]);


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

      {/* More Sheet Overlay */}
      {moreOpen && (
        <div className="more-overlay" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            <div className="more-sheet-header">
              <span>More</span>
              <button className="more-close-btn" onClick={() => setMoreOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="more-sheet-items">
              <NavLink to="/community" className="more-sheet-item" style={{ position: 'relative' }}>
                <div className="more-sheet-icon">
                  <Users size={22} />
                  {commNotifCount > 0 && (
                    <span className="comm-badge-more">{commNotifCount}</span>
                  )}
                </div>
                <span>Community</span>
              </NavLink>
              <NavLink to="/rewards" className="more-sheet-item">
                <div className="more-sheet-icon">
                  <Trophy size={22} />
                </div>
                <span>Rewards</span>
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE: Floating Profile Avatar ─────────────────────── */}
      <button
        className="mobile-profile-fab"
        onClick={() => setProfileSheetOpen(prev => !prev)}
        aria-label="Profile"
      >
        {userAvatar
          ? <img src={userAvatar} alt={userName} className="mobile-fab-avatar" />
          : <div className="mobile-fab-initials">{(isAuthenticated ? userName : 'G')[0].toUpperCase()}</div>
        }
      </button>

      {/* ── MOBILE: Profile Sheet ─────────────────────────────────── */}
      {profileSheetOpen && (
        <div className="more-overlay" onClick={() => setProfileSheetOpen(false)}>
          <div className="more-sheet profile-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />

            {/* Header */}
            <div className="profile-sheet-header">
              <div className="profile-sheet-avatar">
                {userAvatar
                  ? <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2d6a4f' }}>{(isAuthenticated ? userName : 'G')[0].toUpperCase()}</span>
                }
              </div>
              <div>
                <p className="profile-sheet-name">{isAuthenticated ? userName : 'Guest User'}</p>
                <p className="profile-sheet-role">{isAuthenticated ? 'Plant Parent 🌿' : 'Guest Mode'}</p>
              </div>
              <button className="more-close-btn" style={{ marginLeft: 'auto' }} onClick={() => setProfileSheetOpen(false)}><X size={20} /></button>
            </div>

            {/* Actions */}
            <div className="profile-sheet-actions">
              {isAuthenticated ? (
                <>
                  <button className="profile-sheet-row" onClick={() => { setProfileSheetOpen(false); openSettingsModal(); }}>
                    <div className="profile-row-icon"><Settings size={18} /></div>
                    <span>Edit Profile &amp; Settings</span>
                    <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                  </button>
                  <button className="profile-sheet-row danger" onClick={() => { setProfileSheetOpen(false); handleSwitchAccount(); }}>
                    <div className="profile-row-icon danger"><LogOut size={18} /></div>
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <button className="profile-sheet-row" onClick={() => { setProfileSheetOpen(false); openAuthModal(); }}>
                  <div className="profile-row-icon"><LogIn size={18} /></div>
                  <span>Log In / Sign Up</span>
                  <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <LayoutDashboard size={22} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/recommendation" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <MapPin size={22} />
          <span>Smart Rec</span>
        </NavLink>
        <NavLink to="/scan" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <div className="scan-btn">
            <Camera size={26} />
          </div>
          <span>Scan</span>
        </NavLink>
        <NavLink to="/marketplace" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Store size={22} />
          <span>Market</span>
        </NavLink>
        <button
          className={`nav-item more-btn${moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen(prev => !prev)}
        >
          <MoreHorizontal size={22} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
