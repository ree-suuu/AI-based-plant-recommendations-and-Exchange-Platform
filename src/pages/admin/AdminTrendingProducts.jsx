import { useEffect, useState } from 'react';
import { getAdminPlants } from './AdminUtils';
import './AdminModule.css';
import { TrendingUp, Award, ShoppingBag, Eye } from 'lucide-react';

export default function AdminTrendingProducts() {
  const [plants, setPlants] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      const data = await getAdminPlants();
      const safeData = Array.isArray(data) ? data : [];
      // Sort by trending (views + sales)
      const sorted = safeData
        .slice()
        .sort((a, b) => ((b.views || 0) + (b.salesCount || 0)) - ((a.views || 0) + (a.salesCount || 0)))
        .slice(0, 10);
      setPlants(sorted);
    };
    fetchData();
  }, []);

  return (
    <div className="admin-content-inner animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">ANALYTICS</p>
          <h1>Trending Performance</h1>
          <p className="module-copy">Top performing plant listings based on platform-wide interactions.</p>
        </div>
      </div>

      <div className="trending-showcase mt-6">
        {plants.length === 0 ? (
          <div className="panel-card empty-state">No performance data available.</div>
        ) : (
          <div className="trending-list-admin">
            {plants.map((plant, index) => (
              <div key={plant.id} className="panel-card trending-card-admin">
                <div className="trending-rank">#{index + 1}</div>
                <img 
                  src={plant.image && plant.image.startsWith('http') ? plant.image : `${API_BASE_URL}${plant.image}`} 
                  alt={plant.name} 
                  className="trending-img"
                />
                <div className="trending-info">
                  <h3>{plant.name}</h3>
                  <p>{plant.nursery_name || 'Community'}</p>
                </div>
                <div className="trending-stats">
                  <div className="stat-pill"><Eye size={14} /> <span>{plant.views || 0} Views</span></div>
                  <div className="stat-pill sales"><ShoppingBag size={14} /> <span>{plant.salesCount || 0} Sold</span></div>
                </div>
                <div className="trending-growth">
                  <TrendingUp size={24} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
