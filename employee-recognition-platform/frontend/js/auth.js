/* ===== auth.js - login and register forms ===== */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Already logged in? Go straight to the dashboard.
  if ((loginForm || registerForm) && getToken() && getUser()) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: form.email.value.trim(), password: form.password.value }
    });
    saveAuth(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('alertBox', err.message);
    button.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;

  // Confirm-password check
  form.confirmPassword.setCustomValidity(
    form.password.value === form.confirmPassword.value ? '' : 'Passwords do not match'
  );
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
        department: form.department.value.trim(),
        employeeId: form.employeeId.value.trim()
      }
    });
    saveAuth(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('alertBox', err.message);
    button.disabled = false;
  }
}
