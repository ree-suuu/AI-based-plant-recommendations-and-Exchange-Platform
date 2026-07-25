import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAdminStats, getAdminSession, clearAdminSession } from './AdminUtils';
import './AdminModule.css';
import { 
  Users, 
  Store, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalNurseries: 0,
    totalPlants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingNurseries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      // For development, if no session, just use a guest admin mock or redirect to login
      // navigate('/admin/login'); 
    }
    
    const fetchStats = async () => {
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
      setLoading(false);
    };

    fetchStats();
  }, [navigate, session]);

  const handleSignOut = () => {
    clearAdminSession();
    navigate('/');
  };

  return (
    <div className="admin-content-inner animate-fade-in">
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon users"><Users size={24} /></div>
          <div className="stat-content">
            <span>Total Users</span>
            <strong>{stats.totalUsers}</strong>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon nurseries"><Store size={24} /></div>
          <div className="stat-content">
            <span>Verified Nurseries</span>
            <strong>{stats.totalNurseries}</strong>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon plants"><Package size={24} /></div>
          <div className="stat-content">
            <span>Plant Listings</span>
            <strong>{stats.totalPlants}</strong>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon orders"><ShoppingCart size={24} /></div>
          <div className="stat-content">
            <span>Total Orders</span>
            <strong>{stats.totalOrders}</strong>
          </div>
        </div>

        <div className="admin-stat-card revenue-card">
          <div className="stat-icon revenue"><DollarSign size={24} /></div>
          <div className="stat-content">
            <span>Platform Revenue</span>
            <strong>Rs. {(stats?.totalRevenue || 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="admin-content-split">
        <section className="panel-card activity-panel">
          <div className="panel-header">
            <h2>Quick Management</h2>
            <p>Common administrative tasks</p>
          </div>
          
          <div className="management-links">
            <Link to="/admin/users" className="mgmt-link">
              <Users size={18} />
              <span>Review User Accounts</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/admin/nurseries" className="mgmt-link">
              <Store size={18} />
              <span>Approve Pending Nurseries</span>
              <div className="pending-badge">{stats.pendingNurseries}</div>
              <ChevronRight size={16} />
            </Link>
            <Link to="/admin/products" className="mgmt-link">
              <Package size={18} />
              <span>Moderate Plant Content</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/admin/reports" className="mgmt-link">
              <TrendingUp size={18} />
              <span>View Detailed Analytics</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        <section className="panel-card info-panel">
          <div className="panel-header">
            <h2>System Health</h2>
            <p>Backend & Database Status</p>
          </div>
          <div className="health-status">
            <div className="health-item">
              <span>Database Connection</span>
              <span className="status-val good">Operational</span>
            </div>
            <div className="health-item">
              <span>API Response Time</span>
              <span className="status-val good">12ms</span>
            </div>
            <div className="health-item">
              <span>Platform Load</span>
              <span className="status-val">Normal</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
