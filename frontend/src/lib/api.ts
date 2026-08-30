const API_BASE = import.meta.env.VITE_API_URL || '/api';

let backendUnavailable = false;

function emitBackendStatus(type: string, detail?: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, { ...options, headers });
  } catch (error) {
    if (!backendUnavailable) {
      backendUnavailable = true;
      emitBackendStatus('app:backend-unavailable', { url: fullUrl, error });
    }
    const normalized = new Error('Backend indisponible. Vérifiez la connexion réseau.');
    (normalized as Error & { code: string }).code = 'NETWORK_UNAVAILABLE';
    throw normalized;
  }

  if (backendUnavailable) {
    backendUnavailable = false;
    emitBackendStatus('app:backend-restored');
  }

  if (response.status === 401 && window.location.pathname !== '/login') {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
};

export const downloadWithAuth = async (url: string, filename?: string) => {
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw new Error('Download failed');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
};
