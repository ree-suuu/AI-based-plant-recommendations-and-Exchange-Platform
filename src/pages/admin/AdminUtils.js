import { API_BASE_URL } from '../../apiConfig';
const API_BASE = `${API_BASE_URL}/api/admin`;

export async function getAdminStats() {
  const defaultStats = {
    totalUsers: 0,
    totalNurseries: 0,
    totalPlants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingNurseries: 0
  };

  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) return defaultStats;
    const data = await response.json();
    if (!data || data.error) return defaultStats;
    return {
      totalUsers: data.totalUsers ?? 0,
      totalNurseries: data.totalNurseries ?? 0,
      totalPlants: data.totalPlants ?? 0,
      totalOrders: data.totalOrders ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
      pendingNurseries: data.pendingNurseries ?? 0
    };
  } catch (err) {
    console.error('Admin stats fetch error:', err);
    return defaultStats;
  }
}

export async function getAdminUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('getAdminUsers error:', err);
    return [];
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
