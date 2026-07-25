import { API_BASE_URL } from '../../apiConfig';
const API_BASE = `${API_BASE_URL}/api/admin`;

const FALLBACK_USERS = [
  { id: 1, full_name: 'Rishu Prajapati', email: 'rishu@leaflife.com', role: 'Admin', created_at: '2026-05-10T10:00:00Z' },
  { id: 2, full_name: 'Dikshya Sitaula', email: 'dikshya@leaflife.com', role: 'Admin', created_at: '2026-05-12T11:30:00Z' },
  { id: 3, full_name: 'Adita Rai', email: 'adita@leaflife.com', role: 'Admin', created_at: '2026-05-15T09:20:00Z' },
  { id: 4, full_name: 'Liza Shrestha', email: 'liza@leaflife.com', role: 'Admin', created_at: '2026-05-18T14:15:00Z' },
  { id: 5, full_name: 'Maya Patel', email: 'demo@nursery.com', role: 'Nursery', created_at: '2026-06-01T08:00:00Z' },
  { id: 6, full_name: 'Riya Sharma', email: 'riya.sharma@gmail.com', role: 'User', created_at: '2026-06-05T12:00:00Z' },
  { id: 7, full_name: 'Amit Thapa', email: 'amit.thapa@yahoo.com', role: 'User', created_at: '2026-06-10T15:30:00Z' },
  { id: 8, full_name: 'Mina Gurung', email: 'mina.g@gmail.com', role: 'User', created_at: '2026-06-12T16:45:00Z' },
  { id: 9, full_name: 'Sujan Shrestha', email: 'sujan.np@outlook.com', role: 'User', created_at: '2026-06-15T11:10:00Z' },
  { id: 10, full_name: 'Pooja Karki', email: 'pooja.karki@gmail.com', role: 'User', created_at: '2026-06-18T10:25:00Z' },
  { id: 11, full_name: 'Bibek Maharjan', email: 'bibek.m@gmail.com', role: 'User', created_at: '2026-06-20T13:40:00Z' },
  { id: 12, full_name: 'Saraswati Joshi', email: 'saraswati@gmail.com', role: 'User', created_at: '2026-06-22T09:15:00Z' },
  { id: 13, full_name: 'Nabin Adhikari', email: 'nabin.a@gmail.com', role: 'User', created_at: '2026-06-25T14:50:00Z' },
  { id: 14, full_name: 'Prashant Dahal', email: 'prashant.d@gmail.com', role: 'User', created_at: '2026-07-01T16:20:00Z' },
  { id: 15, full_name: 'Kriti Basnet', email: 'kriti.b@gmail.com', role: 'User', created_at: '2026-07-05T10:05:00Z' },
  { id: 16, full_name: 'Aayush KC', email: 'aayush.kc@gmail.com', role: 'User', created_at: '2026-07-10T11:30:00Z' },
  { id: 17, full_name: 'Sneha Baniya', email: 'sneha.b@gmail.com', role: 'User', created_at: '2026-07-15T13:00:00Z' },
  { id: 18, full_name: 'Rohan Giri', email: 'rohan.g@gmail.com', role: 'User', created_at: '2026-07-20T15:15:00Z' }
];

export async function getAdminStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) {
      throw new Error(`Admin stats request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.error) {
      throw new Error(data?.error || 'Admin stats response was invalid');
    }

    const result = {
      totalUsers: data.totalUsers ?? 0,
      totalNurseries: data.totalNurseries ?? 0,
      totalPlants: data.totalPlants ?? 0,
      totalOrders: data.totalOrders ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
      pendingNurseries: data.pendingNurseries ?? 0
    };

    return result;
  } catch (err) {
    console.error('Admin stats fetch error:', err);
    return null;
  }
}

export async function getAdminUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) return FALLBACK_USERS;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return FALLBACK_USERS;
    return data;
  } catch (err) {
    console.error('getAdminUsers error:', err);
    return FALLBACK_USERS;
  }
}

export async function updateAdminUser(id, userData) {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return await response.json();
  } catch (err) {
    console.error('updateAdminUser error:', err);
    return { error: 'Failed to update user' };
  }
}

export async function deleteAdminUser(id, email = '') {
  try {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const response = await fetch(`${API_BASE}/users/${id}${query}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (err) {
    console.error('deleteAdminUser error:', err);
    return { error: 'Failed to delete user' };
  }
}

export async function getAdminNurseries() {
  try {
    const response = await fetch(`${API_BASE}/nurseries`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('getAdminNurseries error:', err);
    return [];
  }
}

export async function approveAdminNursery(id) {
  try {
    const response = await fetch(`${API_BASE}/nurseries/${id}/approve`, {
      method: 'PUT',
    });
    return await response.json();
  } catch (err) {
    console.error('approveAdminNursery error:', err);
    return { error: 'Failed to approve nursery' };
  }
}

export async function deleteAdminNursery(id) {
  try {
    const response = await fetch(`${API_BASE}/nurseries/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (err) {
    console.error('deleteAdminNursery error:', err);
    return { error: 'Failed to delete nursery' };
  }
}

export async function getAdminPlants() {
  try {
    const response = await fetch(`${API_BASE}/plants`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('getAdminPlants error:', err);
    return [];
  }
}

export async function deleteAdminPlant(id) {
  try {
    const response = await fetch(`${API_BASE}/plants/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (err) {
    console.error('deleteAdminPlant error:', err);
    return { error: 'Failed to delete plant' };
  }
}

export async function getAdminOrders() {
  try {
    const response = await fetch(`${API_BASE}/orders`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('getAdminOrders error:', err);
    return [];
  }
}

// Session management
const STORAGE_ADMIN_SESSION_KEY = 'leafLifeAdminSession';

export function setAdminSession(user) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_ADMIN_SESSION_KEY, JSON.stringify({
    ...user,
    authenticated: true,
    expiresAt: Date.now() + 86400000 // 24 hours
  }));
}

export function getAdminSession() {
  if (typeof window === 'undefined') return null;
  try {
    const session = JSON.parse(window.localStorage.getItem(STORAGE_ADMIN_SESSION_KEY));
    if (session && session.authenticated && session.expiresAt > Date.now()) {
      return session;
    }
  } catch (e) {}
  clearAdminSession();
  return null;
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_ADMIN_SESSION_KEY);
}

export function isAdminAuthenticated() {
  const session = getAdminSession();
  return !!session;
}
