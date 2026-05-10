const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export { API_BASE };
