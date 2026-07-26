import { Plus, Droplets, MapPin, Wind, Trophy, Leaf, ShoppingCart, X, Trash2, QrCode, Loader2, CheckCircle, Minus, ArrowLeftRight, Camera, Heart, Users } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Dashboard.css';
import { API_BASE_URL } from '../apiConfig';

export default function Dashboard() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const openAuthModal = outletContext?.openAuthModal;
  const isAuthenticated = outletContext?.isAuthenticated ?? (localStorage.getItem('leafLifeAuthenticated') === 'true');
  const userName = isAuthenticated ? (localStorage.getItem('leafLifeUserName') || 'Plant Parent') : 'Guest';
  const userId = localStorage.getItem('leafLifeUserId') || 1;
  const [ownedCount, setOwnedCount] = useState(0);
  const [totalCO2, setTotalCO2] = useState("0.0");
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart and Payment States
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (err) {
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);
  const [showQRPrompt, setShowQRPrompt] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [success, setSuccess] = useState(false);
  const [networkIp, setNetworkIp] = useState(window.location.hostname);

  // P2P Listing State
  const [showListingModal, setShowListingModal] = useState(false);
  const [plantToList, setPlantToList] = useState(null);
  const [listingType, setListingType] = useState('sale');
  const [listingPrice, setListingPrice] = useState('Rs. 450');

  // In-App Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const fetchNetworkIp = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/network-info`);
          const data = await response.json();
          if (data.ip && data.ip !== 'localhost') {
            setNetworkIp(data.ip);
          }
        } catch (err) {
          console.error("Error fetching network IP:", err);
        }
      };
      fetchNetworkIp();
    }
  }, []);

  // Polling for payment status
  useEffect(() => {
    let interval;
    if (showQRPrompt && paymentSessionId && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? `http://${networkIp}:5000` : API_BASE_URL;
          const response = await fetch(`${baseUrl}/api/payment/status/${paymentSessionId}`);
          const data = await response.json();
          if (data.status === 'completed') {
            setPaymentStatus('completed');
            clearInterval(interval);
            handleFinalizePurchase();
          } else if (data.status === 'expired') {
            clearInterval(interval);
            setShowQRPrompt(false);
            showToast("Payment session expired. Please try again.", 'error');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showQRPrompt, paymentSessionId, paymentStatus, networkIp]);

  const handleRemoveFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const numeric = priceStr.toString().replace(/[^0-9]/g, '');
    return parseInt(numeric) || 0;
  };

  const handleProceedToPayment = async () => {
    const userAuthenticated = localStorage.getItem('leafLifeAuthenticated') === 'true';
    if (!userAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in to purchase.', 'warn');
      return;
    }
    
    const amount = cart.reduce((sum, item) => sum + (parsePrice(item.price) * (item.quantity || 1)), 0);

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems: cart, userId, amount })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      setPaymentSessionId(data.sessionId);
      setPaymentStatus('pending');
      setShowCart(false);
      setShowQRPrompt(true);
    } catch (err) {
      showToast(err.message || "Failed to initiate payment.", 'error');
    }
  };

  const handleFinalizePurchase = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/complete/${paymentSessionId}`, {
        method: 'POST'
      });
      if (response.ok) {
        setCart([]);
        localStorage.removeItem('cart');
        setSuccess(true);
        setShowQRPrompt(false);
      } else {
        showToast("Failed to finalize checkout.", 'error');
      }
    } catch (err) {
      console.error("Checkout finalization error:", err);
      showToast("Something went wrong.", 'error');
    }
  };

  const closeModals = () => {
    setShowQRPrompt(false);
    setSuccess(false);
    setPaymentSessionId(null);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setOwnedCount(0);
      setTotalCO2("0.0");
      setCollection([]);
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const statsRes = await fetch(`${API_BASE_URL}/api/user/${userId}/stats`);
        const statsData = await statsRes.json();
        setOwnedCount(statsData.ownedCount || 0);
        setTotalCO2(statsData.totalCO2 || "0.0");

        const collectionRes = await fetch(`${API_BASE_URL}/api/user/${userId}/collection`);
        const collectionData = await collectionRes.json();
        setCollection(collectionData || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [userId, isAuthenticated]);

  const handleListPlant = (plant) => {
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in to list plants.', 'warn');
      return;
    }
    setPlantToList(plant);
    setListingPrice(plant.price || 'Rs. 450');
    setShowListingModal(true);
  };

  const submitPlantListing = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/marketplace/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: plantToList.id,
          userId,
          listingType,
          price: listingPrice
        })
      });

      if (response.ok) {
        showToast('Plant listed in Community Marketplace! ✅', 'info');
        setShowListingModal(false);
        setPlantToList(null);
        // Refresh collection
        const collectionRes = await fetch(`${API_BASE_URL}/api/user/${userId}/collection`);
        const collectionData = await collectionRes.json();
        setCollection(collectionData || []);
      } else {
        showToast('Failed to list plant. Please try again.', 'error');
      }
    } catch (err) {
      console.error("Listing error:", err);
    }
  };

  // Calculate AQI based on plants (Simulated improvement)
  // Baseline AQI is 100 (Unhealthy for sensitive groups), improved by plants
  const baseAQI = 100;
  const aqiImprovement = Math.min(60, ownedCount * 5); // Max 60 point improvement
  const currentAQI = baseAQI - aqiImprovement;
  const aqiStatus = currentAQI <= 50 ? 'Excellent' : currentAQI <= 80 ? 'Good' : 'Moderate';
  const progressPercent = Math.min(100, (ownedCount / 10) * 100);

  // Group collection by plant name to show quantity badges
  const groupedCollection = collection.reduce((acc, plant) => {
    const existing = acc.find(item => item.name === plant.name);
    if (existing) {
      existing.quantity += Number(plant.quantity || 1);
    } else {
      acc.push({ ...plant, quantity: Number(plant.quantity || 1) });
    }
    return acc;
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="animate-fade-in dashboard-container">
      {/* In-App Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, padding: '14px 24px', borderRadius: '12px', fontWeight: '600',
          fontSize: '0.95rem', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          background: toast.type === 'error' ? '#FF4B4B' : toast.type === 'warn' ? '#F59E0B' : '#2D6A4F',
          color: 'white', display: 'flex', alignItems: 'center', gap: '10px',
          maxWidth: '90vw', animation: 'fadeInDown 0.3s ease',
          pointerEvents: 'none'
        }}>
          <span>{toast.type === 'error' ? '❌' : toast.type === 'warn' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}
      {!isAuthenticated && (
        <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', padding: '1.25rem 1.75rem', borderRadius: '1.25rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 6px 16px rgba(16,185,129,0.25)', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>🌿 Guest Mode Preview</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', opacity: 0.95 }}>Log in or sign up to add real plants, track health metrics, earn rewards, and personalize your garden!</p>
          </div>
          <button 
            type="button" 
            onClick={() => openAuthModal && openAuthModal()} 
            style={{ background: 'white', color: '#059669', fontWeight: 800, border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.95rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            Log In / Sign Up
          </button>
        </div>
      )}
      {/* Fixed Floating Cart Icon */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        <div className="header-cart-icon" onClick={() => setShowCart(true)} style={{ cursor: 'pointer', padding: '12px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--primary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingCart size={24} />
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff4b4b', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
              {cartCount}
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Hi, {userName}! 👋</h1>
          <p className="dashboard-subtext">
            {ownedCount === 0 
              ? "Start your green journey today." 
              : "Your urban jungle is thriving."}
          </p>
        </div>
      </header>
      
      {/* Top Row: Stats Cards */}
      <div className="dashboard-stats-grid">
        {/* Card: Plants Owned */}
        <div className="stat-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">Plants Owned</h3>
            <div className="stat-icon-wrap bg-teal-light">
              <Leaf size={20} className="text-teal" />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value-display">
              <span className="stat-value-number">{ownedCount}</span>
              <span className="stat-value-label">Active Plants</span>
            </div>
            <p className="stat-card-footer">
              <strong>{ownedCount > 0 ? `+${ownedCount}` : '0'}</strong> total
            </p>
          </div>
        </div>

        {/* Card: Air Quality Impact */}
        <div className="stat-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">Air Quality Impact</h3>
            <div className="stat-icon-wrap bg-green-light">
              <Wind size={20} className="text-primary" />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="aqi-display">
              <span className="aqi-number">{currentAQI}</span>
              <span className="aqi-label" style={{ color: currentAQI <= 50 ? '#10B981' : '#F59E0B' }}>
                AQI ({aqiStatus})
              </span>
            </div>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
            <p className="stat-card-footer"><strong>{totalCO2}kg</strong> of CO₂ filtered</p>
          </div>
        </div>


        {/* Card 3: Active Challenges */}
        <div className="stat-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">Active Challenges</h3>
            <div className="stat-icon-wrap bg-orange-light">
              <Trophy size={20} className="text-orange" />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="challenge-info">
              <h4 className="challenge-name">Eco-Initiator</h4>
              <p className="challenge-desc">Own your first 3 plants.</p>
            </div>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill bg-orange" style={{ width: `${Math.min(100, (ownedCount / 3) * 100)}%` }}></div>
              </div>
              <span className="progress-text">{Math.min(3, ownedCount)}/3 completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Your Collection Section */}
      <section className="collection-section">
        <div className="collection-header">
          <h2 className="section-title">Your Collection</h2>
          {collection.length > 0 && (
            <button className="btn-primary" onClick={() => navigate('/scan')}>Manage All</button>
          )}
        </div>

        <div className="collection-grid">
          {groupedCollection.map(plant => (
            <div key={plant.id} className="plant-card" onClick={() => navigate(`/marketplace/${plant.id}`)} style={{ cursor: 'pointer' }}>
              <div className="plant-image-container">
                <img 
                  src={
                    plant.image.startsWith('http') 
                      ? (plant.image.includes('/plants/') 
                          ? plant.image.replace(/http:\/\/[^\/:]+(:\d+)?/, API_BASE_URL)
                          : plant.image)
                      : `${API_BASE_URL}${encodeURI(plant.image)}`
                  } 
                  alt={plant.name} 
                  className="plant-image" 
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; }}
                />
                {plant.quantity > 1 && (
                  <div className="plant-quantity-badge">
                    x{plant.quantity}
                  </div>
                )}
                <div className="plant-location-badge">
                  <MapPin size={12} />
                  {plant.location || 'Home'}
                </div>
              </div>
              <div className="plant-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className="plant-name">{plant.name}</h3>
                    <p className="plant-status">Healthy • {plant.quantity > 1 ? `${plant.quantity} plants` : '1 plant'}</p>
                  </div>
                  <button 
                    className="btn-icon" 
                    title="List for Sale/Exchange"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlantToList(plant);
                      setListingPrice(plant.price);
                      setShowListingModal(true);
                    }}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', padding: '8px', borderRadius: '10px' }}
                  >
                    <ArrowLeftRight size={16} />
                  </button>
                </div>
                {plant.is_listed === 1 && (
                  <span style={{ fontSize: '0.7rem', background: '#fff8e6', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', marginTop: '4px', display: 'inline-block' }}>
                    LISTED: {plant.listing_type.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {/* Add New Card */}
          <div className="plant-card add-new-card" onClick={() => navigate('/marketplace')}>
            <div className="add-new-icon-wrap">
              <Plus size={32} />
            </div>
            <h3 className="add-new-title">Add New</h3>
            <p className="add-new-desc">Explore the Marketplace</p>
          </div>
        </div>
      </section>

      {/* Cart Modal */}
      {showCart && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={() => setShowCart(false)}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', maxWidth: '460px', width: '95%', padding: '2rem', borderRadius: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" style={{ position: 'absolute', top: '15px', right: '15px', background: '#f5f5f5', borderRadius: '50%', padding: '5px', border: 'none', cursor: 'pointer' }} onClick={() => setShowCart(false)}><X size={28} /></button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Your Cart</h3>
              <p style={{ color: '#666' }}>{cart.length === 0 ? 'Your cart is empty' : `Items: ${cartCount}`}</p>
            </div>
            {cart.length > 0 ? (
              <>
                <div className="cart-items-list" style={{ maxHeight: '350px', overflowY: 'auto', textAlign: 'left', paddingRight: '5px' }}>
                  {cart.map((item, index) => (
                    <div key={item.id || `cart-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                      <img src={item.image?.startsWith('http') ? item.image.replace('localhost', (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? networkIp : window.location.hostname) : `${API_BASE_URL}${item.image}`} alt={item.name} style={{ width: '70px', height: '70px', borderRadius: '14px', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{item.name}</h4>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '5px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1rem' }}>{item.price}</span>
                          <span style={{ background: '#f0f4f1', color: '#555', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700' }}>x {item.quantity}</span>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFromCart(item.id)} style={{ color: '#ff4b4b', padding: '10px', background: '#fff0f0', borderRadius: '12px', border: 'none', cursor: 'pointer' }}><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '25px', padding: '20px', background: '#f9fbf9', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Total Amount</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>Rs. {cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0)}</span>
                </div>
                <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button type="button" onClick={handleProceedToPayment} style={{ width: '100%', padding: '1.25rem', borderRadius: '9999px', background: '#3D704D', color: 'white', border: 'none', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer' }}>Proceed to Checkout</button>
                  <button type="button" onClick={() => setShowCart(false)} style={{ color: '#888', fontWeight: '500', cursor: 'pointer', textAlign: 'center', padding: '5px', background: 'none', border: 'none' }}>Back to Dashboard</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <div style={{ background: '#f5f7f5', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}><ShoppingCart size={45} style={{ opacity: 0.3, color: 'var(--primary)' }} /></div>
                <button type="button" onClick={() => { setShowCart(false); navigate('/marketplace'); }} style={{ width: '100%', padding: '1.1rem', borderRadius: '9999px', background: 'var(--gradient-primary)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Browse Marketplace</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showQRPrompt && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content text-center animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', padding: '2.5rem', borderRadius: '2rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" onClick={closeModals} style={{ position: 'absolute', top: '15px', right: '15px', color: 'black', background: '#f5f5f5', borderRadius: '50%', padding: '5px', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            <div className="modal-header">
              <div className="qr-icon" style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}><QrCode size={48} /></div>
              <h3>Scan to Pay</h3>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>Scan this QR code with your mobile to pay with eSewa.</p>
              <p style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.25rem', marginTop: '0.5rem' }}>
                Total: Rs. {cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0)}
              </p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', margin: '1.5rem 0', border: '1px solid #eee' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.protocol}//${networkIp}${window.location.port ? ':' + window.location.port : ''}/bill/${paymentSessionId}`)}`} alt="Payment QR Code" style={{ width: '200px', height: '200px' }} />
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#888', wordBreak: 'break-all', maxWidth: '200px' }}>
                {`${window.location.protocol}//${networkIp}${window.location.port ? ':' + window.location.port : ''}/bill/${paymentSessionId}`}
              </div>
            </div>

            <button 
              onClick={handleFinalizePurchase}
              style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', borderRadius: '9999px', background: 'var(--primary)', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer' }}
            >
              Done & Checkout
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#999' }}>Click Done after you have completed the payment.</p>
          </div>
        </div>
      )}

      {success && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content text-center animate-scale-up" style={{ zIndex: 10001, background: 'white', padding: '2rem', borderRadius: '1.5rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '80px', height: '80px', background: '#eef2ef', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><CheckCircle size={48} /></div>
            <h3>Purchase Successful!</h3>
            <p>Your order has been placed successfully.</p>
            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button type="button" onClick={closeModals} className="btn-primary w-full" style={{ padding: '1rem', borderRadius: '9999px', background: 'var(--gradient-primary)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Continue Browsing</button>
            </div>
          </div>
        </div>
      )}

      {/* P2P Listing Modal */}
      {showListingModal && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={() => setShowListingModal(false)}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', padding: '2rem', borderRadius: '2rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowListingModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }}><X size={20} /></button>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>List for Community</h3>
              <p style={{ color: '#666' }}>Share your <b>{plantToList?.name}</b> with others.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '700', fontSize: '0.9rem', color: '#444' }}>Select Listing Intent</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button 
                  onClick={() => setListingType('sale')}
                  className={`type-select-btn ${listingType === 'sale' ? 'active' : ''}`}
                  style={{ 
                    padding: '12px', borderRadius: '16px', border: '2px solid',
                    borderColor: listingType === 'sale' ? '#10B981' : '#eee',
                    background: listingType === 'sale' ? '#ecfdf5' : 'white',
                    color: listingType === 'sale' ? '#059669' : '#666',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                  }}
                >
                  <ShoppingCart size={20} />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>For Sale</span>
                </button>
                <button 
                  onClick={() => setListingType('exchange')}
                  className={`type-select-btn ${listingType === 'exchange' ? 'active' : ''}`}
                  style={{ 
                    padding: '12px', borderRadius: '16px', border: '2px solid',
                    borderColor: listingType === 'exchange' ? '#3B82F6' : '#eee',
                    background: listingType === 'exchange' ? '#eff6ff' : 'white',
                    color: listingType === 'exchange' ? '#2563eb' : '#666',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                  }}
                >
                  <ArrowLeftRight size={20} />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>Exchange</span>
                </button>
                <button 
                  onClick={() => setListingType('thrift')}
                  className={`type-select-btn ${listingType === 'thrift' ? 'active' : ''}`}
                  style={{ 
                    padding: '12px', borderRadius: '16px', border: '2px solid',
                    borderColor: listingType === 'thrift' ? '#FF4B4B' : '#eee',
                    background: listingType === 'thrift' ? '#fff1f1' : 'white',
                    color: listingType === 'thrift' ? '#dc2626' : '#666',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Heart size={20} />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>Thrift It</span>
                </button>
                <button 
                  onClick={() => setListingType('both')}
                  className={`type-select-btn ${listingType === 'both' ? 'active' : ''}`}
                  style={{ 
                    padding: '12px', borderRadius: '16px', border: '2px solid',
                    borderColor: listingType === 'both' ? 'var(--primary)' : '#eee',
                    background: listingType === 'both' ? 'var(--primary-light)' : 'white',
                    color: listingType === 'both' ? 'var(--primary)' : '#666',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Users size={20} />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>Both</span>
                </button>
              </div>
            </div>

            {(listingType === 'sale' || listingType === 'both') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Asking Price</label>
                <input 
                  type="text" 
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', fontSize: '1.1rem', fontWeight: '700' }}
                />
              </div>
            )}

            <button 
              className="btn-primary w-full" 
              onClick={handleListPlant}
              style={{ padding: '1.1rem', fontSize: '1.1rem', borderRadius: '9999px', background: 'var(--primary)', color: 'white' }}
            >
              List Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
