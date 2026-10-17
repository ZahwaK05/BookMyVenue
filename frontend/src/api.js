// frontend/src/api.js
// Production API client for BookMyVenue
// Directly connects to Express backend (NO /api prefix)

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('bmv_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (res.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('bmv_token');
    localStorage.removeItem('bmv_user');
    window.dispatchEvent(new Event('bmv_auth_change'));
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ------------------------------------------------------------
// Authentication
// ------------------------------------------------------------
export const auth = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  signupRequest: (payload) => request('/auth/signup/request', { method: 'POST', body: payload }),
  signupVerify: ({ email, otp }) =>
    request('/auth/signup/verify', { method: 'POST', body: { email, otp } }),
  signupResend: (email) =>
    request('/auth/signup/resend', { method: 'POST', body: { email } }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  logout: () => {
    localStorage.removeItem('bmv_token');
    localStorage.removeItem('bmv_user');
    window.dispatchEvent(new Event('bmv_auth_change'));
  },
};

// ------------------------------------------------------------
// Users & Roles (Admin)
// ------------------------------------------------------------
export const users = {
  list: () => request('/users'),
  setBlockHead: (userId, { is_block_head, block_id }) =>
    request(`/users/${userId}/block-head`, {
      method: 'PATCH',
      body: { is_block_head, block_id },
    }),
};

// ------------------------------------------------------------
// Blocks & Floors
// ------------------------------------------------------------
export const blocks = {
  list: () => request('/blocks'),
  floors: (blockId) => request(`/blocks/${blockId}/floors`),
};

// ------------------------------------------------------------
// Venues & Amenities
// ------------------------------------------------------------
export const venues = {
  list: ({ block_id, floor_id, type, min_capacity } = {}) =>
    request('/venues', {
      params: { block_id, floor_id, type, min_capacity },
    }),
  get: (id) => request(`/venues/${id}`),
  create: (payload) => request('/venues', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/venues/${id}`, { method: 'PATCH', body: payload }),
  addAmenity: (venueId, amenityId) =>
    request(`/venues/${venueId}/amenities/${amenityId}`, { method: 'POST' }),
  removeAmenity: (venueId, amenityId) =>
    request(`/venues/${venueId}/amenities/${amenityId}`, { method: 'DELETE' }),
};

export const amenities = {
  list: () => request('/amenities'),
  create: (payload) => request('/amenities', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/amenities/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/amenities/${id}`, { method: 'DELETE' }),
};

// ------------------------------------------------------------
// Class Timetable
// ------------------------------------------------------------
export const timetable = {
  list: (venueId) => request('/timetable', { params: { venue_id: venueId } }),
  create: (payload) => request('/timetable', { method: 'POST', body: payload }),
  bulk: (rows) => request('/timetable/bulk', { method: 'POST', body: { rows } }),
  remove: (id) => request(`/timetable/${id}`, { method: 'DELETE' }),
};

// ------------------------------------------------------------
// Bookings & Approvals Workflow
// ------------------------------------------------------------
export const bookings = {
  create: (payload) => request('/bookings', { method: 'POST', body: payload }),
  mine: () => request('/bookings/mine'),
  queue: () => request('/bookings/queue'),
  decide: (id, decision, comment) =>
    request(`/bookings/${id}/decision`, { method: 'POST', body: { decision, comment } }),
  cancel: (id, comment) =>
    request(`/bookings/${id}/cancel`, { method: 'POST', body: { comment } }),
  history: (id) => request(`/bookings/${id}/history`),
};

// ------------------------------------------------------------
// Venue Issue Reports
// ------------------------------------------------------------
export const issues = {
  create: (payload) => request('/issues', { method: 'POST', body: payload }),
  list: ({ status, venue_id } = {}) =>
    request('/issues', { params: { status, venue_id } }),
  resolve: (id) => request(`/issues/${id}/resolve`, { method: 'PATCH' }),
};

// ------------------------------------------------------------
// AI Recommendation Agent
// ------------------------------------------------------------
export const recommend = {
  query: (q) => request('/recommend', { params: { q } }),
};

// ------------------------------------------------------------
// Admin: Security Agent, Digital Twin, What-If
// ------------------------------------------------------------
export const admin = {
  twin: () => request('/admin/twin'),
  whatifVenue: (venueId, date) =>
    request('/admin/whatif/venue', { params: { venue_id: venueId, date } }),
  whatifBlock: (blockId, date) =>
    request('/admin/whatif/block', { params: { block_id: blockId, date } }),
  whatifAmenity: (venueId, amenityId, date) =>
    request('/admin/whatif/amenity', { params: { venue_id: venueId, amenity_id: amenityId, date } }),
  securityFlags: ({ status = 'open', severity, limit } = {}) =>
    request('/admin/security/flags', { params: { status, severity, limit } }),
  securityScan: () => request('/admin/security/scan', { method: 'POST' }),
  updateSecurityFlag: (id, status) =>
    request(`/admin/security/flags/${id}`, { method: 'PATCH', body: { status } }),
};