/**
 * FaceMark Unified API Client, Environment Resolver & Toast System
 * Automatically routes network requests to local backend or production cloud without hardcoding.
 * Provides XSS escaping, safe fetch wrapper, session lifecycle guards, and luxury glass toast engine.
 */
(function () {
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '';

  const DEV_BASE_URL = 'http://localhost:3001/api/v1';
  const PROD_BASE_URL = window.FACEMARK_API_URL || 'https://facemark-api.onrender.com/api/v1';
  const API_BASE_URL = window.FACEMARK_API_URL || (isLocal ? DEV_BASE_URL : PROD_BASE_URL);

  window.FACEMARK_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    AI_SERVICE_URL: isLocal ? 'http://localhost:8000' : 'https://ziadtaham-facemark-ai.hf.space',
    isLocal: isLocal,
  };

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

  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  window.authFetch = async function (endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${window.FACEMARK_CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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
        if (!window.location.pathname.includes('Sign%20in') && !window.location.pathname.includes('sign in')) {
          window.location.href = '../Sign in/index.html';
        }
      }
      return response;
    } catch (err) {
      console.error(`[FaceMark API Error] Network error on ${url}:`, err);
      throw err;
    }
  };

  // Luxury Glass Toast System
  const Toast = {
    _container: null,
    _init() {
      if (this._container) return;
      this._container = document.createElement('div');
      this._container.id = 'facemark-toast-container';
      this._container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 420px;
        pointer-events: none;
      `;
      document.body.appendChild(this._container);

      // Inject styling for toast animations
      if (!document.getElementById('facemark-toast-style')) {
        const style = document.createElement('style');
        style.id = 'facemark-toast-style';
        style.textContent = `
          @keyframes toastSlideIn {
            from { transform: translateX(120%) scale(0.9); opacity: 0; }
            to { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes toastSlideOut {
            from { transform: translateX(0) scale(1); opacity: 1; }
            to { transform: translateX(120%) scale(0.9); opacity: 0; }
          }
          @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
          .fm-toast {
            pointer-events: auto;
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            padding: 14px 18px;
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 20px 0 rgba(99, 102, 241, 0.15);
            display: flex;
            align-items: flex-start;
            gap: 14px;
            color: #f8fafc;
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
            animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            position: relative;
            overflow: hidden;
          }
          .fm-toast.out {
            animation: toastSlideOut 0.3s cubic-bezier(0.7, 0, 0.84, 0) forwards;
          }
          .fm-toast-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
            margin-top: 2px;
          }
          .fm-toast-content {
            flex: 1;
          }
          .fm-toast-title {
            font-size: 0.875rem;
            font-weight: 700;
            margin-bottom: 2px;
            letter-spacing: 0.01em;
          }
          .fm-toast-msg {
            font-size: 0.8125rem;
            color: #cbd5e1;
            line-height: 1.4;
          }
          .fm-toast-close {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 0;
            font-size: 1.1rem;
            line-height: 1;
            transition: color 0.15s;
          }
          .fm-toast-close:hover {
            color: #ffffff;
          }
          .fm-toast-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: #6366f1;
            animation: toastProgress linear forwards;
          }
          .fm-toast-success .fm-toast-icon { color: #10b981; }
          .fm-toast-success .fm-toast-bar { background: #10b981; }
          .fm-toast-error .fm-toast-icon { color: #f43f5e; }
          .fm-toast-error .fm-toast-bar { background: #f43f5e; }
          .fm-toast-info .fm-toast-icon { color: #38bdf8; }
          .fm-toast-info .fm-toast-bar { background: #38bdf8; }
          .fm-toast-warning .fm-toast-icon { color: #f59e0b; }
          .fm-toast-warning .fm-toast-bar { background: #f59e0b; }
        `;
        document.head.appendChild(style);
      }
    },
    show(message, type = 'info', title = null, duration = 4000) {
      this._init();
      const toast = document.createElement('div');
      toast.className = `fm-toast fm-toast-${type}`;

      const iconMap = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠',
      };

      const titleMap = {
        success: title || 'Success',
        error: title || 'Error',
        info: title || 'Notice',
        warning: title || 'Warning',
      };

      toast.innerHTML = `
        <div class="fm-toast-icon">${iconMap[type] || 'ℹ'}</div>
        <div class="fm-toast-content">
          <div class="fm-toast-title">${window.escapeHtml(titleMap[type])}</div>
          <div class="fm-toast-msg">${window.escapeHtml(message)}</div>
        </div>
        <button class="fm-toast-close" aria-label="Close">&times;</button>
        <div class="fm-toast-bar" style="animation-duration: ${duration}ms;"></div>
      `;

      const remove = () => {
        toast.classList.add('out');
        setTimeout(() => {
          if (toast.parentElement) toast.remove();
        }, 300);
      };

      toast.querySelector('.fm-toast-close').addEventListener('click', remove);
      const timer = setTimeout(remove, duration);

      this._container.appendChild(toast);
    },
    success(msg, title, duration) { this.show(msg, 'success', title, duration); },
    error(msg, title, duration) { this.show(msg, 'error', title, duration); },
    info(msg, title, duration) { this.show(msg, 'info', title, duration); },
    warning(msg, title, duration) { this.show(msg, 'warning', title, duration); }
  };

  window.FaceMarkToast = Toast;
  window.Toast = Toast;

  window.FaceMarkAPI = {
    config: window.FACEMARK_CONFIG,
    authFetch: window.authFetch,
    escapeHtml: window.escapeHtml,
    getToken: window.getAuthToken,
    getHeaders: window.getAuthHeaders,
    toast: Toast,
  };

  console.log('[FaceMark] Unified API & Toast client initialized. Base URL:', window.FACEMARK_CONFIG.API_BASE_URL);
})();
