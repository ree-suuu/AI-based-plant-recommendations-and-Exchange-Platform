const STORAGE_USERS_KEY = 'leafLifeNurseryUsers';
const STORAGE_STORE_KEY = 'leafLifeNurseryStore';
const STORAGE_SESSION_KEY = 'leafLifeNurserySession';

const defaultNurseryUsers = [
  {
    id: 'nursery-1',
    nurseryName: 'Green Haven Nursery',
    ownerName: 'Maya Patel',
    email: 'demo@nursery.com',
    phone: '9812345678',
    address: 'Garden Street, Kathmandu',
    password: 'Demo@123',
  },
];

const defaultNurseryStore = {
  'nursery-1': {
    profile: {
      nurseryName: 'Green Haven Nursery',
      ownerName: 'Maya Patel',
      email: 'demo@nursery.com',
      phone: '9812345678',
      address: 'Garden Street, Kathmandu',
      revenue: 24800,
      earnings: 18560,
      pendingOrders: 5,
      productsCount: 14,
      monthlySales: 42,
    },
    products: [
      {
        id: 'prod-1',
        name: 'Fiddle Leaf Fig',
        category: 'Indoor',
        price: 1250,
        quantity: 12,
        available: true,
        description: 'Premium fiddle leaf fig with rich foliage.',
        image: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?auto=format&fit=crop&w=900&q=60',
        salesCount: 22,
        views: 560,
        wishlistCount: 48,
      },
      {
        id: 'prod-2',
        name: 'Snake Plant',
        category: 'Air Purifying',
        price: 650,
        quantity: 8,
        available: true,
        description: 'Easy care snake plant for low light rooms.',
        image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=60',
        salesCount: 18,
        views: 460,
        wishlistCount: 36,
      },
      {
        id: 'prod-3',
        name: 'Peace Lily',
        category: 'Flowering',
        price: 850,
        quantity: 4,
        available: false,
        description: 'Elegant peace lily that blooms indoors.',
        image: 'https://images.unsplash.com/photo-1512850184-2353d0c86f73?auto=format&fit=crop&w=900&q=60',
        salesCount: 29,
        views: 690,
        wishlistCount: 61,
      },
    ],
    orders: [
      {
        id: 'order-001',
        plantName: 'Fiddle Leaf Fig',
        quantity: 2,
        orderDate: '2026-06-20',
        customerName: 'Riya Sharma',
        totalAmount: 2500,
        status: 'Completed',
      },
      {
        id: 'order-002',
        plantName: 'Snake Plant',
        quantity: 1,
        orderDate: '2026-06-22',
        customerName: 'Amit Thapa',
        totalAmount: 650,
        status: 'Processing',
      },
      {
        id: 'order-003',
        plantName: 'Peace Lily',
        quantity: 1,
        orderDate: '2026-06-24',
        customerName: 'Mina Gurung',
        totalAmount: 850,
        status: 'Delivered',
      },
    ],
  },
};

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch (err) {
    return fallback;
  }
}

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  return safeParse(window.localStorage.getItem(key), fallback);
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

import { API_BASE_URL } from '../../apiConfig';

export async function registerNurseryUser(user) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/nursery/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.message || 'Signup failed' };
    return { user: data.nursery };
  } catch (err) {
    return { error: 'Failed to connect to server' };
  }
}

export async function loginNurseryUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/nursery/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.message || 'Login failed' };
    return { user: data.nursery };
  } catch (err) {
    return { error: 'Failed to connect to server' };
  }
}

export async function getNurseryProfile(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/nursery/profile/${userId}`);
    if (!response.ok) return {};
    const data = await response.json();
    return (data && !data.error) ? data : {};
  } catch (err) {
    return {};
  }
}

export async function getNurseryStats(userId) {
  const defaultStats = {
    totalProducts: 0,
    totalOrders: 0,
    totalPlantsSold: 0,
    totalRevenue: 0,
    lowStock: 0,
    recentOrders: [],
    trending: [],
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/nursery/stats/${userId}`);
    if (!response.ok) return defaultStats;
    const data = await response.json();
    if (!data || data.error) return defaultStats;
    return {
      totalProducts: data.totalProducts || 0,
      totalOrders: data.totalOrders || 0,
      totalPlantsSold: data.totalPlantsSold || 0,
      totalRevenue: data.totalRevenue || 0,
      lowStock: data.lowStock || 0,
      recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
      trending: Array.isArray(data.trending) ? data.trending : [],
    };
  } catch (err) {
    return defaultStats;
  }
}

