import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { 
  ArrowLeft, Thermometer, Sun, Wind, MapPin, ShoppingCart, X, Minus, Plus, 
  QrCode, CheckCircle, Loader2, Trash2, Leaf, Lock, Unlock, Droplets, 
  Sparkles, Home, Maximize, Calendar, Scissors, Bug, Trophy, HelpCircle, 
  CloudRain, Globe, Sprout, ArrowLeftRight
} from 'lucide-react';
import PLANT_DETAILS, { getPlantDetailsByNameOrId } from './plantData';
import CARE_TIPS from './careTips.json';
import './PlantDetail.css';
import { API_BASE_URL } from '../apiConfig';

// Specialized Care Data Generator
const getSpecializedCareData = (plantName, answers) => {
  const commonData = {
    "Outdoor Size Range": "6-12 feet (1.8-3.6 m)",
    "Indoor Size Range": "12-36 inches (30-91 cm)",
    "Light Requirements": "Prefers bright, indirect light. Protect from harsh afternoon sun.",
    "Watering Schedule": "Water when the top inch of soil feels dry. Usually every 7-10 days.",
    "Humidity Needs": "Thrives in 50-70% humidity. Mist leaves weekly.",
    "Temperature Range": "Ideal between 65-80\u00b0F (18-27\u00b0C).",
    "Fertilizing Schedule": "Feed once a month during growing season with balanced fertilizer.",
    "Growing Season": "Active growth in Spring and Summer.",
    "Pruning Guidelines": "Remove yellow or brown leaves regularly to promote new growth.",
    "Growing Difficulty Level": "Beginner friendly. Relatively easy to maintain.",
    "Common Pests and Diseases": "Watch for spider mites and mealybugs. Avoid overwatering.",
    "USDA Hardiness Zones": "9-11"
  };

  // Specific data for Peace Lily as seen in image
  if (plantName.toLowerCase().includes('peace lily')) {
    return {
      "Outdoor Size Range": "N/A",
      "Indoor Size Range": "12-36 inches (30-91 cm)",
      "Light Requirements": "Peace lilies prefer bright, indirect light. Direct sunlight can scorch the leaves, while too little light can cause the plant to stop flowering.",
      "Watering Schedule": "The plant likes to be kept evenly moist, but not waterlogged. Water when the top inch of soil feels dry to the touch.",
      "Humidity Needs": "Peace lilies thrive in high humidity environments, ideally between 60-80%. They can benefit from regular misting or being placed on a tray of pebbles and water.",
      "Temperature Range": "The plant prefers temperatures between 65-80\u00b0F (18-27\u00b0C). Avoid exposing it to temperatures below 55\u00b0F (13\u00b0C) or above 90\u00b0F (32\u00b0C).",
      "Fertilizing Schedule": "Feed the plant once a month during the growing season with a balanced, water-soluble fertilizer.",
      "Growing Season": "Peace lilies can be grown year-round indoors.",
      "Pruning Guidelines": "Remove any yellow or brown leaves to keep the plant looking tidy. Cut back the entire plant by one-third if it becomes too leggy.",
      "Growing Difficulty Level": "Peace lilies are relatively easy to grow and care for, making them a popular houseplant choice.",
      "Common Pests and Diseases": "Common pests include spider mites, mealybugs, and scale insects. Diseases such as root rot can occur if the plant is overwatered.",
      "USDA Hardiness Zones": "10-12"
    };
  }

  // Adjustments based on user answers
  if (answers?.sunlight === 'Low') {
    commonData["Light Requirements"] = `Since your space has ${answers.sunlight} light, place near a north window. This plant is adaptable to your ${answers.sunlight}-light setting.`;
  } else if (answers?.sunlight === 'High') {
    commonData["Light Requirements"] = `Your ${answers.sunlight}-light space is great, but ensure indirect exposure to avoid leaf burn.`;
  }

  if (answers?.space === 'outdoor') {
    commonData["Indoor Size Range"] = "N/A (Being grown outdoors)";
  } else {
    commonData["Outdoor Size Range"] = "N/A (Being grown indoors)";
  }

  return commonData;
};

