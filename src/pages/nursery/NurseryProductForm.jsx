import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getNurserySession,
  getNurseryProducts,
  syncNurseryProductToServer,
} from './NurseryUtils';
import './NurseryModule.css';
import { Camera, X, Upload, ImagePlus } from 'lucide-react';

export default function NurseryProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const session = getNurserySession();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    price: '',
    quantity: '',
    description: '',
    available: true,
  });
  const [imageFile, setImageFile] = useState(null);       // actual File object
  const [imagePreview, setImagePreview] = useState(null); // data URL for preview
  const [existingImage, setExistingImage] = useState(''); // URL of existing image (edit mode)
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (!session) {
      navigate('/nursery/signin');
      return;
    }

    if (id) {
      const fetchProduct = async () => {
        const products = await getNurseryProducts(session.userId);
        const product = products.find(p => p.id.toString() === id);
        if (!product) {
          navigate('/nursery/products');
          return;
        }
        setEditingProduct(product);
        setForm({
          name: product.name,
          price: product.price,
          quantity: product.quantity || 0,
          description: product.description || '',
          available: !!product.available,
        });
        setExistingImage(product.image || '');
      };
      fetchProduct();
    }
  }, [navigate, session, id]);

  const handleChange = (field) => (event) => {
    const value = field === 'available' ? event.target.checked : event.target.value;
    setForm({ ...form, [field]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.price) {
      setError('Please fill in the plant name and price.');
      return;
    }

    try {
      await syncNurseryProductToServer(
        session.userId,
        {
          id,
          name: form.name,
          price: Number(form.price),
          quantity: Number(form.quantity),
          description: form.description,
          image: imageFile ? undefined : (existingImage || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=60'),
          available: form.available,
        },
        imageFile || null
      );
      navigate('/nursery/products');
    } catch (syncError) {
      console.error('Nursery product sync error:', syncError);
      setError('Failed to save product. Please try again.');
    }
  };

  const currentPreview = imagePreview || existingImage;

  return (
    <div className="module-page nursery-page animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">{id ? 'Edit Product' : 'Add Plant'}</p>
          <h1>{id ? 'Update your listing' : 'Create a new plant listing'}</h1>
          <p className="module-copy">Keep your stock, pricing, and availability up to date.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel-card form-panel grid-form">
        {/* Plant Name — full width */}
        <label className="input-label input-full">
          Plant Name
          <input value={form.name} onChange={handleChange('name')} className="input-field" placeholder="e.g. Snake Plant" required />
        </label>

        {/* Price & Quantity side by side */}
        <label className="input-label">
          Price (Rs.)
          <input type="number" min="0" value={form.price} onChange={handleChange('price')} className="input-field" placeholder="e.g. 500" required />
        </label>

        <label className="input-label">
          Quantity
          <input type="number" min="0" value={form.quantity} onChange={handleChange('quantity')} className="input-field" placeholder="e.g. 10" />
        </label>

        {/* Description — full width */}
        <label className="input-label input-full">
          Description
          <textarea value={form.description} onChange={handleChange('description')} className="textarea-field" rows="4" placeholder="Describe the plant's care requirements, size, etc." />
        </label>

        {/* Photo Upload — full width */}
        <div className="input-label input-full">
          <span style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Plant Photo</span>

          {currentPreview ? (
            /* Image Preview */
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <img
                src={currentPreview}
                alt="Plant preview"
                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--color-border, #e0e7ef)' }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                  width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white'
                }}
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '8px',
                  padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px',
                  cursor: 'pointer', color: 'white', fontSize: '0.75rem'
                }}
              >
                <Camera size={12} /> Change
              </button>
            </div>
          ) : (
            /* Upload Drop Zone */
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', maxWidth: '320px', height: '160px',
                border: '2px dashed var(--color-primary, #2D6A4F)',
                borderRadius: '12px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '10px',
                cursor: 'pointer', background: 'rgba(45,106,79,0.04)',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,106,79,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,106,79,0.04)'}
            >
              <ImagePlus size={32} style={{ color: 'var(--color-primary, #2D6A4F)', opacity: 0.7 }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: '600', color: 'var(--color-primary, #2D6A4F)', fontSize: '0.9rem' }}>
                  Upload Plant Photo
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#888' }}>
                  JPG, PNG or WEBP · max 10 MB
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--color-primary, #2D6A4F)', borderRadius: '8px', color: 'white', fontSize: '0.82rem' }}>
                <Upload size={13} /> Choose Photo
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Available for sale toggle */}
        <label className="input-checkbox" style={{ gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={form.available} onChange={handleChange('available')} />
          <span>Available for sale</span>
        </label>

        {error && <div className="form-error" style={{ gridColumn: '1 / -1' }}>{error}</div>}

        <div className="button-row" style={{ gridColumn: '1 / -1' }}>
          <button type="button" className="btn-secondary" onClick={() => navigate('/nursery/products')}>Cancel</button>
          <button type="submit" className="btn-primary">{id ? 'Save Changes' : 'Add Plant'}</button>
        </div>
      </form>
    </div>
  );
}