export async function getNurseryProducts(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/nursery/plants/${userId}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map(p => ({
        ...p,
        image: p.image && !p.image.startsWith('http') ? `${API_BASE_URL}${p.image}` : p.image
      }));
    }
    return [];
  } catch (err) {
    return [];
  }
}

// Deprecated local storage functions kept for compatibility during transition
export function findNurseryUser(email, password) {
  console.warn('Deprecated: findNurseryUser is now async and should be replaced with loginNurseryUser');
  return null;
}

export async function getNurseryOrders(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/nursery/orders/${userId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

export function updateNurseryProfile(userId, updatedProfile) {
  // Should call backend profile update
}

export async function upsertNurseryProduct(userId, product) {
  // This is now handled by syncNurseryProductToServer
  return product;
}

export function updateNurseryProductBackendId(userId, productId, backendPlantId) {
  // No longer needed if we fetch from backend directly
}

export function removeNurseryProduct(userId, productId) {
  // Use deleteNurseryProductFromServer instead
}

export function toggleNurseryProductAvailable(userId, productId) {
  // Use setNurseryProductAvailabilityOnServer instead
}

export async function syncNurseryProductToServer(userId, product, imageFile = null) {
  if (typeof window === 'undefined') return null;
  
  // Use backendPlantId if it's already a numeric DB ID, otherwise it's a local temp ID
  const isUpdate = product.id && !isNaN(product.id);
  const endpoint = isUpdate ? `/api/nursery/plants/${product.id}` : '/api/nursery/plants';
  const method = isUpdate ? 'PUT' : 'POST';

  const profile = await getNurseryProfile(userId);

  // If an image file is selected, send as multipart/form-data
  if (imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('name', product.name || '');
    formData.append('price', product.price || 0);
    formData.append('quantity', product.quantity || 0);
    formData.append('description', product.description || '');
    formData.append('available', product.available ? '1' : '0');
    formData.append('nurseryExternalId', userId);
    formData.append('nurseryName', profile?.nursery_name || 'My Nursery');
    formData.append('location', profile?.address || 'Partner Nursery');
    formData.append('phone', profile?.phone || '');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      body: formData,
      // DO NOT set Content-Type — browser sets multipart boundary automatically
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to sync product');
    return data;
  }

  // No file — send as JSON (keeps existing image or uses provided URL)
  const payload = {
    ...product,
    nurseryExternalId: userId,
    nurseryName: profile?.nursery_name || 'My Nursery',
    location: profile?.address || 'Partner Nursery',
    phone: profile?.phone || '',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to sync product');
  return data;
}

export async function deleteNurseryProductFromServer(backendPlantId) {
  if (typeof window === 'undefined' || !backendPlantId) return null;
  const response = await fetch(`${API_BASE_URL}/api/nursery/plants/${backendPlantId}`, {
    method: 'DELETE',
  });
  return await response.json();
}

export async function setNurseryProductAvailabilityOnServer(backendPlantId, available) {
  if (typeof window === 'undefined' || !backendPlantId) return null;
  const response = await fetch(`${API_BASE_URL}/api/nursery/plants/${backendPlantId}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ available: !!available }),
  });
  return await response.json();
}

export function setNurserySession(userId) {
  writeStorage(STORAGE_SESSION_KEY, { userId, authenticated: true, expiresAt: Date.now() + 86400000 });
}

export function getNurserySession() {
  const session = readStorage(STORAGE_SESSION_KEY, null);
  if (session && session.authenticated && session.expiresAt > Date.now()) {
    return session;
  }
  clearNurserySession();
  return null;
}

export function clearNurserySession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_SESSION_KEY);
}

export function isNurseryAuthenticated() {
  return !!getNurserySession();
}
