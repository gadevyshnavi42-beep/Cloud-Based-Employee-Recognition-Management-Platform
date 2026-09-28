/* ===== recognition.js - "Give Recognition" form and the Recognition Feed ===== */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page !== 'give-recognition' && page !== 'recognitions') return;
  if (!requireAuth()) return;
  renderLayout(page);

  if (page === 'give-recognition') initGiveRecognition();
  if (page === 'recognitions') initFeed();
});

/* ---------- Give recognition ---------- */
async function initGiveRecognition() {
  const me = getUser();
  const form = document.getElementById('recognitionForm');

  try {
    const [users, categories] = await Promise.all([apiRequest('/users'), apiRequest('/categories')]);

    // You cannot recognise yourself, and admin accounts are not part of the leaderboard
    const colleagues = users.filter((u) => u._id !== me._id && u.role !== 'admin');
    form.receiver.innerHTML = '<option value="">Select an employee...</option>' +
      colleagues.map((u) => `<option value="${u._id}">${escapeHtml(u.name)} (${escapeHtml(u.department)})</option>`).join('');

    form.category.innerHTML = '<option value="">Select a category...</option>' +
      categories.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  } catch (err) {
    showAlert('alertBox', err.message);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const fd = new FormData();
    ['receiver', 'category', 'title', 'message', 'points'].forEach((f) => fd.append(f, form[f].value.trim()));
    if (form.image.files[0]) fd.append('image', form.image.files[0]);

    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      await apiRequest('/recognitions', { method: 'POST', body: fd });
      showAlert('alertBox', 'Recognition sent! Redirecting to the feed...', 'success');
      setTimeout(() => (window.location.href = 'recognitions.html'), 1200);
    } catch (err) {
      showAlert('alertBox', err.message);
      button.disabled = false;
    }
  });
}

/* ---------- Recognition feed ---------- */
let allRecognitions = [];
const openComments = new Set(); // ids of recognitions whose comments are expanded

async function initFeed() {
  const filter = document.getElementById('categoryFilter');
  const feed = document.getElementById('feed');

  try {
    const categories = await apiRequest('/categories');
    filter.innerHTML = '<option value="">All categories</option>' +
      categories.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    allRecognitions = await apiRequest('/recognitions?limit=100');
    renderFeed();
  } catch (err) {
    showAlert('alertBox', err.message);
    feed.innerHTML = '';
  }

  filter.addEventListener('change', renderFeed);
  feed.addEventListener('click', handleFeedClick);
}

function renderFeed() {
  const category = document.getElementById('categoryFilter').value;
  const list = allRecognitions.filter((r) => !category || r.category === category);
  document.getElementById('feed').innerHTML = list.length
    ? list.map(recognitionCard).join('')
    : '<div class="text-center text-muted py-5">No recognitions to show yet.</div>';
}

function recognitionCard(r) {
  const me = getUser();
  const liked = r.likes.includes(me._id);
  const canDelete = me.role === 'admin' || (r.sender && r.sender._id === me._id);
  const senderName = r.sender ? r.sender.name : 'Unknown';
  const receiverName = r.receiver ? r.receiver.name : 'Unknown';
  const commentsOpen = openComments.has(r._id);

  const commentsHtml = r.comments.map((c) => `
    <div class="d-flex gap-2 mb-2">
      ${avatarHtml(c.user, 28)}
      <div><span class="fw-semibold small">${escapeHtml(c.user ? c.user.name : 'Unknown')}</span>
        <span class="text-muted small">· ${formatDate(c.createdAt)}</span>
        <div class="small">${escapeHtml(c.text)}</div></div>
    </div>`).join('') || '<div class="text-muted small mb-2">No comments yet.</div>';

  return `
    <div class="card rec-card mb-3"><div class="card-body">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div class="d-flex align-items-center gap-2">
          ${avatarHtml(r.sender, 40)}
          <div>
            <div><strong>${escapeHtml(senderName)}</strong> <i class="bi bi-arrow-right arrow"></i> <strong>${escapeHtml(receiverName)}</strong></div>
            <div class="small text-muted">${formatDate(r.createdAt)}</div>
          </div>
        </div>
        <div>
          <span class="badge bg-primary-subtle text-primary-emphasis me-1">${escapeHtml(r.category)}</span>
          <span class="badge bg-warning text-dark">+${r.points} pts</span>
        </div>
      </div>

      <h5 class="mt-3 mb-1">${escapeHtml(r.title)}</h5>
      <p class="mb-2">${escapeHtml(r.message)}</p>
      ${r.image ? `<img class="rec-image mb-2" src="${escapeHtml(imageUrl(r.image))}" alt="Recognition image">` : ''}

      <div class="d-flex align-items-center gap-3 border-top pt-2 mt-2">
        <button class="action-btn ${liked ? 'liked' : ''}" data-action="like" data-id="${r._id}">
          <i class="bi ${liked ? 'bi-heart-fill' : 'bi-heart'}"></i> Like (${r.likes.length})
        </button>
        <button class="action-btn" data-action="toggle-comments" data-id="${r._id}">
          <i class="bi bi-chat"></i> Comment (${r.comments.length})
        </button>
        ${canDelete ? `<button class="action-btn ms-auto text-danger" data-action="delete" data-id="${r._id}"><i class="bi bi-trash"></i> Delete</button>` : ''}
      </div>

      ${commentsOpen ? `
        <div class="comment-box mt-2">
          ${commentsHtml}
          <div class="input-group input-group-sm mt-2">
            <input type="text" class="form-control" id="comment-input-${r._id}" maxlength="500" placeholder="Write a comment...">
            <button class="btn btn-brand" data-action="send-comment" data-id="${r._id}">Send</button>
          </div>
        </div>` : ''}
    </div></div>`;
}

// Replace one recognition in the list after the server returns the updated version
function replaceRecognition(updated) {
  allRecognitions = allRecognitions.map((r) => (r._id === updated._id ? updated : r));
}

async function handleFeedClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;

  try {
    if (btn.dataset.action === 'like') {
      replaceRecognition(await apiRequest(`/recognitions/${id}/like`, { method: 'POST' }));
    } else if (btn.dataset.action === 'toggle-comments') {
      if (openComments.has(id)) openComments.delete(id); else openComments.add(id);
    } else if (btn.dataset.action === 'send-comment') {
      const input = document.getElementById('comment-input-' + id);
      const text = input.value.trim();
      if (!text) return;
      replaceRecognition(await apiRequest(`/recognitions/${id}/comments`, { method: 'POST', body: { text } }));
    } else if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this recognition? The points will be taken back.')) return;
      await apiRequest('/recognitions/' + id, { method: 'DELETE' });
      allRecognitions = allRecognitions.filter((r) => r._id !== id);
    }
    renderFeed();
    loadBell();
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}
