const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
if (import.meta.env.PROD && !/^https?:\/\/.+/i.test(configuredApiBaseUrl || '')) {
  throw new Error('VITE_API_BASE_URL must be set to the deployed backend API URL, including /api.');
}

const apiBaseUrl = (configuredApiBaseUrl || '/api').replace(/\/+$/, '');
const tokenKeys = ['grievease.accessToken'];

export function getStoredAuthToken() {
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (token) return token;
  }
  return null;
}

export function saveAuthToken(token, remember) {
  clearAuthToken();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(tokenKeys[0], token);
}

export function clearAuthToken() {
  for (const key of tokenKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

function resolveUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/api/')) {
    return `${apiBaseUrl.replace(/\/api$/, '')}${path}`;
  }
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function request(path, options = {}) {
  const { body, headers = {}, ...rest } = options;
  const requestHeaders = new Headers(headers);
  const token = getStoredAuthToken();
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(resolveUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: requestBody
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = await response.json();
      if (typeof payload.error === 'string') message = payload.error;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }
  return response;
}

export async function apiRequest(path, options) {
  const response = await request(path, options);
  if (response.status === 204) return null;
  return response.json();
}

export async function downloadFile(path, filename) {
  const response = await request(path);
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
