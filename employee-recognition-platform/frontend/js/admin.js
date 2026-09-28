/* ===== admin.js - Admin / Manager panel =====
   Admin  : full control (add/edit/delete employees, delete recognitions, manage categories)
   Manager: read-only view of statistics, employees and recognitions */
let isAdmin = false;
let categoryChart = null;
let topChart = null;
const CHART_COLORS = ['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth(['admin', 'manager'])) return;
  renderLayout('admin');
  isAdmin = getUser().role === 'admin';

  // Managers cannot see edit/delete controls
  if (!isAdmin) document.querySelectorAll('.admin-only').forEach((el) => el.classList.add('d-none'));

  document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());
  document.getElementById('userForm').addEventListener('submit', saveUser);
  document.getElementById('categoryForm').addEventListener('submit', saveCategory);
  document.getElementById('cancelCategoryEdit').addEventListener('click', resetCategoryForm);

  document.getElementById('usersBody').addEventListener('click', handleUserClick);
  document.getElementById('recognitionsBody').addEventListener('click', handleRecognitionClick);
  document.getElementById('categoriesBody').addEventListener('click', handleCategoryClick);

  loadOverview();
  loadUsers();
  loadRecognitions();
  loadCategories();
});

const adminCell = (html) => `<td class="admin-only ${isAdmin ? '' : 'd-none'}">${html}</td>`;

