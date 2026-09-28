/* ===== dashboard.js - dashboard, leaderboard and profile pages ===== */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (!['dashboard', 'leaderboard', 'profile'].includes(page)) return;
  if (!requireAuth()) return;
  renderLayout(page);

  if (page === 'dashboard') initDashboard();
  if (page === 'leaderboard') initLeaderboard();
  if (page === 'profile') initProfile();
});

/* One recognition as a compact list row */
function compactRecognition(r) {
  const senderName = r.sender ? r.sender.name : 'Unknown';
  return `
    <div class="d-flex gap-3 py-3 border-bottom">
      ${avatarHtml(r.sender, 40)}
      <div class="flex-grow-1">
        <div class="d-flex justify-content-between flex-wrap gap-1">
          <strong>${escapeHtml(r.title)}</strong>
          <span class="badge bg-warning text-dark">+${r.points} pts</span>
        </div>
        <div class="small text-muted">From ${escapeHtml(senderName)} · ${escapeHtml(r.category)} · ${formatDate(r.createdAt)}</div>
        <div class="mt-1">${escapeHtml(r.message)}</div>
      </div>
    </div>`;
}

function achievementsHtml(list) {
  if (!list.length) return '<p class="text-muted mb-0">No achievements yet - keep going!</p>';
  return list.map((a) => `
    <div class="d-flex align-items-center gap-3 p-2 border rounded mb-2">
      <i class="bi ${escapeHtml(a.icon)} fs-3 text-warning"></i>
      <div><div class="fw-semibold">${escapeHtml(a.title)}</div>
      <small class="text-muted">${escapeHtml(a.description)}</small></div>
    </div>`).join('');
}