export default function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const openAuthModal = outletContext?.openAuthModal;
  const isAuthenticated = outletContext?.isAuthenticated ?? (localStorage.getItem('leafLifeAuthenticated') === 'true');
  const [plant, setPlant] = useState(null);
  const [images, setImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentUserId = localStorage.getItem('leafLifeUserId') || 1;
  // In-app toast notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
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

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);
  
  // Purchase Flow State
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showQRPrompt, setShowQRPrompt] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, completed
  const [success, setSuccess] = useState(false);
  const [isTipsPayment, setIsTipsPayment] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeDetails, setTradeDetails] = useState('');

  const plantId = parseInt(id);

  const [networkIp, setNetworkIp] = useState(window.location.hostname);

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

  const fetchPlantAndImages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/plants`);
      const data = await response.json();
      // Also fetch from collection if not in marketplace
      const collResponse = await fetch(`${API_BASE_URL}/api/user/${currentUserId}/collection`);
      const collData = await collResponse.json();
      
      // Also fetch from community marketplace to get seller info
      const commResponse = await fetch(`${API_BASE_URL}/api/marketplace/community`);
      const commData = await commResponse.json();
      
      const plantsArr = Array.isArray(data) ? data : [];
      const collArr = Array.isArray(collData) ? collData : [];
      const commArr = Array.isArray(commData) ? commData : [];
      
      const allPlants = [...plantsArr, ...collArr, ...commArr];
      const found = allPlants.find(p => p.id === plantId);
      
      if (found) {
        setPlant(found);
        const imagesResponse = await fetch(`${API_BASE_URL}/api/plants/${plantId}/images`);
        const imagesData = await imagesResponse.json();
        setImages(imagesData);
      }
    } catch (err) {
      console.error("Error fetching plant details or images:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPlantAndImages();
  }, [plantId, currentUserId]);

  const carouselImages = images.length > 0 ? images : (plant ? [plant.image] : []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
  };

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

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in or sign up to add items to cart.', 'warn');
      return;
    }
    setQuantity(1);
    setShowQuantitySelector(true);
  };

  const handleAddToCart = () => {
    const existingItem = cart.find(item => item.id === plant.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === plant.id 
          ? { ...item, quantity: item.quantity + quantity } 
          : item
      ));
    } else {
      setCart([...cart, { ...plant, quantity }]);
    }
    setShowQuantitySelector(false);
  };

  const handleRemoveFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const numeric = priceStr.toString().replace(/[^0-9]/g, '');
    return parseInt(numeric) || 0;
  };

  const handleProceedToPayment = async () => {
    const userStr = localStorage.getItem('leafLifeAuthenticated');
    if (!userStr) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in to purchase.', 'warn');
      return;
    }
    
    const amount = cart.reduce((sum, item) => sum + (parsePrice(item.price) * (item.quantity || 1)), 0);

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems: cart, userId: currentUserId, amount })
      });
      const data = await response.json();

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error || 'Failed to initiate payment session');
      }

      setPaymentSessionId(data.sessionId);
      setPaymentStatus('pending');
      setShowCart(false);
      setShowQRPrompt(true);
      setIsTipsPayment(false);
    } catch (err) {
      showToast(err.message || 'Failed to initiate payment. Please try again.', 'error');
    }
  };

  const handleUnlockTips = async () => {
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in or sign up to unlock specialized tips.', 'warn');
      return;
    }

    const tipsItem = {
      id: `UNLOCK-TIPS-${plant.id}`,
      name: `Specialized Care Tips for ${plant.name}`,
      price: "Rs. 50",
      quantity: 1,
      image: plant.image
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems: [tipsItem], userId: currentUserId, amount: 50 })
      });
      const data = await response.json();

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error || 'Failed to initiate payment session');
      }

      setPaymentSessionId(data.sessionId);
      setPaymentStatus('pending');
      setShowQRPrompt(true);
      setIsTipsPayment(true);
    } catch (err) {
      showToast(err.message || 'Failed to initiate payment for tips. Please try again.', 'error');
    }
  };

  const handleImmediateBuy = async () => {
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in or sign up to purchase.', 'warn');
      return;
    }
    
    // Determine the host for mobile access
    const amount = parsePrice(plant.price);
    const immediateItem = { ...plant, quantity: 1 };

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cartItems: [immediateItem], 
          userId: currentUserId, 
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
      setIsTipsPayment(false);
    } catch (err) {
      console.error("Immediate purchase initiation error:", err);
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
        if (!isTipsPayment) {
          setCart([]);
          localStorage.removeItem('cart');
        }
        setSuccess(true);
        setShowQRPrompt(false);
        fetchPlantAndImages(); // Refresh to show tips or updated ownership
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
    setPaymentSessionId(null);
    setIsTipsPayment(false);
    setShowTradeModal(false);
  };

  const handleSwapOffer = () => {
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in or sign up to send a swap offer.', 'warn');
      return;
    }
    setShowTradeModal(true);
  };

  const submitTradeRequest = async (type) => {
    const currentUserId = localStorage.getItem('leafLifeUserId') || 1;

    if (!plant?.id || !plant?.seller_id) {
      showToast('This listing cannot receive swap requests.', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/trade/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: plant.seller_id,
          plantId: plant.id,
          requestType: type,
          offerDetails: tradeDetails
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send offer');
      }

      if (data.success) {
        showToast('Swap offer sent successfully! ✅', 'info');
        setShowTradeModal(false);
        setTradeDetails('');
      } else {
        showToast(data.error || 'Failed to send offer', 'error');
      }
    } catch (err) {
      console.error("Trade request error:", err);
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading plant details...</div>;
  if (!plant) {
    return (
      <div className="plant-detail-container">
        <button className="back-btn" onClick={() => navigate('/marketplace')}>
          <ArrowLeft size={20} /> Back to Marketplace
        </button>
        <div className="error-state">Plant not found</div>
      </div>
    );
  }

  const detail = getPlantDetailsByNameOrId(plant);
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  const isOwned = plant?.buyer_id === parseInt(currentUserId);
  const careTips = plant?.name ? (CARE_TIPS[plant.name] || CARE_TIPS[plant.name.split(' (')[0]]) : {};
  
  const API_BASE = API_BASE_URL;
  const HOST_URL = `${window.location.protocol}//${networkIp}${window.location.port ? ':' + window.location.port : ''}`;
  const billURL = `${HOST_URL}/bill/${paymentSessionId}`;

  const location = useLocation();
  const fromRecommendation = location.state?.from === 'recommendation';
  const fromScan = location.state?.from === 'scan';
  const userAnswers = location.state?.answers || location.state?.identification || null;
  const showSpecializedGrid = fromRecommendation || fromScan;

  const specializedCareData = plant?.name ? getSpecializedCareData(plant.name, userAnswers) : {};

  // Map for grid icons
  const gridIconMap = {
    "Outdoor Size Range": <Maximize size={22} color="#84A98C" />,
    "Indoor Size Range": <Home size={22} color="#84A98C" />,
    "Light Requirements": <Sun size={22} color="#84A98C" />,
    "Watering Schedule": <Droplets size={22} color="#84A98C" />,
    "Humidity Needs": <Wind size={22} color="#84A98C" />,
    "Temperature Range": <Thermometer size={22} color="#84A98C" />,
    "Fertilizing Schedule": <Droplets size={22} color="#84A98C" />,
    "Growing Season": <Calendar size={22} color="#84A98C" />,
    "Pruning Guidelines": <Scissors size={22} color="#84A98C" />,
    "Growing Difficulty Level": <Trophy size={22} color="#84A98C" />,
    "Common Pests and Diseases": <Bug size={22} color="#84A98C" />,
    "USDA Hardiness Zones": <Globe size={22} color="#84A98C" />
  };

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
      <div className="animate-fade-in plant-detail-container">
        {/* Fixed Floating Cart Icon */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <div className="header-cart-icon" onClick={() => setShowCart(true)} style={{ position: 'relative', cursor: 'pointer', padding: '10px', background: 'white', borderRadius: '50%', boxShadow: 'var(--shadow-sm)', color: 'var(--primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff4b4b', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                {cartCount}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button className="back-btn" onClick={() => isOwned ? navigate('/dashboard') : (fromRecommendation ? navigate('/recommendation') : (fromScan ? navigate('/scan') : navigate('/marketplace')))} style={{ marginBottom: 0 }}>
            <ArrowLeft size={20} /> {isOwned ? 'Back to Dashboard' : (fromRecommendation ? 'Back to Recommendations' : (fromScan ? 'Back to Scanner' : 'Back to Marketplace'))}
          </button>
        </div>

        <div className="plant-detail-card">
          <div className="detail-header-new">
            <h1 className="detail-title-new">{plant.name}</h1>
            {detail.scientificName && (
              <p className="scientific-name-new"><i>({detail.scientificName})</i></p>
            )}
          </div>

          <div className="carousel-section">
            <div className="carousel-container">
              <img 
                src={carouselImages[currentSlide]?.startsWith('http') ? carouselImages[currentSlide] : `${API_BASE_URL}${encodeURI(carouselImages[currentSlide])}`} 
                alt={plant.name} 
                className="carousel-img" 
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; }} 
              />
              <div className="carousel-badge">{plant.type || 'Plant'}</div>
              {carouselImages.length > 1 && (
                <>
                  <button className="carousel-arrow left" onClick={handlePrevSlide}><ArrowLeft size={20} /></button>
                  <button className="carousel-arrow right" onClick={handleNextSlide}><span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}><ArrowLeft size={20} /></span></button>
                  <div className="carousel-counter">{currentSlide + 1}/{carouselImages.length}</div>
                </>
              )}
            </div>
          </div>

          <div className="detail-section" style={{ borderBottom: '1px solid #eee', paddingBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scientific Name:</span>
                <span style={{ fontSize: '1.1rem', color: '#333', fontStyle: 'italic' }}>{detail.scientificName || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>English Name:</span>
                <span style={{ fontSize: '1.1rem', color: '#333', fontWeight: '600' }}>{detail.englishName || plant.name || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nepali Name:</span>
                <span style={{ fontSize: '1.1rem', color: '#333', fontWeight: '600' }}>{detail.nepaliName || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="detail-section" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Leaf size={20} className="text-primary" /> About This Plant
            </h3>
            <p style={{ lineHeight: '1.8', color: '#4a4a4a', fontSize: '1.05rem', textAlign: 'justify' }}>
              {detail.description || plant.description || 'No description available for this plant.'}
            </p>
          </div>

          {!isOwned && (
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Price</span>
                <span className="metadata-value">{plant.price}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Nursery / Location</span>
                <span className="metadata-value">{plant.location}</span>
              </div>
            </div>
          )}

          {/* Specialized Care Grid matching Image */}
          {showSpecializedGrid && (
            <div className="specialized-care-grid-section" style={{ marginTop: '2.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '2rem', color: '#1a1a1a' }}>Plant Care Instructions</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {Object.entries(specializedCareData).map(([title, content], idx) => (
                  <div key={idx} className="care-box-new" style={{ 
                    background: '#F0F7F2', 
                    borderRadius: '1.25rem', 
                    padding: '1.5rem',
                    display: 'flex',
                    gap: '1.25rem',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ 
                      background: 'white', 
                      padding: '0.75rem', 
                      borderRadius: '0.75rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}>
                      {gridIconMap[title] || <Leaf size={22} color="#84A98C" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#1a1a1a' }}>{title}</h4>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#4a4a4a', lineHeight: '1.5' }}>{content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Owned/Unlocked Section (kept but hidden if showSpecializedGrid is true to avoid redundancy) */}
          {isOwned && !showSpecializedGrid && (
            <div className="detail-section" style={{ marginTop: '2rem', padding: '2rem', background: '#f8fbf9', borderRadius: '1.5rem', border: '1px solid #e0eadd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Sparkles size={22} style={{ color: '#FFD700' }} /> Specialized Care Tips
                </h3>
                {plant.tips_unlocked ? (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#e6f7ef', padding: '0.4rem 0.8rem', borderRadius: '2rem' }}>
                        <Unlock size={14} /> UNLOCKED
                    </span>
                ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fffbeb', padding: '0.4rem 0.8rem', borderRadius: '2rem' }}>
                        <Lock size={14} /> LOCKED
                    </span>
                )}
              </div>

              {plant.tips_unlocked ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#3b82f6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Droplets size={18} /> <strong>Watering</strong>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: '1.5' }}>{careTips?.watering || 'Water when top soil is dry.'}</p>
                  </div>
                  <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sun size={18} /> <strong>Sunlight</strong>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: '1.5' }}>{careTips?.sunlight || 'Prefers bright indirect light.'}</p>
                  </div>
                  <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#10b981', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Leaf size={18} /> <strong>Pro Tip</strong>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: '1.5' }}>{careTips?.tips || 'Keep away from cold drafts.'}</p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '1rem' }}>Unlock personalized, expert care routines and maintenance schedules for your <strong>{plant.name}</strong>.</p>
                  <button 
                    onClick={handleUnlockTips}
                    className="btn-primary" 
                    style={{ padding: '0.8rem 2rem', fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'var(--gradient-primary)', border: 'none' }}
                  >
                    Unlock for Rs. 50 <Sparkles size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {!isOwned && (
            <div className="detail-actions-bottom">
              {plant.seller_id ? (
                /* Community / P2P Listing Actions */
                <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                  {(plant.listing_type === 'exchange' || plant.listing_type === 'both' || plant.listing_type === 'swap') && (
                    <button 
                      className="add-to-cart-big-new" 
                      onClick={handleSwapOffer} 
                      style={{ 
                        background: '#3B82F6', 
                        flex: (plant.listing_type === 'both') ? 1 : 'none',
                        width: (plant.listing_type === 'both') ? 'auto' : '100%'
                      }}
                    >
                      <ArrowLeftRight size={22} />
                      Swap Offer
                    </button>
                  )}
                  {(plant.listing_type === 'sale' || plant.listing_type === 'both' || plant.listing_type === 'thrift') && (
                    <button 
                      className="add-to-cart-big-new" 
                      onClick={handleImmediateBuy} 
                      style={{ 
                        background: 'var(--primary)',
                        flex: (plant.listing_type === 'both') ? 1 : 'none',
                        width: (plant.listing_type === 'both') ? 'auto' : '100%'
                      }}
                    >
                      <ShoppingCart size={22} />
                      Buy {plant.price}
                    </button>
                  )}
                </div>
              ) : (
                /* Nursery / Store Listing Actions */
                <button className="add-to-cart-big-new" onClick={handleBuyClick}>
                  <ShoppingCart size={22} />
                  Add to Cart
                </button>
              )}
            </div>
          )}
        </div>

        {/* Trade/Swap Modal */}
        {showTradeModal && (
          <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
            <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', padding: '2rem', borderRadius: '2rem', maxWidth: '450px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" type="button" onClick={closeModals} style={{ position: 'absolute', top: '15px', right: '15px', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }}><X size={20} /></button>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ background: '#EFF6FF', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#3B82F6' }}>
                  <ArrowLeftRight size={30} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Send Swap Offer</h3>
                <p style={{ color: '#666' }}>Interested in swapping for <b>{plant.name}</b>?</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>Your Offer Details (Optional)</label>
                <textarea 
                  placeholder="E.g., I can offer a Snake Plant or Monstera cutting in return..." 
                  value={tradeDetails}
                  onChange={(e) => setTradeDetails(e.target.value)}
                  style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid #ddd', minHeight: '120px', resize: 'none', fontSize: '0.95rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  onClick={() => submitTradeRequest(plant.listing_type === 'exchange' ? 'exchange' : 'both')} 
                  style={{ width: '100%', padding: '1.1rem', borderRadius: '9999px', background: '#3B82F6', color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Send Swap Request <ArrowLeftRight size={18} />
                </button>
                <button onClick={closeModals} style={{ padding: '0.5rem', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Select Quantity Modal */}
      {showQuantitySelector && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', textAlign: 'center', padding: '2.5rem', borderRadius: '2rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }} onClick={closeModals}><X size={20} /></button>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Select Quantity</h3>
              <p style={{ color: '#666', fontSize: '1rem' }}>How many <b>{plant.name}</b>s do you want?</p>
            </div>
            <div className="quantity-controls" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '2rem 0' }}>
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '52px', height: '52px', borderRadius: '14px', border: '1px solid #ddd', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={24} /></button>
              <span style={{ fontSize: '2.25rem', fontWeight: '800' }}>{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} style={{ width: '52px', height: '52px', borderRadius: '14px', border: '1px solid #ddd', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={24} /></button>
            </div>
            <button type="button" onClick={handleAddToCart} style={{ width: '100%', padding: '1.1rem', borderRadius: '9999px', background: 'var(--gradient-primary)', color: 'white', fontWeight: '700', fontSize: '1.1rem', border: 'none', boxShadow: '0 4px 12px rgba(46, 96, 58, 0.2)', cursor: 'pointer' }}>Add to Cart</button>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRPrompt && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={closeModals}>
          <div className="glass-panel modal-content text-center animate-scale-up" style={{ zIndex: 10001, background: 'white', padding: '2rem', borderRadius: '2rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" onClick={closeModals} style={{ position: 'absolute', top: '15px', right: '15px', color: 'black', background: '#f5f5f5', borderRadius: '50%', padding: '5px' }}><X size={20} /></button>
            <div className="modal-header">
              <div className="qr-icon" style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}><QrCode size={48} /></div>
              <h3>Scan to Pay</h3>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>Scan this with your mobile to see the bill and pay.</p>
              <p style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.25rem', marginTop: '0.5rem' }}>
                Total: Rs. {isTipsPayment ? 50 : cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0)}
              </p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', margin: '1.5rem 0', border: '1px solid #eee' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(billURL)}`} alt="Payment QR Code" style={{ width: '200px', height: '200px' }} />
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#888', wordBreak: 'break-all', maxWidth: '200px' }}>
                {billURL}
              </div>
            </div>
            <button 
              onClick={handleFinalizePurchase}
              style={{ 
                width: '100%', 
                padding: '1.25rem', 
                fontSize: '1.1rem', 
                borderRadius: '9999px', 
                background: 'var(--primary)', 
                color: 'white', 
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(46, 96, 58, 0.2)'
              }}
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
            <h3>{isTipsPayment ? 'Specialized Tips Unlocked!' : 'Purchase Successful!'}</h3>
            <p>{isTipsPayment ? `You now have access to expert care tips for your ${plant.name}.` : 'Your order has been placed successfully.'}</p>
            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button type="button" onClick={isTipsPayment ? closeModals : () => navigate('/dashboard')} className="btn-primary w-full">{isTipsPayment ? 'View Tips' : 'Go to Dashboard'}</button>
              <button type="button" onClick={closeModals} className="btn-text w-full">Continue Browsing</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={() => setShowCart(false)}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', maxWidth: '460px', width: '95%', padding: '2rem', borderRadius: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" style={{ position: 'absolute', top: '15px', right: '15px', color: 'black', background: '#f5f5f5', borderRadius: '50%', padding: '5px', border: 'none', cursor: 'pointer' }} onClick={() => setShowCart(false)}><X size={28} /></button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Your Cart</h3>
              <p style={{ color: '#666' }}>{cart.length === 0 ? 'Your cart is empty' : `Items: ${cartCount}`}</p>
            </div>
            {cart.length > 0 ? (
              <>
                <div className="cart-items-list" style={{ maxHeight: '350px', overflowY: 'auto', textAlign: 'left', paddingRight: '5px' }}>
                  {cart.map((item, index) => (
                    <div key={item.id || `cart-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                      <img src={item.image?.startsWith('http') ? item.image : `${API_BASE_URL}${item.image || ''}`} alt={item.name} style={{ width: '70px', height: '70px', borderRadius: '14px', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{item.name}</h4>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '5px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1rem' }}>{item.price}</span>
                          <span style={{ background: '#f0f4f1', color: '#555', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700' }}>x {item.quantity || 1}</span>
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
                  <button type="button" onClick={handleProceedToPayment} style={{ width: '100%', padding: '1.25rem', borderRadius: '9999px', background: 'var(--gradient-primary)', color: 'white', border: 'none', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer' }}>Proceed to Checkout</button>
                  <button type="button" onClick={() => setShowCart(false)} style={{ color: '#888', fontWeight: '500', cursor: 'pointer', textAlign: 'center', padding: '5px' }}>Back to Shopping</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <div style={{ background: '#f5f7f5', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}><ShoppingCart size={45} style={{ opacity: 0.3, color: 'var(--primary)' }} /></div>
                <button type="button" onClick={() => setShowCart(false)} style={{ width: '100%', padding: '1.1rem', borderRadius: '9999px', background: 'var(--gradient-primary)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Browse Marketplace</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
