// Thin client for /api/wc-claims used by the Safety workspace pages.
import { getFreshToken } from '../../lib/supabase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

async function authedFetch(url, opts = {}) {
  const token = await getFreshToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch (_) { /* swallow */ }
    throw new Error(msg);
  }
  return res.json();
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export function listClaims(params = {}) {
  return authedFetch(`${BACKEND_URL}/api/wc-claims${buildQuery(params)}`);
}

export function getSummary(params = {}) {
  return authedFetch(`${BACKEND_URL}/api/wc-claims/summary${buildQuery(params)}`);
}

export function getClaim(claimId) {
  return authedFetch(`${BACKEND_URL}/api/wc-claims/${claimId}`);
}

export function createClaim(payload) {
  return authedFetch(`${BACKEND_URL}/api/wc-claims`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateClaim(claimId, payload) {
  return authedFetch(`${BACKEND_URL}/api/wc-claims/${claimId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteClaim(claimId) {
  return authedFetch(`${BACKEND_URL}/api/wc-claims/${claimId}`, {
    method: 'DELETE',
  });
}
