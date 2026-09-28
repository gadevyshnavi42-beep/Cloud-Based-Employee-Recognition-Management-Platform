/* ===== api.js - shared helpers used by every page =====
   - talks to the backend (apiRequest)
   - stores the login (token + user) in localStorage
   - builds the navbar / sidebar for logged-in pages
*/

// If the page is opened from the backend (port 5000) use relative URLs,
// otherwise (e.g. VS Code Live Server) call the backend directly.
const BACKEND = window.location.port === '5000' ? '' : 'http://localhost:5000';
const API_BASE = BACKEND + '/api';

/* ---------- Login storage ---------- */
function getToken() { return localStorage.getItem('token'); }

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; }
}

function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

/* Redirect to login if not logged in. Pass roles (e.g. ['admin']) to restrict a page.
   Returns true when the visitor may stay on the page. */
function requireAuth(roles) {
  const user = getUser();
  if (!getToken() || !user) {
    window.location.href = 'login.html';
    return false;
  }
  if (roles && !roles.includes(user.role)) {
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

/* ---------- API calls ---------- */
async function apiRequest(path, options = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  let body = options.body;
  // FormData (file uploads) sets its own Content-Type; plain objects are sent as JSON
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API_BASE + path, { method: options.method || 'GET', headers, body });
  } catch (e) {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }

  if (!res.ok) {
    // Token expired or invalid -> back to login (but not for the login form itself)
    if (res.status === 401 && token && !path.startsWith('/auth')) logout();
    throw new Error((data && data.message) || 'Something went wrong');
  }
  return data;
}

/* ---------- Small UI helpers ---------- */
function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(date) {
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function imageUrl(path) { return path ? BACKEND + path : ''; }

function avatarHtml(user, size = 40) {
  const style = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px;`;
  if (user && user.profileImage) {
    return `<img class="avatar" style="${style}" src="${escapeHtml(imageUrl(user.profileImage))}" alt="">`;
  }
  const initials = user && user.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return `<span class="avatar" style="${style}">${escapeHtml(initials)}</span>`;
}

// Shows a Bootstrap alert inside the element with the given id
function showAlert(targetId, message, type = 'danger') {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ---------- Layout (navbar + sidebar) ---------- */
const NAV_ITEMS = [
  { page: 'dashboard', href: 'dashboard.html', label: 'Dashboard', icon: 'bi-speedometer2' },
  { page: 'give-recognition', href: 'give-recognition.html', label: 'Give Recognition', icon: 'bi-award' },
  { page: 'recognitions', href: 'recognitions.html', label: 'Recognition Feed', icon: 'bi-chat-heart' },
  { page: 'leaderboard', href: 'leaderboard.html', label: 'Leaderboard', icon: 'bi-trophy' },
  { page: 'profile', href: 'profile.html', label: 'My Profile', icon: 'bi-person-circle' },
  { page: 'admin', href: 'admin.html', label: 'Admin Panel', icon: 'bi-gear', roles: ['admin', 'manager'] }
];

function navLinksHtml(active) {
  const user = getUser();
  return NAV_ITEMS
    .filter((item) => !item.roles || item.roles.includes(user.role))
    .map((item) => `<a class="nav-link ${item.page === active ? 'active' : ''}" href="${item.href}">
        <i class="bi ${item.icon} me-2"></i>${item.label}</a>`)
    .join('');
}

function renderLayout(active) {
  const user = getUser();
  const links = navLinksHtml(active);

  document.getElementById('navbar-container').innerHTML = `
    <nav class="navbar top-navbar navbar-dark sticky-top px-3">
      <div class="d-flex align-items-center">
        <button class="btn btn-outline-light btn-sm d-md-none me-2" type="button"
                data-bs-toggle="offcanvas" data-bs-target="#mobileMenu" aria-label="Open menu">
          <i class="bi bi-list"></i>
        </button>
        <a class="navbar-brand fw-semibold" href="dashboard.html">
          <i class="bi bi-trophy-fill me-2"></i>RecognitionHub
        </a>
      </div>
      <div class="d-flex align-items-center gap-3">
        <div class="dropdown">
          <button class="btn btn-outline-light btn-sm position-relative" data-bs-toggle="dropdown"
                  data-bs-auto-close="outside" aria-label="Notifications">
            <i class="bi bi-bell"></i>
            <span id="bellBadge" class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle d-none">0</span>
          </button>
          <div class="dropdown-menu dropdown-menu-end p-0 bell-menu">
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
              <strong class="small">Notifications</strong>
              <button id="markAllRead" class="btn btn-link btn-sm p-0">Mark all read</button>
            </div>
            <div id="bellList"><div class="p-3 text-muted small">Loading...</div></div>
          </div>
        </div>
        <span class="text-white d-none d-sm-inline">${escapeHtml(user.name)}</span>
        <button id="logoutBtn" class="btn btn-sm btn-light">Logout</button>
      </div>
    </nav>

    <div class="offcanvas offcanvas-start" tabindex="-1" id="mobileMenu">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">Menu</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
      </div>
      <div class="offcanvas-body"><nav class="nav flex-column">${links}</nav></div>
    </div>`;

  const sidebar = document.getElementById('sidebar-container');
  if (sidebar) sidebar.innerHTML = `<nav class="nav flex-column">${links}</nav>`;

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('markAllRead').addEventListener('click', async () => {
    try { await apiRequest('/notifications/read-all', { method: 'PUT' }); loadBell(); } catch (e) { /* ignore */ }
  });
  loadBell();
}

/* ---------- Notifications ---------- */
const NOTIFICATION_ICONS = {
  recognition: 'bi-award text-primary',
  points: 'bi-coin text-warning',
  comment: 'bi-chat-dots text-success',
  like: 'bi-heart-fill text-danger'
};

async function loadBell() {
  const list = document.getElementById('bellList');
  const badge = document.getElementById('bellBadge');
  if (!list) return;
  try {
    const notes = await apiRequest('/notifications');
    const unread = notes.filter((n) => !n.isRead).length;
    badge.textContent = unread > 99 ? '99+' : unread;
    badge.classList.toggle('d-none', unread === 0);

    list.innerHTML = notes.length
      ? notes.slice(0, 8).map((n) => `
          <div class="p-2 border-bottom small ${n.isRead ? '' : 'notif-unread'}">
            <i class="bi ${NOTIFICATION_ICONS[n.type] || 'bi-bell'} me-1"></i>${escapeHtml(n.message)}
            <div class="text-muted">${formatDate(n.createdAt)}</div>
          </div>`).join('')
      : '<div class="p-3 text-muted small">No notifications yet.</div>';
  } catch (e) {
    list.innerHTML = '<div class="p-3 text-danger small">Could not load notifications.</div>';
  }
}
