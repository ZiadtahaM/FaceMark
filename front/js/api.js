/**
 * FaceMark Unified API Client & Environment Resolver
 * Automatically routes network requests to local backend or production cloud without hardcoding.
 * Provides XSS escaping, safe fetch wrapper, and session lifecycle guards.
 */
(function () {
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '';

  // Configurable fallback: Can be overridden by setting window.FACEMARK_API_URL
  const DEV_BASE_URL = 'http://localhost:3001/api/v1';
  const PROD_BASE_URL = window.FACEMARK_API_URL || 'https://facemark-api.onrender.com/api/v1';

  const API_BASE_URL = window.FACEMARK_API_URL || (isLocal ? DEV_BASE_URL : PROD_BASE_URL);

  window.FACEMARK_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    isLocal: isLocal,
  };

  // Global backward-compatible alias
  window.API_BASE_URL = API_BASE_URL;

  window.getAuthToken = function () {
    return localStorage.getItem('token') || '';
  };

  window.getAuthHeaders = function () {
    const token = window.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  /**
   * Safe HTML Escaper to prevent DOM-based XSS attacks when rendering tables/lists.
   */
  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  /**
   * Resilient Authenticated Fetch Wrapper
   * Automatically prefixes base URL, adds Bearer headers, and handles expired JWTs (401).
   */
  window.authFetch = async function (endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${window.FACEMARK_CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      ...window.getAuthHeaders(),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        console.warn('[FaceMark Auth] Session expired or invalid token (401). Redirecting to login.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('Sign%20in')) {
          const depth = (window.location.pathname.match(/\//g) || []).length;
          const loginRelPath = window.location.pathname.includes('/Staff/') || window.location.pathname.includes('/Student/') || window.location.pathname.includes('/Admin/') 
            ? '../Sign in/index.html' 
            : 'Sign in/index.html';
          window.location.href = loginRelPath;
        }
      }
      return response;
    } catch (err) {
      console.error(`[FaceMark API Error] Network error on ${url}:`, err);
      throw err;
    }
  };

  window.FaceMarkAPI = {
    config: window.FACEMARK_CONFIG,
    authFetch: window.authFetch,
    escapeHtml: window.escapeHtml,
    getToken: window.getAuthToken,
    getHeaders: window.getAuthHeaders,
  };

  console.log('[FaceMark] Unified API client initialized with URL:', window.FACEMARK_CONFIG.API_BASE_URL);
})();
