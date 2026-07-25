import { useEffect, useState } from 'react';
import { getAdminStats, getAdminOrders } from './AdminUtils';
import './AdminModule.css';
import { LineChart, BarChart3, PieChart, DollarSign, Download, Calendar } from 'lucide-react';

export default function AdminSalesReport() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const s = await getAdminStats();
      const o = await getAdminOrders();
      setStats(s);
      setRecentOrders(Array.isArray(o) ? o.slice(0, 5) : []);
    };
    fetchData();
  }, []);

  return (
    <div className="admin-content-inner animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">FINANCIAL ANALYTICS</p>
          <h1>Marketplace Sales Report</h1>
          <p className="module-copy">Comprehensive breakdown of platform revenue and transaction volume.</p>
        </div>
        <button className="primary-btn flex items-center gap-2">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="admin-stats-grid mt-6">
        <div className="admin-stat-card revenue-focus">
          <div className="stat-icon revenue"><DollarSign size={24} /></div>
          <div className="stat-content">
            <span>Gross Platform Value</span>
            <strong>Rs. {stats?.totalRevenue?.toLocaleString() || 0}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon orders"><BarChart3 size={24} /></div>
          <div className="stat-content">
            <span>Average Order Value</span>
            <strong>Rs. {stats?.totalOrders ? Math.round(stats.totalRevenue / stats.totalOrders) : 0}</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon plants"><PieChart size={24} /></div>
          <div className="stat-content">
            <span>Commission Earned (Est.)</span>
            <strong>Rs. {stats?.totalRevenue ? Math.round(stats.totalRevenue * 0.1) : 0}</strong>
          </div>
        </div>
      </div>

      <div className="report-sections mt-8">
        <div className="panel-card chart-mock">
          <div className="panel-header">
            <h2>Revenue Growth</h2>
            <div className="time-filters">
              <button className="active">1W</button>
              <button>1M</button>
              <button>1Y</button>
            </div>
          </div>
          <div className="chart-placeholder">
            <LineChart size={48} className="chart-icon" />
            <p>Interactive sales chart visualized from trade_requests history</p>
          </div>
        </div>

        <div className="panel-card recent-sales">
          <div className="panel-header">
            <h2>Recent Transactions</h2>
            <p>Verification of the latest system settlements</p>
          </div>
          <div className="sales-mini-list">
            {recentOrders.length === 0 ? (
              <p className="empty-state">No recent transactions recorded.</p>
            ) : (
              recentOrders.map(o => (
                <div key={o.id} className="sale-item-row">
                  <div className="sale-info">
                    <strong>{o.customerName}</strong>
                    <span>{o.plantName}</span>
                  </div>
                  <div className="sale-date">
                   {new Date(o.created_at).toLocaleDateString()}
                  </div>
                  <div className="sale-amount font-bold text-success">
                    +Rs. 450
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
