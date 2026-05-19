const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function headers() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data as T;
}

export const api = {
  get:    <T>(p: string)              => req<T>('GET',    p),
  post:   <T>(p: string, b: unknown)  => req<T>('POST',   p, b),
  put:    <T>(p: string, b: unknown)  => req<T>('PUT',    p, b),
  patch:  <T>(p: string, b: unknown)  => req<T>('PATCH',  p, b),
  delete: <T>(p: string)              => req<T>('DELETE', p),
};
