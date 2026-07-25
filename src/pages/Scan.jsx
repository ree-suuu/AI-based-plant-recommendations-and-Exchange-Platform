import { useState, useRef, useEffect } from 'react';
import { 
  Camera, MapPin, Search, Leaf, ArrowLeft, ArrowRight, Home, Loader2, CheckCircle, 
  ShoppingCart, RefreshCw, X, Info, Droplets, Sun, Sprout, 
  Maximize, Calendar, Scissors, Bug, Trophy, Globe, Thermometer, Wind,
  Sparkles, Minus, Plus, Trash2, QrCode, Upload, FlipHorizontal2
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import careTipsData from './careTips.json';
import PLANT_DETAILS from './plantData';
import './Scan.css';
import { API_BASE_URL } from '../apiConfig';

// Specialized Care Data Generator (duplicated for direct use in results)
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

  if (plantName && plantName.toLowerCase().includes('peace lily')) {
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
  return commonData;
};

const gridIconMap = {
  "Outdoor Size Range": <Maximize size={20} color="#84A98C" />,
  "Indoor Size Range": <Home size={20} color="#84A98C" />,
  "Light Requirements": <Sun size={20} color="#84A98C" />,
  "Watering Schedule": <Droplets size={20} color="#84A98C" />,
  "Humidity Needs": <Wind size={20} color="#84A98C" />,
  "Temperature Range": <Thermometer size={20} color="#84A98C" />,
  "Fertilizing Schedule": <Droplets size={20} color="#84A98C" />,
  "Growing Season": <Calendar size={20} color="#84A98C" />,
  "Pruning Guidelines": <Scissors size={20} color="#84A98C" />,
  "Growing Difficulty Level": <Trophy size={20} color="#84A98C" />,
  "Common Pests and Diseases": <Bug size={20} color="#84A98C" />,
  "USDA Hardiness Zones": <Globe size={20} color="#84A98C" />
};

export default function Scan() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const openAuthModal = outletContext?.openAuthModal;
  const isAuthenticated = outletContext?.isAuthenticated ?? (localStorage.getItem('leafLifeAuthenticated') === 'true');
  const [step, setStep] = useState('scan'); // 'scan', 'results'
  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [identification, setIdentification] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment'=back, 'user'=front
  const [isFlipping, setIsFlipping] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (err) {
      return [];
    }
  });

  const [networkIp, setNetworkIp] = useState(window.location.hostname);
  const [quantity, setQuantity] = useState(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [showCart, setShowCart] = useState(false);

  // Payment Flow State
  const [showQRPrompt, setShowQRPrompt] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [success, setSuccess] = useState(false);
  const userId = localStorage.getItem('leafLifeUserId') || 1;

  // In-app toast notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRemoveFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const numeric = priceStr.toString().replace(/[^0-9]/g, '');
    return parseInt(numeric) || 0;
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
            showToast('Payment session expired. Please try again.', 'error');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showQRPrompt, paymentSessionId, paymentStatus, networkIp]);

  const handleProceedToPayment = async () => {
    const userAuthenticated = localStorage.getItem('leafLifeAuthenticated') === 'true';
    if (!userAuthenticated) {
      if (openAuthModal) openAuthModal();
      else showToast('Please log in to purchase.', 'warn');
      return;
    }
    
    // Get fresh userId from localStorage
    const currentUserId = localStorage.getItem('leafLifeUserId') || 1;
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
    } catch (err) {
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
    setPaymentSessionId(null);
  };

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const startCamera = async (facing = facingMode) => {
    setCameraError('');
    try {
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: facing } } 
        });
      } catch (err1) {
        // Fallback for laptop/desktop webcams
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError('Camera access unavailable. Grant permission or upload a photo below.');
    }
  };

  const flipCamera = async () => {
    if (isFlipping) return;
    setIsFlipping(true);
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    // Stop existing stream before starting new one
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    await startCamera(newFacing);
    setIsFlipping(false);
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (step === 'scan') {
      startCamera();
      // Revoke the previous object URL to free up memory when returning to scan mode
      if (capturedImage && capturedImage.startsWith('blob:')) {
        URL.revokeObjectURL(capturedImage);
        setCapturedImage(null);
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step]);

  const handleIdentify = async () => {
    if (!isAuthenticated) {
      const scanCount = parseInt(localStorage.getItem('leafLifeGuestScanCount') || '0', 10);
      if (scanCount >= 1) {
        showToast('Guest limit reached. Sign in to scan unlimited plants!', 'warn');
        setTimeout(() => { if (openAuthModal) openAuthModal(); }, 1000);
        return;
      }
    }

    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      showToast('Camera not ready yet. Please wait a moment and try again.', 'warn');
      setIsScanning(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsScanning(false);
        return;
      }

      // Create a local URL for the captured image
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);

      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');

      try {
        const response = await fetch(`${API_BASE_URL}/api/identify`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Identification failed');
        }
        
        if (!isAuthenticated) {
          localStorage.setItem('leafLifeGuestScanCount', '1');
        }
        setIdentification(data);
        setStep('results');
        setQuantity(1); // Reset quantity for new identification
      } catch (err) {
        console.error("Identify error:", err);
        showToast(err.message || 'Identification failed. Please try again.', 'error');
      } finally {
        setIsScanning(false);
      }
    }, 'image/jpeg', 0.8);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAuthenticated) {
      const scanCount = parseInt(localStorage.getItem('leafLifeGuestScanCount') || '0', 10);
      if (scanCount >= 1) {
        showToast('Guest limit reached. Sign in to scan unlimited plants!', 'warn');
        setTimeout(() => { if (openAuthModal) openAuthModal(); }, 1000);
        return;
      }
    }

    setIsScanning(true);
    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);

    const formData = new FormData();
    formData.append('image', file, file.name);

    fetch(`${API_BASE_URL}/api/identify`, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Identification failed');
        if (!isAuthenticated) {
          localStorage.setItem('leafLifeGuestScanCount', '1');
        }
        setIdentification(data);
        setStep('results');
        setQuantity(1);
      })
      .catch(err => {
        console.error("Identify error:", err);
        showToast(err.message || 'Identification failed. Please try again.', 'error');
      })
      .finally(() => {
        setIsScanning(false);
      });
  };

  const handleLocalPlantClick = (id) => {
    if (!identification) return;
    navigate(`/marketplace/${id}`, { 
      state: { 
        from: 'scan',
        identification: {
          commonName: identification.commonName,
          scientificName: identification.scientificName,
          score: identification.score
        }
      } 
    });
  };

  // Safe matched detail derivation
  const getMatchedDetail = () => {
    if (!identification) return null;
    const common = (identification.commonName || '').toLowerCase();
    const scientific = (identification.scientificName || '').toLowerCase();
    
    const match = Object.entries(PLANT_DETAILS || {}).find(([id, p]) => {
      const pName = (p.name || '').toLowerCase();
      const pSci = (p.scientificName || '').toLowerCase();
      return pName === common || pSci === scientific || (common && common.includes(pName));
    });
    
    return match ? { id: match[0], ...match[1] } : null;
  };

  const matched = getMatchedDetail();

  // Determine the primary system image URL (Strictly system catalog - Keep relative paths for DB)
  const resultImage = identification?.localPlant?.image 
    ? identification.localPlant.image
    : (matched?.name 
        ? `/plants/${encodeURI(matched.name === 'Peace Lily' ? 'PeaceLily' : matched.name)}/1.jpg` 
        : 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=800');

  // Unified display plant object (Merges AI ID + DB Record + Botanical Details)
  const displayPlant = identification ? {
    id: identification.localPlant?.id || (matched?.id ? `MATCHED-${matched.id}` : `SCAN-TEMP-${identification.commonName || 'GENERIC'}`),
    name: identification.localPlant?.name || matched?.name || identification.commonName || 'Unknown Species',
    english_name: identification.localPlant?.english_name || matched?.englishName || identification.commonName || 'N/A',
    scientific_name: identification.scientificName || matched?.scientificName || 'N/A',
    nepali_name: identification.localPlant?.nepali_name || matched?.nepaliName || 'N/A',
    description: identification.localPlant?.description || matched?.description || `Identified with ${Math.round(identification.score * 100)}% confidence. This beautiful species is part of the Leaf-Life botanical catalog.`,
    price: identification.localPlant?.price || 'Rs. 450',
    location: identification.localPlant?.location || 'Partner Nursery',
    image: resultImage
  } : null;

  const specializedCareData = identification ? getSpecializedCareData(displayPlant?.name || identification.commonName || identification.scientificName, null) : {};

  return (
    <div className="animate-fade-in scan-container">
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
          <span>{toast.type === 'error' ? '❌' : toast.type === 'warn' ? '⚠️' : 'ℹ️'}</span>
          {toast.message}
        </div>
      )}
      {/* Fixed Floating Cart Icon */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        <div className="header-cart-icon" onClick={() => setShowCart(true)} style={{ cursor: 'pointer', padding: '12px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--primary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff4b4b', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
              {cart.reduce((sum, item) => sum + (item.quantity || 0), 0)}
            </span>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {step === 'scan' && (
        <div className="scan-view">
          <div className="scan-header">
            <h2 className="title-medium text-center">AI Plant Identifier</h2>
            <p className="text-subtle text-center">Powered by Pl@ntNet™ Technology</p>
          </div>
          
          <div className="camera-container">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="camera-feed" 
              style={{ display: stream ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {!stream && (
              <div className="camera-fallback" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1rem', textAlign: 'center' }}>
                {cameraError ? (
                  <div style={{ color: '#666' }}>
                    <p style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>{cameraError}</p>
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary"
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px' }}
                    >
                      <Upload size={16} /> Choose Photo File
                    </button>
                  </div>
                ) : (
                  <>
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                    <p style={{ marginTop: '1rem', color: '#666', fontWeight: '500' }}>Initializing Camera...</p>
                  </>
                )}
              </div>
            )}
            
            <div className="viewfinder">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
              <div className="scan-hint"><Info size={14} /> Center a leaf for best results</div>
            </div>

            {/* Camera Flip Button */}
            {stream && (
              <button
                type="button"
                onClick={flipCamera}
                disabled={isFlipping}
                title={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to back camera'}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.45)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isFlipping ? 'not-allowed' : 'pointer',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  transition: 'background 0.2s',
                  zIndex: 10,
                }}
              >
                <FlipHorizontal2
                  size={22}
                  style={{
                    transition: 'transform 0.4s ease',
                    transform: isFlipping ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                />
              </button>
            )}
            
            {isScanning && (
              <div className="scanning-overlay">
                <div className="scan-line"></div>
                <div className="scan-status"><RefreshCw className="animate-spin" size={20} /><span>Analyzing Species...</span></div>
              </div>
            )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />

          <div className="scan-controls" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn-capture" onClick={handleIdentify} disabled={isScanning || !stream}>
              <div className="inner-circle"><Camera size={32} /></div>
            </button>

            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #ddd',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: 'var(--primary)'
              }}
              title="Upload photo from device"
            >
              <Upload size={24} />
            </button>
          </div>
          <p className="capture-label" style={{ marginTop: '0.5rem' }}>Tap camera to scan or upload photo</p>
        </div>
      )}

      {step === 'results' && identification && (
        <div className="results-view-full animate-fade-in" style={{ padding: '1rem', background: '#fff', minHeight: '100vh' }}>
          {/* Header Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button 
              className="back-btn" 
              onClick={() => setStep('scan')} 
              style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#666', fontWeight: '600' }}
            >
              <ArrowLeft size={20} /> Back to Scanner
            </button>
          </div>

          <div className="plant-detail-card" style={{ padding: '0', border: 'none', boxShadow: 'none' }}>
            {/* Title Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '0' }}>{displayPlant?.name || identification.commonName}</h1>
              <p style={{ color: '#666', fontStyle: 'italic', fontSize: '1.1rem', marginTop: '0.25rem' }}>({identification.scientificName})</p>
            </div>

            {/* Main Image Card */}
            <div className="carousel-container" style={{ aspectRatio: '16/10', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', position: 'relative', marginBottom: '1.5rem' }}>
              <img 
                src={resultImage}
                alt={identification.commonName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=800'; }}
              />
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--primary)', color: 'white', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: '700' }}>
                {identification.localPlant ? 'MATCH FOUND' : 'IDENTIFIED'}
              </div>
            </div>

            {/* Names Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#2D6A4F', fontWeight: '800', fontSize: '0.85rem' }}>SCIENTIFIC NAME:</span>
                <span style={{ color: '#444', fontStyle: 'italic', fontSize: '0.95rem' }}>{identification.scientificName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#2D6A4F', fontWeight: '800', fontSize: '0.85rem' }}>ENGLISH NAME:</span>
                <span style={{ color: '#444', fontWeight: '600', fontSize: '0.95rem' }}>{displayPlant?.english_name || identification.commonName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#2D6A4F', fontWeight: '800', fontSize: '0.85rem' }}>NEPALI NAME:</span>
                <span style={{ color: '#444', fontWeight: '600', fontSize: '0.95rem' }}>{displayPlant?.nepali_name || 'N/A'}</span>
              </div>
            </div>

            {/* About Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Leaf size={18} color="var(--primary)" /> About This Plant
              </h3>
              <p style={{ color: '#4a4a4a', lineHeight: '1.7', fontSize: '1rem' }}>
                {displayPlant?.description}
              </p>
            </div>

            {/* Price & Location Boxes */}
            {displayPlant && (
              <div className="metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#f7f9f7', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #eee' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Price</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>{displayPlant.price}</p>
                </div>
                <div style={{ background: '#f7f9f7', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #eee' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Nursery / Location</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: '700', color: '#444' }}>{displayPlant.location}</p>
                </div>
              </div>
            )}

            {/* Care Grid */}
            <div className="specialized-care-grid-section" style={{ marginBottom: '8rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.5rem' }}>Plant Care Instructions</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {Object.entries(specializedCareData).map(([title, content], idx) => (
                  <div key={idx} style={{ background: '#F0F7F2', borderRadius: '1.25rem', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ background: 'white', padding: '0.6rem', borderRadius: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                      {gridIconMap[title]}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: '700' }}>{title}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#4a4a4a', lineHeight: '1.4' }}>{content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fixed Bottom Action */}
          {displayPlant && (
            <div style={{ position: 'fixed', bottom: '0', left: '0', right: '0', padding: '1.5rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid #eee', zIndex: 100 }}>
              <button 
                onClick={() => {
                  if (!isAuthenticated) {
                    if (openAuthModal) openAuthModal();
                    else showToast('Please log in to add items to cart.', 'warn');
                    return;
                  }
                  setShowQuantitySelector(true);
                }}
                className="add-to-cart-big-new"
                style={{ width: '100%', maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: '#3D704D', color: 'white', padding: '1.25rem', borderRadius: '1rem', fontSize: '1.2rem', fontWeight: '700', border: 'none', cursor: 'pointer' }}
              >
                <ShoppingCart size={24} /> Add to Cart
              </button>
            </div>
          )}
        </div>
      )}

      {/* Select Quantity Modal */}
      {showQuantitySelector && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={() => setShowQuantitySelector(false)}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', textAlign: 'center', padding: '2.5rem', borderRadius: '2rem', maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f5f5f5', borderRadius: '50%', padding: '5px', border: 'none', cursor: 'pointer' }} onClick={() => setShowQuantitySelector(false)}><X size={20} /></button>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Select Quantity</h3>
              <p style={{ color: '#666', fontSize: '1rem' }}>How many <b>{displayPlant?.name}</b>s do you want?</p>
            </div>
            <div className="quantity-controls" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '2rem 0' }}>
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '52px', height: '52px', borderRadius: '14px', border: '1px solid #ddd', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={24} /></button>
              <span style={{ fontSize: '2.25rem', fontWeight: '800' }}>{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} style={{ width: '52px', height: '52px', borderRadius: '14px', border: '1px solid #ddd', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={24} /></button>
            </div>
            <button type="button" onClick={() => {
              const plantToCart = displayPlant;
              const existingItem = cart.find(item => item.id == plantToCart.id);
              if (existingItem) {
                setCart(cart.map(item => item.id == plantToCart.id ? { ...item, quantity: item.quantity + quantity } : item));
              } else {
                setCart([...cart, { ...plantToCart, quantity }]);
              }
              setShowQuantitySelector(false);
              setShowCart(true);
            }} style={{ width: '100%', padding: '1.1rem', borderRadius: '9999px', background: 'var(--gradient-primary)', color: 'white', fontWeight: '700', fontSize: '1.1rem', border: 'none', boxShadow: '0 4px 12px rgba(46, 96, 58, 0.2)', cursor: 'pointer' }}>Add to Cart</button>
          </div>
        </div>
      )}
      {/* Cart Modal */}
      {showCart && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex' }} onClick={() => setShowCart(false)}>
          <div className="glass-panel modal-content animate-scale-up" style={{ zIndex: 10001, background: 'white', color: 'black', opacity: 1, transform: 'none', maxWidth: '460px', width: '95%', padding: '2rem', borderRadius: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" type="button" style={{ position: 'absolute', top: '15px', right: '15px', background: '#f5f5f5', borderRadius: '50%', padding: '5px', border: 'none', cursor: 'pointer' }} onClick={() => setShowCart(false)}><X size={28} /></button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Your Cart</h3>
              <p style={{ color: '#666' }}>{cart.length === 0 ? 'Your cart is empty' : `Items: ${cart.reduce((sum, item) => sum + (item.quantity || 0), 0)}`}</p>
            </div>
            {cart.length > 0 ? (
              <>
                <div className="cart-items-list" style={{ maxHeight: '350px', overflowY: 'auto', textAlign: 'left', paddingRight: '5px' }}>
                  {cart.map((item, index) => (
                    <div key={item.id || `cart-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                      <img src={item.image?.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}`} alt={item.name} style={{ width: '70px', height: '70px', borderRadius: '14px', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1416879598555-259160a2bece?q=80&w=400'; }} />
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
                  <button type="button" onClick={() => setShowCart(false)} style={{ color: '#888', fontWeight: '500', cursor: 'pointer', textAlign: 'center', padding: '5px', background: 'none', border: 'none' }}>Back to Shopping</button>
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
              <button type="button" onClick={() => navigate('/dashboard')} className="btn-primary w-full" style={{ padding: '1rem', borderRadius: '9999px', background: 'var(--gradient-primary)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Go to Dashboard</button>
              <button type="button" onClick={closeModals} className="btn-text w-full" style={{ color: '#888', fontWeight: '500', cursor: 'pointer', background: 'none', border: 'none' }}>Continue Browsing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
