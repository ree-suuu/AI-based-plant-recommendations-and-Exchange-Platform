import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, BarChart2, TrendingUp, User, LogOut, Leaf } from 'lucide-react';
import { clearNurserySession, getNurserySession } from '../pages/nursery/NurseryUtils';
import './NurseryLayout.css';

const navItems = [
  { to: '/nursery/dashboard',          label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/nursery/products',           label: 'Products',     icon: Package },
  { to: '/nursery/orders',             label: 'Orders',       icon: ShoppingBag },
  { to: '/nursery/sales-report',       label: 'Sales Report', icon: BarChart2 },
  { to: '/nursery/trending-products',  label: 'Trending',     icon: TrendingUp },
  { to: '/nursery/profile',            label: 'Profile',      icon: User },
];

export default function NurseryLayout() {
  const navigate = useNavigate();
  const session = getNurserySession();

  const handleSignOut = () => {
    clearNurserySession();
    navigate('/nursery/signin');
  };

  return (
    <div className="nursery-shell">
      <aside className="nursery-sidebar">

        {/* Brand */}
        <div className="nursery-brand">
          <div className="nursery-logo-wrap">
            <Leaf size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2>Leaf-Life</h2>
            <p>Nursery Portal</p>
          </div>
        </div>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Nav */}
        <nav className="nursery-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'nursery-nav-item active' : 'nursery-nav-item'
              }
            >
              <Icon size={18} strokeWidth={2} className="nav-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Session info + sign out */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" style={{ marginBottom: '1rem' }} />
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {(session?.userId || 'N')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-id">{session?.userId || 'nursery'}</span>
              <span className="sidebar-role">Nursery Owner</span>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="nursery-main">
        <div className="nursery-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
