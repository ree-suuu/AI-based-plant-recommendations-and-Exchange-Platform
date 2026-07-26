import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { Search, Filter, Heart, MapPin, ShoppingCart, X, Minus, Plus, QrCode, CheckCircle, Loader2, Trash2, Users, ArrowLeftRight, Camera } from 'lucide-react';
import './Marketplace.css';
import { API_BASE_URL } from '../apiConfig';

function PlantCard({ plant, onBuyClick, onClick, isCommunity, isOwner, onDelete }) {
  const handleAction = (e) => {
    e.stopPropagation();
    onBuyClick(e, plant);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Remove "${plant.name}" from listings?`)) {
      onDelete(plant.id);
    }
  };
  const getBadgeText = () => {
    if (!isCommunity) return 'BUY';
    if (plant.listing_type === 'exchange') return 'SWAP';
    if (plant.listing_type === 'sale') return 'BUY';
    if (plant.listing_type === 'thrift') return 'THRIFT';
    if (plant.listing_type === 'both') return 'BUY/SWAP';
    return plant.listing_type?.toUpperCase() || 'LISTED';
  };

  const getBadgeColor = () => {
    if (!isCommunity) return '#10B981'; // Green for Nursery Buy
    if (plant.listing_type === 'thrift') return '#FF4B4B'; // Red for Thrift
    if (plant.listing_type === 'exchange') return '#3B82F6'; // Blue for Swap
    if (plant.listing_type === 'sale') return '#10B981'; // Green for P2P Buy
    if (plant.listing_type === 'both') return 'var(--primary)'; // Dark Green for mixed
    return 'var(--primary)';
  };

  return (
    <div className={`plant-card ${isCommunity ? 'community-item' : ''}`} onClick={() => onClick(plant.id)}>
      <div className="plant-image-wrap">
        <img
          src={plant.image && plant.image.startsWith('http') ? plant.image : plant.image ? `${API_BASE_URL}${encodeURI(plant.image)}` : 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'}
          alt={plant.name}
          className="marketplace-img"
          onError={(e) => { 
            console.log("Image load failed, using fallback");
            e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; 
          }}
        />
        <button className="like-btn" onClick={(e) => e.stopPropagation()}><Heart size={18} /></button>

        {isOwner && (
          <button
            className="delete-listing-btn"
            onClick={handleDelete}
            title="Remove listing"
          >
            <Trash2 size={15} />
          </button>
        )}

        {isCommunity && (
          <>
            <div className="seller-badge">
              <Users size={12} />
              {plant.seller_name || 'Guest'}
            </div>
            <div className="type-badge" style={{ backgroundColor: getBadgeColor() }}>
              {plant.listing_type?.toUpperCase() || 'LISTED'}
            </div>
          </>
        )}
      </div>

      <div className="plant-details">
        <div className="plant-info-top">
          <div style={{ flex: 1 }}>
            <h3>{plant.name}</h3>
            <p className="location" style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MapPin size={10} />
              {plant.location || 'Local'}
            </p>
          </div>
          <div className="price-tag">
            <p className="price">{plant.listing_type === 'exchange' ? 'SWAP' : (plant.original_price || plant.price)}</p>
          </div>
        </div>

        <button
          className={`action-btn ${isCommunity ? 'request-btn' : 'buy-btn-card'}`}
          onClick={handleAction}
          disabled={isOwner}
          style={isOwner ? { opacity: 0.7, cursor: 'default', background: '#f5f5f5', color: '#888', border: '1px solid #ddd' } : {}}
        >
          {isOwner ? (
            <>
              <CheckCircle size={16} />
              <span>My Listing</span>
            </>
          ) : isCommunity ? (
            <>
              <ArrowLeftRight size={16} />
              <span>{plant.listing_type === 'exchange' ? 'Request Swap' : 'Send Offer'}</span>
            </>
          ) : (
            <>
              <ShoppingCart size={16} />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const openAuthModal = outletContext?.openAuthModal;
  const isAuthenticated = outletContext?.isAuthenticated ?? (localStorage.getItem('leafLifeAuthenticated') === 'true');
  const [searchParams, setSearchParams] = useSearchParams();
  const sellerId = searchParams.get('seller');
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'buy', 'thrift', 'swap'
  const [communityPlants, setCommunityPlants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (err) {
      console.error("Cart parse error:", err);
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);

  const [networkIp, setNetworkIp] = useState(window.location.hostname);

  // In-app toast notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    // Only try to detect network IP if we are on localhost
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

  useEffect(() => {
    console.log("Current Cart State:", cart);
  }, [cart]);

  useEffect(() => {
    console.log("showCart state changed to:", showCart);
  }, [showCart]);


  // Purchase Flow State
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showQRPrompt, setShowQRPrompt] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, completed
  const [success, setSuccess] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('pendingMarketplacePurchase');
    if (savedSession) {
      const { sessionId, plant, quantity: savedQuantity } = JSON.parse(savedSession);
      setPaymentSessionId(sessionId);
      setSelectedPlant(plant);
      setQuantity(savedQuantity);
      setShowQRPrompt(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const fetchCommunityPlants = async () => {
    const uId = localStorage.getItem('leafLifeUserId') || 1;
    try {
      const response = await fetch(`${API_BASE_URL}/api/marketplace/community?userId=${uId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const transformedData = data.map(p => ({
          ...p,
          image: p.image && !p.image.startsWith('http') ? `${API_BASE_URL}${encodeURI(p.image)}` : p.image
        }));
        setCommunityPlants(transformedData);
      }
    } catch (err) {
      console.error("Error fetching community plants:", err);
    }
  };

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plants`);
        const data = await response.json();

        // Safety check to ensure data is an array before mapping
        if (Array.isArray(data)) {
          const transformedData = data.map(plant => ({
            ...plant,
            image: plant.image && !plant.image.startsWith('http') ? `${API_BASE_URL}${encodeURI(plant.image)}` : plant.image
          }));
          setPlants(transformedData);
        } else {
          console.error("Received non-array data for plants:", data);
          setPlants([]);
        }
      } catch (err) {
        console.error("Error fetching plants:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlants();
    fetchCommunityPlants();
  }, []);


  // Polling for payment status
  useEffect(() => {
    let interval;
    if (showQRPrompt && paymentSessionId && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/payment/status/${paymentSessionId}`);
          const data = await response.json();
          if (data.status === 'completed') {
            setPaymentStatus('completed');
            clearInterval(interval);
            handleFinalizePurchase();
          } else if (data.status === 'expired') {
            clearInterval(interval);
            closeModals();
            showToast("Payment session expired. Please try again.", 'error');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showQRPrompt, paymentSessionId, paymentStatus, networkIp]);


  // Escape key listener to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModals();
        setShowCart(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const combinedPlants = [
    ...plants.map(p => ({ ...p, isCommunity: false })),
    ...communityPlants.map(p => ({ ...p, isCommunity: true }))
  ];

  const filteredPlants = combinedPlants.filter(plant => {
    // 0. Seller ID Filter (from Community Connect)
    if (sellerId && (!plant.isCommunity || plant.seller_id !== parseInt(sellerId))) return false;

    // 1. Search Query Filter
    if (searchQuery && !plant.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // 2. Tab Category Filter
    if (activeTab === 'all') return true;

    if (activeTab === 'buy') {
      // Nursery plants are always for sale
      if (!plant.isCommunity) return true;
      // Community plants: sale, both, or thrift
      return plant.listing_type === 'sale' || plant.listing_type === 'both' || plant.listing_type === 'thrift';
    }

    if (activeTab === 'thrift') {
      return plant.isCommunity && (plant.listing_type === 'thrift' || plant.listing_type === 'both');
    }

    if (activeTab === 'swap') {
      return plant.isCommunity && (plant.listing_type === 'exchange' || plant.listing_type === 'swap' || plant.listing_type === 'both');
    }

    return true;
  });


  const handleAddToCart = (plant, qty) => {
    const existingItem = cart.find(item => item.id === plant.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === plant.id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, { ...plant, quantity: qty }]);
    }
  };

  const handleRemoveFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const numeric = priceStr.toString().replace(/[^0-9]/g, '');
    return parseInt(numeric) || 0;
  };

  const handleDeleteListing = async (plantId) => {
    const userId = parseInt(localStorage.getItem('leafLifeUserId')) || 1;
    try {
      const res = await fetch(`${API_BASE_URL}/api/marketplace/listing/${plantId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        // Remove from local state immediately so all views refresh
        setCommunityPlants(prev => prev.filter(p => p.id !== plantId));
      } else {
        showToast('Could not delete listing: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error('Delete listing error:', err);
      showToast('Failed to connect to server.', 'error');
    }
  };

  const handleBuyClick = (e, plant) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in or sign up to purchase or swap plants.', 'warn');
      return;
    }
    if (plant.isCommunity) {
      setTradePlant(plant);
      setTradeDetails('');
      setShowTradeModal(true);
    } else {
      setSelectedPlant(plant);
      setQuantity(1);
      setShowQuantitySelector(true);
    }
  };

  const handleModalAddToCart = () => {
    handleAddToCart(selectedPlant, quantity);
    setShowQuantitySelector(false);
    setSelectedPlant(null);
  };

  const handleProceedToPayment = async () => {
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in to purchase.', 'warn');
      return;
    }

    // Calculate total amount from cart
    const amount = cart.reduce((sum, item) => sum + (parsePrice(item.price) * (item.quantity || 1)), 0);

    const userId = localStorage.getItem('leafLifeUserId') || 1;

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart,
          userId,
          amount
        })
      });
      const data = await response.json();

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error || 'Failed to initiate payment session');
      }

      setPaymentSessionId(data.sessionId);
      setPaymentStatus('pending');
      setShowCart(false);
      setShowQRPrompt(true);
    } catch (err) {
      console.error("Payment initiation error:", err);
      showToast(err.message || 'Failed to initiate payment. Please try again.', 'error');
    }
  };

  const handleFinalizePurchase = async () => {
    if (!paymentSessionId) {
      showToast('Payment session missing. Please start checkout again.', 'error');
      setShowQRPrompt(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/complete/${paymentSessionId}`, {
        method: 'POST'
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setCart([]);
        localStorage.removeItem('cart');
        setSuccess(true);
        setShowQRPrompt(false);
      } else {
        showToast(data.error || 'Failed to finalize checkout. Please try again.', 'error');
      }
    } catch (err) {
      console.error("Checkout finalization error:", err);
      showToast('Something went wrong. Please try again.', 'error');
    }
  };

  const closeModals = () => {
    setShowQuantitySelector(false);
    setShowQRPrompt(false);
    setSuccess(false);
    setSelectedPlant(null);
    setPaymentSessionId(null);
    setShowTradeModal(false);
    setShowAddModal(false);
  };

  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradePlant, setTradePlant] = useState(null);
  const [tradeDetails, setTradeDetails] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlant, setNewPlant] = useState({
    name: '',
    price: 'Rs. 450',
    listingType: 'exchange',
    type: 'plant',
    location: '',
    description: '',
    image: null
  });
  const [adding, setAdding] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'warn');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
        const data = await response.json();

        const addr = data.address;
        // Search for more specific local areas first
        const specificArea = addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet || addr.village || "";
        const city = addr.city || addr.town || addr.municipality || "Kathmandu";

        // Combine for a specific address like "Samakhusi, Kathmandu"
        const finalLocation = specificArea ? `${specificArea}, ${city}` : city;

        setNewPlant({ ...newPlant, location: finalLocation });
      } catch (err) {
        console.error("Location detection error:", err);
        showToast('Failed to detect location. Try entering it manually.', 'error');
      } finally {
        setDetectingLocation(false);
      }
    }, (error) => {
      console.error("Geolocation error:", error);
      showToast('Please enable location access to use this feature.', 'warn');
      setDetectingLocation(false);
    });
  };

  const handleAddPlant = async (e) => {
    e.preventDefault();
    const userStr = localStorage.getItem('leafLifeAuthenticated');
    if (!userStr) { showToast('Please log in first.', 'warn'); return; }

    setAdding(true);
    const formData = new FormData();
    formData.append('name', newPlant.name);
    formData.append('price', newPlant.price);
    formData.append('listingType', newPlant.listingType);
    formData.append('type', newPlant.type);
    formData.append('location', newPlant.location);
    formData.append('description', newPlant.description);
    formData.append('sellerId', localStorage.getItem('leafLifeUserId') || 1);
    if (newPlant.image) formData.append('image', newPlant.image);

    try {
      const response = await fetch(`${API_BASE_URL}/api/marketplace/add`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showToast('Listing created successfully! 🌱', 'info');
        setShowAddModal(false);
        setNewPlant({ name: '', price: 'Rs. 450', listingType: 'exchange', type: 'plant', location: '', description: '', image: null });
        await fetchCommunityPlants();
      }
    } catch (err) {
      console.error("Error adding product:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleCommunityRequest = (plant) => {
    const userStr = localStorage.getItem('leafLifeAuthenticated');
    if (!userStr) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in to contact community members.', 'warn');
      return;
    }
    setTradePlant(plant);
    setShowTradeModal(true);
  };

  const submitTradeRequest = async (type) => {
    const uId = localStorage.getItem('leafLifeUserId') || 1;

    if (!tradePlant?.id || !tradePlant?.seller_id) {
      showToast('Invalid listing. Please refresh and try again.', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/trade/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: uId,
          receiverId: tradePlant.seller_id,
          plantId: tradePlant.id,
          requestType: type,
          offerDetails: tradeDetails
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send request');
      }

      if (data.success) {
        showToast('Request sent successfully! ✅', 'info');
        setShowTradeModal(false);
        setTradeDetails('');
      } else {
        showToast(data.error || 'Failed to send request', 'error');
      }
    } catch (err) {
      console.error("Trade request error:", err);
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    }
  };



  const goToDetail = (id) => {
    navigate(`/marketplace/${id}`);
  };

  // Determine host for mobile access
  const API_BASE = API_BASE_URL;
  const HOST_URL = `${window.location.protocol}//${networkIp}${window.location.port ? ':' + window.location.port : ''}`;
  const billURL = `${HOST_URL}/bill/${paymentSessionId}`;

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <>
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
      <div className="marketplace-container" style={{ animation: 'none' }}>
        {/* Fixed Floating Cart Icon */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <div className="header-cart-icon" onClick={() => setShowCart(true)} style={{ position: 'relative', cursor: 'pointer', padding: '12px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff4b4b', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                {cartCount}
              </span>
            )}
          </div>
        </div>

        <div className="marketplace-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="title-medium" style={{ margin: 0 }}>Marketplace</h2>
          </div>

          <div className="search-bar" style={{ position: 'relative' }}>
            <Search size={20} className="icon" />
            <input
              type="text"
              placeholder="Search plants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="btn-icon" type="button"><Filter size={20} /></button>
            </div>
          </div>

          <div className="marketplace-tab-container">
            <div className="marketplace-tabs filters">
              <button
                className={`mode-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                className={`mode-tab ${activeTab === 'buy' ? 'active' : ''}`}
                onClick={() => setActiveTab('buy')}
              >
                Buy
              </button>
              <button
                className={`mode-tab ${activeTab === 'thrift' ? 'active' : ''}`}
                onClick={() => setActiveTab('thrift')}
              >
                Thrift
              </button>
              <button
                className={`mode-tab ${activeTab === 'swap' ? 'active' : ''}`}
                onClick={() => setActiveTab('swap')}
              >
                Swap
              </button>
            </div>

            <button
              className="btn-list-plant animate-pop-in"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={20} />
              List Plant
            </button>
          </div>

          <div className="community-info-bar">
            <div className="info-icon"><ArrowLeftRight size={20} /></div>
            <p>
              {activeTab === 'all' && "Explore everything from our nursery and community: Buy, Swap, or Thrift."}
              {activeTab === 'buy' && "Purchase fresh plants from our nursery or directly from fellow collectors."}
              {activeTab === 'thrift' && "Find great deals on pre-loved plants in the Thrift section."}
              {activeTab === 'swap' && "Request a trade or swap with other community members."}
            </p>
          </div>
        </div>

        {sellerId && (
          <div className="filter-info-bar animate-slide-down">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={18} color="#3B82F6" />
              <p>
                Showing plants from <strong>{combinedPlants.find(p => p.seller_id === parseInt(sellerId))?.seller_name || 'Community Member'}</strong>
              </p>
            </div>
            <button 
              className="clear-filter-btn"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('seller');
                setSearchParams(newParams);
              }}
            >
              <X size={14} />
              Clear Filter
            </button>
          </div>
        )}

        <div className="marketplace-body">
          {loading ? (
            <div className="loading-state">
              <Loader2 size={40} className="animate-spin" />
              <p>Loading plants...</p>
            </div>
          ) : (activeTab === 'thrift' || activeTab === 'swap') ? (
            <div className="grouped-marketplace">
              {/* User's own items */}
              {filteredPlants.filter(p => p.isCommunity && p.seller_id === (parseInt(localStorage.getItem('leafLifeUserId')) || 1)).length > 0 && (
                <div className="marketplace-group">
                  <h3 className="group-title-small">
                    {activeTab === 'thrift' ? 'Plants Kept for Thrift by You' : 'Plants Kept for Swap by You'}
                  </h3>
                  <div className="plants-grid">
                    {filteredPlants
                      .filter(p => p.isCommunity && p.seller_id === (parseInt(localStorage.getItem('leafLifeUserId')) || 1))
                      .map(plant => (
                        <PlantCard
                          key={`my-${plant.id}`}
                          plant={plant}
                          isCommunity={true}
                          isOwner={true}
                          onDelete={handleDeleteListing}
                          onBuyClick={handleBuyClick}
                          onClick={(id) => navigate(`/marketplace/${id}?type=community`)}
                        />
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Others' items */}
              <div className="marketplace-group" style={{ marginTop: '2.5rem' }}>
                <h3 className="group-title-small">
                  Available {activeTab === 'thrift' ? 'Thrift' : 'Swap'} from Community
                </h3>
                <div className="plants-grid">
                  {filteredPlants
                    .filter(p => p.isCommunity && p.seller_id !== (parseInt(localStorage.getItem('leafLifeUserId')) || 1))
                    .map(plant => (
                      <PlantCard
                        key={`other-${plant.id}`}
                        plant={plant}
                        isCommunity={true}
                        onBuyClick={handleBuyClick}
                          onClick={(id) => navigate(`/marketplace/${id}?type=community`)}
                      />
                    ))
                  }
                  {filteredPlants.filter(p => p.isCommunity && p.seller_id !== (parseInt(localStorage.getItem('leafLifeUserId')) || 1)).length === 0 && (
                    <div className="empty-state-small">
                      <p>No community {activeTab} items available right now.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="plants-grid">
              {filteredPlants.map(plant => {
                const currentUserId = parseInt(localStorage.getItem('leafLifeUserId')) || 1;
                const isOwner = plant.isCommunity && plant.seller_id === currentUserId;
                return (
                  <PlantCard
                    key={`${plant.isCommunity ? 'c' : 's'}-${plant.id}`}
                    plant={plant}
                    isCommunity={plant.isCommunity}
                    isOwner={isOwner}
                    onDelete={handleDeleteListing}
                    onBuyClick={handleBuyClick}
                    onClick={(id) => navigate(`/marketplace/${id}?type=${plant.isCommunity ? 'community' : 'store'}`)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Select Quantity Modal (Matching plant-app UI) */}
      {showQuantitySelector && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', textAlign: 'center', padding: '2.5rem', borderRadius: '2rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }} onClick={closeModals}><X size={20} /></button>

            <div className="modal-header">
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Select Quantity</h3>
              <p style={{ color: '#666', fontSize: '1rem' }}>How many <b>{selectedPlant?.name}</b>s do you want?</p>
            </div>

            <div className="quantity-controls">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="qty-btn">
                <Minus size={24} />
              </button>
              <span className="qty-value">{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} className="qty-btn">
                <Plus size={24} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleModalAddToCart}
              className="buy-btn"
              style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem', marginTop: '1rem' }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {showQRPrompt && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content text-center animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', padding: '2.5rem', borderRadius: '2rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" onClick={closeModals} style={{ position: 'absolute', top: '15px', right: '15px', color: 'black', background: '#f5f5f5', borderRadius: '50%', padding: '5px', border: 'none' }}><X size={20} /></button>
            <div className="modal-header">
              <div className="qr-icon" style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}><QrCode size={48} /></div>
              <h3>Scan to Pay</h3>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>Scan this QR code with your mobile to pay with eSewa.</p>
              <p style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.25rem', marginTop: '0.5rem' }}>
                Total: Rs. {cart.reduce((sum, item) => sum + (parsePrice(item.price) * (item.quantity || 1)), 0)}
              </p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', margin: '1.5rem 0', border: '1px solid #eee' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(billURL)}`}
                alt="Payment QR Code"
                style={{ width: '200px', height: '200px' }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#888', wordBreak: 'break-all', maxWidth: '200px' }}>
                {billURL}
              </div>
            </div>

            <button 
              onClick={handleFinalizePurchase}
              className="buy-btn"
              style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', borderRadius: '9999px', background: 'var(--primary)', color: 'white', fontWeight: '800' }}
            >
              Done & Checkout
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#999' }}>Click Done after you have completed the payment.</p>
          </div>
        </div>
      )}

      {success && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content text-center animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '80px', height: '80px', background: '#eef2ef', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><CheckCircle size={48} /></div>
            <h3>Purchase Successful!</h3>
            <p>You bought {quantity} {selectedPlant?.name}(s).</p>
            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button type="button" onClick={() => navigate('/dashboard')} className="btn-primary w-full">Go to Dashboard</button>
              <button type="button" onClick={closeModals} className="btn-text w-full">Continue Shopping</button>
            </div>
          </div>
        </div>
      )}

      {showTradeModal && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', maxWidth: '420px', width: '95%', padding: '2rem', borderRadius: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModals} style={{ position: 'absolute', top: '15px', right: '15px', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }}><X size={20} /></button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Interested in {tradePlant?.name}?</h3>
              <p style={{ color: '#666' }}>Sent a request to <b>{tradePlant?.seller_name}</b>.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Message or Offer Details</label>
              <textarea
                placeholder="Hi, I'm interested in buying/swapping..."
                value={tradeDetails}
                onChange={(e) => setTradeDetails(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', minHeight: '100px', resize: 'none' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              {(tradePlant?.listing_type === 'sale' || tradePlant?.listing_type === 'both' || tradePlant?.listing_type === 'thrift') && (
                <button
                  className="btn-primary"
                  onClick={() => submitTradeRequest('buy')}
                  style={{ flex: 1, padding: '1rem', borderRadius: '9999px', background: 'var(--primary)', color: 'white', fontWeight: '700' }}
                >
                  Buy for {tradePlant?.original_price || tradePlant?.price}
                </button>
              )}
              {(tradePlant?.listing_type === 'exchange' || tradePlant?.listing_type === 'both' || tradePlant?.listing_type === 'swap' || !tradePlant?.listing_type) && (
                <button
                  className="btn-secondary"
                  onClick={() => submitTradeRequest('exchange')}
                  style={{ flex: 1, padding: '1rem', borderRadius: '9999px', background: '#3B82F6', color: 'white', fontWeight: '700', border: 'none' }}
                >
                  Request Swap
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={() => { console.log('Overlay clicked, closing...'); setShowCart(false); }}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', maxWidth: '460px', width: '95%', padding: '2rem', borderRadius: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" style={{ position: 'absolute', top: '15px', right: '15px', color: 'black', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }} onClick={() => setShowCart(false)}><X size={28} /></button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Your Cart</h3>
              <p style={{ color: '#666' }}>
                {cart.length === 0 ? 'Your cart is empty' : `Items: ${cartCount}`}
              </p>
            </div>

            {cart.length > 0 ? (
              <>
                <div className="cart-items-list" style={{ maxHeight: '350px', overflowY: 'auto', textAlign: 'left', paddingRight: '5px' }}>
                  {cart.map((item, index) => (
                    <div key={item.id || `cart-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                      <img
                        src={item.image.startsWith('http') ? item.image.replace('localhost', window.location.hostname) : `${API_BASE_URL}${item.image}`}
                        alt={item.name}
                        style={{ width: '70px', height: '70px', borderRadius: '14px', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{item.name}</h4>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '5px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1rem' }}>{item.price}</span>
                          <span style={{ background: '#f0f4f1', color: '#555', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700' }}>x {item.quantity}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        style={{ color: '#ff4b4b', padding: '10px', background: '#fff0f0', borderRadius: '12px' }}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '25px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Total Amount</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>Rs. {cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0)}</span>
                </div>

                <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button type="button" onClick={handleProceedToPayment} className="buy-btn" style={{ width: '100%', padding: '1.25rem', borderRadius: '9999px', fontSize: '1.1rem' }}>Proceed to Checkout</button>
                  <button type="button" onClick={() => setShowCart(false)} style={{ color: '#888', fontWeight: '500', cursor: 'pointer', textAlign: 'center', padding: '5px' }}>Back to Shopping</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <div style={{ background: '#f5f7f5', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
                  <ShoppingCart size={45} style={{ opacity: 0.3, color: 'var(--primary)' }} />
                </div>
                <button type="button" onClick={() => setShowCart(false)} className="buy-btn" style={{ width: '100%' }}>Browse Marketplace</button>
              </div>
            )}
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', maxWidth: '480px', width: '95%', padding: '2rem', borderRadius: '2rem', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModals} style={{ position: 'absolute', top: '15px', right: '15px', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }}><X size={20} /></button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Create New Listing</h3>
              <p style={{ color: '#666' }}>Sell, Thrift, or Exchange your plant.</p>
            </div>

            <form onSubmit={handleAddPlant} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Plant Name</label>
                <input required type="text" placeholder="e.g. Monstera Deliciosa" value={newPlant.name} onChange={e => setNewPlant({ ...newPlant, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee' }} />
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '700', color: '#444' }}>Listing Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewPlant({ ...newPlant, listingType: 'exchange' })}
                    style={{
                      padding: '12px', borderRadius: '14px', border: '2px solid',
                      borderColor: newPlant.listingType === 'exchange' ? '#3B82F6' : '#eee',
                      background: newPlant.listingType === 'exchange' ? '#eff6ff' : 'white',
                      color: newPlant.listingType === 'exchange' ? '#2563eb' : '#666',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800'
                    }}
                  >
                    <ArrowLeftRight size={20} /> <span style={{ fontSize: '0.8rem' }}>Swap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPlant({ ...newPlant, listingType: 'thrift' })}
                    style={{
                      padding: '12px', borderRadius: '14px', border: '2px solid',
                      borderColor: newPlant.listingType === 'thrift' ? '#FF4B4B' : '#eee',
                      background: newPlant.listingType === 'thrift' ? '#fff1f1' : 'white',
                      color: newPlant.listingType === 'thrift' ? '#dc2626' : '#666',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800'
                    }}
                  >
                    <Heart size={20} /> <span style={{ fontSize: '0.8rem' }}>Thrift</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPlant({ ...newPlant, listingType: 'both' })}
                    style={{
                      padding: '12px', borderRadius: '14px', border: '2px solid',
                      borderColor: newPlant.listingType === 'both' ? 'var(--primary)' : '#eee',
                      background: newPlant.listingType === 'both' ? 'var(--primary-light)' : 'white',
                      color: newPlant.listingType === 'both' ? 'var(--primary)' : '#666',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800'
                    }}
                  >
                    <Users size={20} /> <span style={{ fontSize: '0.8rem' }}>Both</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Price (Rs.)</label>
                <input
                  type="text"
                  placeholder="e.g. 450"
                  value={newPlant.price}
                  onChange={e => setNewPlant({ ...newPlant, price: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee' }}
                  disabled={newPlant.listingType === 'exchange'}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Location</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Samakhusi, Kathmandu"
                    value={newPlant.location}
                    onChange={e => setNewPlant({ ...newPlant, location: e.target.value })}
                    style={{ width: '100%', padding: '12px', paddingRight: '45px', borderRadius: '12px', border: '1px solid #eee' }}
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    title="Detect my location"
                    style={{
                      position: 'absolute', right: '10px', background: 'none', border: 'none',
                      color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      opacity: detectingLocation ? 0.5 : 1
                    }}
                    disabled={detectingLocation}
                  >
                    {detectingLocation ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Description (Optional)</label>
                <textarea placeholder="Tell us more about the plant..." value={newPlant.description} onChange={e => setNewPlant({ ...newPlant, description: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', minHeight: '80px', resize: 'none' }}></textarea>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Plant Photo</label>
                <input required type="file" accept="image/*" onChange={e => setNewPlant({ ...newPlant, image: e.target.files[0] })} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px dashed #ccc' }} />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={adding}
                style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem', borderRadius: '9999px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {adding ? <Loader2 className="animate-spin" size={20} /> : null}
                {adding ? 'Creating Listing...' : 'List Product Now'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