/* ---------- Dashboard ---------- */
async function initDashboard() {
  const me = getUser();
  try {
    const [profile, recs, notes] = await Promise.all([
      apiRequest('/users/' + me._id),
      apiRequest('/recognitions?receiver=' + me._id + '&limit=5'),
      apiRequest('/notifications')
    ]);

    saveAuth(getToken(), profile.user); // keep stored user fresh

    setText('welcomeName', profile.user.name);
    setText('deptText', profile.user.department + ' · ' + profile.user.employeeId);
    setText('statCount', profile.recognitionCount);
    setText('statPoints', profile.user.recognitionPoints);
    setText('statGiven', profile.givenCount);
    setText('statAchievements', profile.achievements.length);

    document.getElementById('recentList').innerHTML = recs.length
      ? recs.map(compactRecognition).join('')
      : '<p class="text-muted my-3">You have not received any recognition yet.</p>';

    document.getElementById('achievementList').innerHTML = achievementsHtml(profile.achievements);

    renderDashboardNotifications(notes);
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

function renderDashboardNotifications(notes) {
  const box = document.getElementById('notificationList');
  box.innerHTML = notes.length
    ? notes.slice(0, 8).map((n) => `
        <div class="p-2 border-bottom small ${n.isRead ? '' : 'notif-unread'}" role="button" data-id="${n._id}">
          <i class="bi ${NOTIFICATION_ICONS[n.type] || 'bi-bell'} me-1"></i>${escapeHtml(n.message)}
          <div class="text-muted">${formatDate(n.createdAt)}</div>
        </div>`).join('')
    : '<p class="text-muted my-3">No notifications yet.</p>';

  // Click a notification to mark it as read
  box.querySelectorAll('[data-id]').forEach((el) => {
    el.addEventListener('click', async () => {
      try {
        await apiRequest('/notifications/' + el.dataset.id + '/read', { method: 'PUT' });
        el.classList.remove('notif-unread');
        loadBell();
      } catch (e) { /* ignore */ }
    });
  });
}

/* ---------- Leaderboard ---------- */
async function initLeaderboard() {
  const me = getUser();
  const body = document.getElementById('leaderboardBody');
  try {
    const rows = await apiRequest('/leaderboard');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No employees yet.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((u) => `
      <tr class="${u._id === me._id ? 'me-row' : ''}">
        <td><span class="rank-badge ${u.rank <= 3 ? 'rank-' + u.rank : ''}">${u.rank}</span></td>
        <td>
          <a class="text-decoration-none text-dark d-flex align-items-center gap-2" href="profile.html?id=${u._id}">
            ${avatarHtml(u, 36)}<span class="fw-semibold">${escapeHtml(u.name)}</span>
          </a>
        </td>
        <td>${escapeHtml(u.department)}</td>
        <td><span class="badge bg-warning text-dark">${u.recognitionPoints} pts</span></td>
        <td>${u.recognitionCount}</td>
      </tr>`).join('');
  } catch (err) {
    showAlert('alertBox', err.message);
    body.innerHTML = '';
  }
}

/* ---------- Profile ---------- */
async function initProfile() {
  const me = getUser();
  const profileId = new URLSearchParams(window.location.search).get('id') || me._id;
  const isOwn = profileId === me._id;

  try {
    const [profile, history] = await Promise.all([
      apiRequest('/users/' + profileId),
      apiRequest('/recognitions?receiver=' + profileId + '&limit=100')
    ]);
    const u = profile.user;

    document.getElementById('profileContent').innerHTML = `
      <div class="card mb-4"><div class="card-body">
        <div class="d-flex flex-column flex-md-row align-items-md-center gap-4">
          ${avatarHtml(u, 96)}
          <div class="flex-grow-1">
            <h3 class="mb-1">${escapeHtml(u.name)}</h3>
            <div class="text-muted">Employee ID: ${escapeHtml(u.employeeId)} · ${escapeHtml(u.department)}</div>
            <div class="text-muted">${escapeHtml(u.email)}</div>
            <span class="badge bg-secondary text-capitalize mt-2">${escapeHtml(u.role)}</span>
          </div>
          ${isOwn ? '<button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#editProfileModal"><i class="bi bi-pencil me-1"></i>Edit Profile</button>' : ''}
        </div>
        <div class="row text-center mt-4 g-3">
          <div class="col-6 col-md-3"><div class="stat-value">${u.recognitionPoints}</div><div class="text-muted small">Total points</div></div>
          <div class="col-6 col-md-3"><div class="stat-value">${profile.recognitionCount}</div><div class="text-muted small">Recognitions received</div></div>
          <div class="col-6 col-md-3"><div class="stat-value">${profile.givenCount}</div><div class="text-muted small">Recognitions given</div></div>
          <div class="col-6 col-md-3"><div class="stat-value">${profile.achievements.length}</div><div class="text-muted small">Achievements</div></div>
        </div>
      </div></div>

      <div class="row g-4">
        <div class="col-lg-4"><div class="card"><div class="card-header">Achievements</div>
          <div class="card-body">${achievementsHtml(profile.achievements)}</div></div></div>
        <div class="col-lg-8"><div class="card"><div class="card-header">Recognition history</div>
          <div class="card-body pt-0">${history.length ? history.map(compactRecognition).join('') : '<p class="text-muted my-3">No recognitions yet.</p>'}</div></div></div>
      </div>`;

    if (isOwn) setupEditProfile(u);
  } catch (err) {
    document.getElementById('profileContent').innerHTML = '';
    showAlert('alertBox', err.message);
  }
}

function setupEditProfile(user) {
  const form = document.getElementById('editProfileForm');
  form.name.value = user.name;
  form.department.value = user.department;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const fd = new FormData();
    fd.append('name', form.name.value.trim());
    fd.append('department', form.department.value.trim());
    if (form.password.value) fd.append('password', form.password.value);
    if (form.profileImage.files[0]) fd.append('profileImage', form.profileImage.files[0]);

    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      const updated = await apiRequest('/users/' + user._id, { method: 'PUT', body: fd });
      saveAuth(getToken(), updated);
      window.location.reload();
    } catch (err) {
      showAlert('editAlert', err.message);
      button.disabled = false;
    }
  });
}