/* ---------- Overview + charts ---------- */
async function loadOverview() {
  try {
    const [stats, dash, board] = await Promise.all([
      apiRequest('/admin/statistics'),
      apiRequest('/admin/dashboard'),
      apiRequest('/leaderboard')
    ]);

    setText('sEmployees', stats.totalEmployees);
    setText('sRecognitions', stats.totalRecognitions);
    setText('sPoints', stats.totalPoints);
    setText('sTop', stats.mostRecognized ? stats.mostRecognized.user.name : 'No data yet');
    setText('sTopSub', stats.mostRecognized ? stats.mostRecognized.count + ' recognitions' : '');

    document.getElementById('recentBody').innerHTML = dash.recentRecognitions.length
      ? dash.recentRecognitions.map((r) => `
          <tr>
            <td>${formatDate(r.createdAt)}</td>
            <td>${escapeHtml(r.sender ? r.sender.name : '-')} → ${escapeHtml(r.receiver ? r.receiver.name : '-')}</td>
            <td>${escapeHtml(r.title)}</td>
            <td><span class="badge bg-warning text-dark">+${r.points}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="text-muted text-center">No recognitions yet.</td></tr>';

    drawCharts(stats, board);
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

function drawCharts(stats, board) {
  if (typeof Chart === 'undefined') {
    showAlert('alertBox', 'Charts could not load (Chart.js needs an internet connection).', 'warning');
    return;
  }
  if (categoryChart) categoryChart.destroy();
  if (topChart) topChart.destroy();

  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: stats.byCategory.map((c) => c.category),
      datasets: [{ data: stats.byCategory.map((c) => c.count), backgroundColor: CHART_COLORS }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });

  const top = board.slice(0, 5);
  topChart = new Chart(document.getElementById('topChart'), {
    type: 'bar',
    data: {
      labels: top.map((u) => u.name),
      datasets: [{ label: 'Points', data: top.map((u) => u.recognitionPoints), backgroundColor: '#4f46e5' }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

/* ---------- Employees ---------- */
let usersCache = [];

async function loadUsers() {
  try {
    usersCache = await apiRequest('/users');
    document.getElementById('usersBody').innerHTML = usersCache.map((u) => `
      <tr>
        <td>${escapeHtml(u.employeeId)}</td>
        <td><div class="d-flex align-items-center gap-2">${avatarHtml(u, 32)}${escapeHtml(u.name)}</div></td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.department)}</td>
        <td><span class="badge bg-secondary text-capitalize">${escapeHtml(u.role)}</span></td>
        <td>${u.recognitionPoints}</td>
        ${adminCell(`
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${u._id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${u._id}"><i class="bi bi-trash"></i></button>`)}
      </tr>`).join('');
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

function openUserModal(user) {
  const form = document.getElementById('userForm');
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('userAlert').innerHTML = '';
  form.userId.value = user ? user._id : '';
  document.getElementById('userModalTitle').textContent = user ? 'Edit employee' : 'Add employee';

  // Password is required only when adding
  form.password.required = !user;
  document.getElementById('passwordHint').textContent = user ? '(leave blank to keep current)' : '';

  if (user) {
    form.name.value = user.name;
    form.email.value = user.email;
    form.employeeId.value = user.employeeId;
    form.department.value = user.department;
    form.role.value = user.role;
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('userModal')).show();
}

async function saveUser(e) {
  e.preventDefault();
  const form = e.target;
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const id = form.userId.value;
  const body = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    employeeId: form.employeeId.value.trim(),
    department: form.department.value.trim(),
    role: form.role.value
  };
  if (form.password.value) body.password = form.password.value;

  try {
    await apiRequest(id ? '/users/' + id : '/users', { method: id ? 'PUT' : 'POST', body });
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    loadUsers();
    loadOverview();
  } catch (err) {
    showAlert('userAlert', err.message);
  }
}

async function handleUserClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const user = usersCache.find((u) => u._id === btn.dataset.id);
  if (!user) return;

  if (btn.dataset.action === 'edit') return openUserModal(user);

  if (btn.dataset.action === 'delete') {
    if (!confirm(`Delete ${user.name}? Their recognitions will be removed too.`)) return;
    try {
      await apiRequest('/users/' + user._id, { method: 'DELETE' });
      loadUsers(); loadRecognitions(); loadOverview();
    } catch (err) {
      showAlert('alertBox', err.message);
    }
  }
}

/* ---------- Recognitions ---------- */
async function loadRecognitions() {
  try {
    const list = await apiRequest('/recognitions?limit=200');
    document.getElementById('recognitionsBody').innerHTML = list.length
      ? list.map((r) => `
          <tr>
            <td>${formatDate(r.createdAt)}</td>
            <td>${escapeHtml(r.sender ? r.sender.name : '-')}</td>
            <td>${escapeHtml(r.receiver ? r.receiver.name : '-')}</td>
            <td>${escapeHtml(r.category)}</td>
            <td>${escapeHtml(r.title)}</td>
            <td>${r.points}</td>
            ${adminCell(`<button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${r._id}"><i class="bi bi-trash"></i></button>`)}
          </tr>`).join('')
      : '<tr><td colspan="7" class="text-center text-muted">No recognitions yet.</td></tr>';
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

async function handleRecognitionClick(e) {
  const btn = e.target.closest('[data-action="delete"]');
  if (!btn) return;
  if (!confirm('Delete this recognition? The points will be taken back.')) return;
  try {
    await apiRequest('/recognitions/' + btn.dataset.id, { method: 'DELETE' });
    loadRecognitions(); loadUsers(); loadOverview();
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

/* ---------- Categories ---------- */
let categoriesCache = [];

async function loadCategories() {
  try {
    categoriesCache = await apiRequest('/categories');
    document.getElementById('categoriesBody').innerHTML = categoriesCache.map((c) => `
      <tr>
        <td class="fw-semibold">${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.description)}</td>
        ${adminCell(`
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${c._id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${c._id}"><i class="bi bi-trash"></i></button>`)}
      </tr>`).join('') || '<tr><td colspan="3" class="text-center text-muted">No categories.</td></tr>';
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

function resetCategoryForm() {
  const form = document.getElementById('categoryForm');
  form.reset();
  form.classList.remove('was-validated');
  form.categoryId.value = '';
  document.getElementById('categoryFormTitle').textContent = 'Add category';
  document.getElementById('cancelCategoryEdit').classList.add('d-none');
}

async function saveCategory(e) {
  e.preventDefault();
  const form = e.target;
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const id = form.categoryId.value;
  const body = { name: form.categoryName.value.trim(), description: form.categoryDescription.value.trim() };
  try {
    await apiRequest(id ? '/admin/categories/' + id : '/admin/categories', { method: id ? 'PUT' : 'POST', body });
    resetCategoryForm();
    loadCategories();
    loadRecognitions();
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

async function handleCategoryClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const category = categoriesCache.find((c) => c._id === btn.dataset.id);
  if (!category) return;

  if (btn.dataset.action === 'edit') {
    const form = document.getElementById('categoryForm');
    form.categoryId.value = category._id;
    form.categoryName.value = category.name;
    form.categoryDescription.value = category.description;
    document.getElementById('categoryFormTitle').textContent = 'Edit category';
    document.getElementById('cancelCategoryEdit').classList.remove('d-none');
  } else if (btn.dataset.action === 'delete') {
    if (!confirm(`Delete the category "${category.name}"? Existing recognitions keep their category name.`)) return;
    try {
      await apiRequest('/admin/categories/' + category._id, { method: 'DELETE' });
      loadCategories();
    } catch (err) {
      showAlert('alertBox', err.message);
    }
  }
}
