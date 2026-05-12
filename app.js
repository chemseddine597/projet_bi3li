// =============================================
//  Bi3li — App.js (Fixed)
//  FIX BUG #4  — all DB calls converted to async/await
//  FIX BUG #6  — login delegates to server (no plain-text password compare)
//  FIX BUG #9  — uses snake_case field names returned by MySQL
// =============================================

// ---- STATE ----
let currentUser  = null;
let currentRoute = null;
let likedIds     = new Set();

// ---- PAGINATION STATE ----
const pagination = { products: { page: 1, perPage: 6 }, users: { page: 1, perPage: 8 } };

// ---- NAV CONFIG PER ROLE ----
const navConfig = {
  admin: [
    { section: "Overview" },
    { id: "store",     icon: "🏪", label: "Store Dashboard" },
    { section: "Manage" },
    { id: "products",  icon: "📦", label: "Products" },
    { id: "users",     icon: "👥", label: "All Users" },
    { section: "Storefront" },
    { id: "storefront", icon: "🌐", label: "View Store" },
  ],
  seller: [
    { section: "My Account" },
    { id: "seller-profile",  icon: "👤", label: "My Profile" },
    { id: "seller-listings", icon: "📦", label: "My Listings" },
    { id: "seller-add",      icon: "➕", label: "Add New Item" },
    { section: "Marketplace" },
    { id: "storefront", icon: "🌐", label: "Browse Store" },
  ],
  buyer: [
    { section: "My Account" },
    { id: "buyer-profile",   icon: "👤", label: "My Profile" },
    { id: "buyer-purchases", icon: "🧾", label: "My Purchases" },
    { id: "buyer-wishlist",  icon: "❤️",  label: "Wishlist" },
    { section: "Marketplace" },
    { id: "storefront", icon: "🌐", label: "Browse Store" },
  ],
};

// =============================================
//  HELPERS
// =============================================
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// =============================================
//  FORM VALIDATION
// =============================================
function showFieldError(inputEl, msg) {
  clearFieldError(inputEl);
  inputEl.style.borderColor = 'var(--red)';
  inputEl.style.boxShadow   = '0 0 0 3px rgba(229,57,53,0.15)';
  const err = document.createElement('div');
  err.className = 'field-error';
  err.style.cssText = 'color:#e53935;font-size:12px;margin-top:4px;font-weight:500;';
  err.textContent = msg;
  inputEl.parentNode.appendChild(err);
}

function clearFieldError(inputEl) {
  inputEl.style.borderColor = '';
  inputEl.style.boxShadow   = '';
  const prev = inputEl.parentNode.querySelector('.field-error');
  if (prev) prev.remove();
}

function clearAllErrors(form) {
  form.querySelectorAll('.field-error').forEach(e => e.remove());
  form.querySelectorAll('input,select,textarea').forEach(el => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  });
}

function validateRequired(form) {
  let valid = true;
  form.querySelectorAll('[required]').forEach(el => {
    clearFieldError(el);
    if (!el.value.trim()) {
      showFieldError(el, 'This field is required.');
      valid = false;
    }
  });
  return valid;
}

// =============================================
//  AUTH
//  FIX BUG #4 — initAuth is now async; all DB calls await-ed
// =============================================
async function initAuth() {
  await DB.init();

  const sess = DB.getSession();
  if (sess && sess.user) {
    currentUser = sess.user;
    showApp();
    return;
  }

  renderAuthPage('login');
}

function renderAuthPage(mode) {
  document.getElementById('authGate').classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');

  const card = document.getElementById('authCard');

  if (mode === 'login') {
    card.innerHTML = `
      <div class="auth-logo">
        <span class="logo-icon"><img src="LOGOBI3.png" alt="Bi3li Logo" style="width:100%;height:auto;"/></span>
      </div>
      <h2 class="auth-title">Welcome back</h2>
      <p class="auth-sub">Sign in to your account</p>

      <div class="auth-roles" id="authRoles">
        <button class="role-btn selected" data-email="admin@minimarket.io" data-role="admin">
          <span class="role-emoji">🏪</span>
          <span class="role-label">Admin</span>
          <span class="role-desc">Full access</span>
        </button>
        <button class="role-btn" data-email="seller@minimarket.io" data-role="seller">
          <span class="role-emoji">🛍️</span>
          <span class="role-label">Seller</span>
          <span class="role-desc">Manage listings</span>
        </button>
        <button class="role-btn" data-email="buyer@minimarket.io" data-role="buyer">
          <span class="role-emoji">🛒</span>
          <span class="role-label">Buyer</span>
          <span class="role-desc">Browse & buy</span>
        </button>
      </div>

      <div class="auth-divider"><span>sign in</span></div>

      <form class="auth-form" id="loginForm" novalidate>
        <div class="auth-field">
          <label>Email</label>
          <input type="email" id="loginEmail" placeholder="you@example.com" value="admin@minimarket.io" required />
        </div>
        <div class="auth-field">
          <label>Password</label>
          <input type="password" id="loginPassword" placeholder="••••••••" value="password123" required />
        </div>
        <button type="submit" class="auth-btn" id="loginBtn">Sign In</button>
      </form>
      <p class="auth-footer">No account? <a href="#" id="switchToRegister">Register here →</a></p>
    `;

    card.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('loginEmail').value = btn.dataset.email;
      });
    });

    document.getElementById('switchToRegister').addEventListener('click', e => {
      e.preventDefault(); renderAuthPage('register');
    });

    // FIX BUG #6 — login now calls DB.login() which uses server-side bcrypt verification
    document.getElementById('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      clearAllErrors(form);
      if (!validateRequired(form)) return;

      const email = document.getElementById('loginEmail').value.trim();
      const pass  = document.getElementById('loginPassword').value;
      const btn   = document.getElementById('loginBtn');

      btn.textContent = 'Signing in…';
      btn.disabled    = true;

      try {
        const user  = await DB.login(email, pass);
        currentUser = user;
        showToast(`Welcome back, ${user.name}!`, 'success');
        showApp();
      } catch (err) {
        showFieldError(document.getElementById('loginEmail'), err.message);
        showToast(err.message, 'error');
        btn.textContent = 'Sign In';
        btn.disabled    = false;
      }
    });

  } else {
    // REGISTER
    card.innerHTML = `
      <div class="auth-logo">
        <span class="logo-icon"><img src="LOGOBI3.png" alt="Bi3li Logo" style="width:100%;height:auto;"/></span>
      </div>
      <h2 class="auth-title">Create account</h2>
      <p class="auth-sub">Join Bi3li today — it's free</p>

      <form class="auth-form" id="registerForm" novalidate>
        <div class="auth-field">
          <label>Full Name *</label>
          <input type="text" id="regName" placeholder="Your full name" required />
        </div>
        <div class="auth-field">
          <label>Email *</label>
          <input type="email" id="regEmail" placeholder="you@example.com" required />
        </div>
        <div class="auth-field">
          <label>Password *</label>
          <input type="password" id="regPassword" placeholder="Min. 6 characters" required />
        </div>
        <div class="auth-field">
          <label>Confirm Password *</label>
          <input type="password" id="regConfirm" placeholder="Repeat password" required />
        </div>
        <div class="auth-field">
          <label>Location</label>
          <input type="text" id="regLocation" placeholder="City, Country" />
        </div>
        <div class="auth-field">
          <label>I want to *</label>
          <select id="regRole" required>
            <option value="">Choose your role…</option>
            <option value="buyer">Buy items (Buyer)</option>
            <option value="seller">Sell items (Seller)</option>
          </select>
        </div>
        <button type="submit" class="auth-btn" id="regBtn">Create Account</button>
      </form>
      <p class="auth-footer">Already have an account? <a href="#" id="switchToLogin">Sign in →</a></p>
    `;

    document.getElementById('switchToLogin').addEventListener('click', e => {
      e.preventDefault(); renderAuthPage('login');
    });

    document.getElementById('registerForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      clearAllErrors(form);
      let valid = validateRequired(form);

      const name     = document.getElementById('regName').value.trim();
      const email    = document.getElementById('regEmail').value.trim();
      const pass     = document.getElementById('regPassword').value;
      const confirm  = document.getElementById('regConfirm').value;
      const role     = document.getElementById('regRole').value;
      const location = document.getElementById('regLocation').value.trim();

      if (pass.length < 6) {
        showFieldError(document.getElementById('regPassword'), 'Password must be at least 6 characters.');
        valid = false;
      }
      if (pass !== confirm) {
        showFieldError(document.getElementById('regConfirm'), 'Passwords do not match.');
        valid = false;
      }
      if (!valid) return;

      const btn = document.getElementById('regBtn');
      btn.textContent = 'Creating…';
      btn.disabled    = true;

      try {
        const user  = await DB.register({ name, email, password: pass, role, location });
        currentUser = user;
        showToast(`Welcome, ${name}! Account created.`, 'success');
        showApp();
      } catch (err) {
        showFieldError(document.getElementById('regEmail'), err.message);
        showToast(err.message, 'error');
        btn.textContent = 'Create Account';
        btn.disabled    = false;
      }
    });
  }
}

function showApp() {
  document.getElementById('authGate').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  buildSidebar();
  buildTopbar();
  const defaults = { admin: 'store', seller: 'seller-profile', buyer: 'storefront' };
  navigate(defaults[currentUser.role] || 'storefront');
}

async function signOut() {
  await DB.logout();
  currentUser = null;
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('mainContent').innerHTML = '';
  renderAuthPage('login');
  showToast('Signed out successfully', 'info');
}

// =============================================
//  SIDEBAR & TOPBAR
// =============================================
function buildSidebar() {
  document.getElementById('sidebarUser').innerHTML = `
    <div class="su-avatar">${currentUser.avatar}</div>
    <div class="su-name">${escHtml(currentUser.name)}</div>
    <div class="su-role">${currentUser.role}</div>
    <div class="su-badge">${escHtml(currentUser.badge)}</div>
  `;
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = navConfig[currentUser.role].map(item => {
    if (item.section) return `<div class="nav-section-label">${item.section}</div>`;
    return `<button class="nav-item" data-route="${item.id}">
      <span class="ni-icon">${item.icon}</span><span>${item.label}</span>
    </button>`;
  }).join('');
  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => { navigate(btn.dataset.route); closeSidebar(); });
  });
  document.getElementById('signOutBtn').addEventListener('click', signOut);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
}

function buildTopbar() {
  document.getElementById('topbarActions').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div class="avatar">${currentUser.avatar}</div>
      <span style="font-size:13px;font-weight:600;color:var(--ink-soft)">${escHtml(currentUser.name)}</span>
    </div>
  `;
  document.getElementById('topbarMenu').addEventListener('click', openSidebar);
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

function setActiveNav(routeId) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === routeId);
  });
}

// =============================================
//  ROUTER
// =============================================
function navigate(route) {
  currentRoute = route;
  setActiveNav(route);
  const labels = {
    'store':'Store Dashboard','products':'Products','users':'All Users',
    'storefront':'Storefront','seller-profile':'My Profile',
    'seller-listings':'My Listings','seller-add':'Add Item',
    'buyer-profile':'My Profile','buyer-purchases':'My Purchases','buyer-wishlist':'Wishlist',
  };
  document.getElementById('topbarTitle').textContent = labels[route] || route;
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  main.scrollTop = 0;

  const routes = {
    'store':           renderStoreDashboard,
    'products':        renderProductsManager,
    'users':           renderUsersPanel,
    'storefront':      renderStorefront,
    'seller-profile':  () => renderSellerProfile(true),
    'seller-listings': renderSellerListings,
    'seller-add':      renderAddProduct,
    'buyer-profile':   () => renderBuyerProfile(true),
    'buyer-purchases': renderBuyerPurchases,
    'buyer-wishlist':  renderBuyerWishlist,
  };

  if (routes[route]) routes[route]();
  else main.innerHTML = `<div class="empty-state"><div class="es-icon">🚧</div><h3>Coming Soon</h3><p>This section is under construction.</p></div>`;
}

// =============================================
//  LOADING HELPER
// =============================================
function showLoading(el) {
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--ink-muted);">
    <span style="font-size:24px;animation:spin 1s linear infinite;display:inline-block;">⟳</span>
    <span style="font-size:15px;">Loading…</span>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
}

// =============================================
//  VIEW: STORE DASHBOARD (admin)
//  FIX BUG #4 — now async, awaits DB.getStore/getProducts/getUsers
// =============================================
async function renderStoreDashboard() {
  const main = document.getElementById('mainContent');
  showLoading(main);

  try {
    const [s, products, users] = await Promise.all([
      DB.getStore(),
      DB.getProducts(),
      DB.getUsers(),
    ]);

    const maxRev = Math.max(...(s.revenueChart.length ? s.revenueChart : [1]));

    main.innerHTML = `
      <div class="anim-in">
        <div class="page-header">
          <div class="page-header-left">
            <div class="page-eyebrow">Overview</div>
            <h1>Bi3li</h1>
            <p>Curated second-hand marketplace</p>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-outline" onclick="showToast('Export coming soon!','info')">📊 Export Report</button>
            <button class="btn btn-green" onclick="navigate('products')">+ Add Listing</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card" style="--accent-color:#1a6b4a">
            <div class="sc-icon">💰</div>
            <div class="sc-label">Total Revenue</div>
            <div class="sc-value">$${s.totalRevenue.toLocaleString()}</div>
            <div class="sc-trend trend-up">↑ $${s.monthRevenue.toLocaleString()} this month</div>
          </div>
          <div class="stat-card" style="--accent-color:#3b82f6">
            <div class="sc-icon">📦</div>
            <div class="sc-label">Total Products</div>
            <div class="sc-value">${products.length}</div>
            <div class="sc-trend trend-up">↑ ${products.filter(p=>p.status==='available').length} available</div>
          </div>
          <div class="stat-card" style="--accent-color:#f59e0b">
            <div class="sc-icon">👥</div>
            <div class="sc-label">Total Members</div>
            <div class="sc-value">${users.length}</div>
            <div class="sc-trend trend-up">+${s.monthUsers} this month</div>
          </div>
          <div class="stat-card" style="--accent-color:#8b5cf6">
            <div class="sc-icon">⭐</div>
            <div class="sc-label">Avg Rating</div>
            <div class="sc-value">${s.avgRating}</div>
            <div class="sc-sub">Based on 847 reviews</div>
          </div>
        </div>

        <div class="two-col" style="margin-bottom:24px;">
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <div>
                <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Revenue</div>
                <div style="font-family:var(--font-d);font-size:24px;font-weight:700;color:var(--ink);">$${s.monthRevenue.toLocaleString()} <span style="font-family:var(--font-b);font-size:13px;color:var(--ink-muted);font-weight:400;">this month</span></div>
              </div>
              <span class="pill pill-green">↑ Live data</span>
            </div>
            <div class="chart-wrap" id="revenueChart"></div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;">
              ${(s.months||[]).map(m => `<div class="chart-label">${m}</div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Sales by Category</div>
            ${(s.categories||[]).map(c => `
              <div class="cat-bar">
                <div class="cat-bar-label"><span>${c.name}</span><span style="font-weight:600">${c.count} items · ${c.pct}%</span></div>
                <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${c.pct}%"></div></div>
              </div>
            `).join('')}
            <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div style="background:var(--cream);border-radius:var(--r-md);padding:14px 16px;">
                <div style="font-size:11px;color:var(--ink-muted);font-weight:600;text-transform:uppercase;letter-spacing:1px;">This Month</div>
                <div style="font-family:var(--font-d);font-size:22px;font-weight:700;color:var(--ink);margin-top:4px;">${s.monthOrders} orders</div>
              </div>
              <div style="background:var(--green-xlight);border-radius:var(--r-md);padding:14px 16px;border:1px solid rgba(26,107,74,0.15);">
                <div style="font-size:11px;color:var(--green);font-weight:600;text-transform:uppercase;letter-spacing:1px;">New Members</div>
                <div style="font-family:var(--font-d);font-size:22px;font-weight:700;color:var(--green);margin-top:4px;">+${s.monthUsers}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="two-col">
          <div class="card">
            <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:18px;">Recent Activity</div>
            ${(s.recentActivity||[]).map(a => `
              <div class="activity-item">
                <div class="ai-icon ai-${a.type}">${a.type==='sale'?'💸':a.type==='join'?'👤':'⭐'}</div>
                <div class="ai-text">${escHtml(a.text)}</div>
                <div style="text-align:right;">
                  ${a.amount ? `<div class="ai-amount">$${a.amount}</div>` : ''}
                  <div class="ai-time">${a.time}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;">Registered Users</div>
              <button class="btn btn-sm btn-outline" onclick="navigate('users')">View all →</button>
            </div>
            ${users.slice(0,5).map(u => `
              <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
                <div class="avatar">${u.avatar}</div>
                <div style="flex:1;">
                  <div style="font-size:14px;font-weight:600;color:var(--ink);">${escHtml(u.name)}</div>
                  <div style="font-size:12px;color:var(--ink-muted);">${u.role} · ${u.location || '—'}</div>
                </div>
                <span class="pill pill-${u.role==='admin'?'amber':u.role==='seller'?'green':'blue'}">${u.role}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const chartEl = document.getElementById('revenueChart');
    if (chartEl && s.revenueChart.length) {
      chartEl.innerHTML = s.revenueChart.map(val => {
        const pct = Math.round((val / maxRev) * 100);
        return `<div class="chart-bar-group">
          <div class="chart-bar" style="height:${pct}%">
            <div class="chart-bar-tooltip">$${val.toLocaleString()}</div>
          </div>
        </div>`;
      }).join('');
    }
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="es-icon">⚠️</div><h3>Failed to load dashboard</h3><p>${err.message}</p></div>`;
  }
}

// =============================================
//  VIEW: PRODUCTS MANAGER (admin + seller)
//  FIX BUG #4 — async data loading
// =============================================
async function renderProductsManager(sellerId = null) {
  const main = document.getElementById('mainContent');
  showLoading(main);

  let allProducts = [];
  try {
    allProducts = sellerId
      ? await DB.getProductsBySeller(sellerId)
      : await DB.getProducts();
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="es-icon">⚠️</div><h3>Failed to load products</h3><p>${err.message}</p></div>`;
    return;
  }

  let filterCat = 'all', filterStatus = 'all', filterDate = '',
      sortCol   = 'posted_date', sortDir = -1, searchQ = '';
  pagination.products.page = 1;

  function getFiltered() {
    let list = [...allProducts];
    if (filterCat !== 'all')    list = list.filter(p => p.category === filterCat);
    if (filterStatus !== 'all') list = list.filter(p => p.status   === filterStatus);
    if (filterDate)             list = list.filter(p => p.posted_date >= filterDate);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.location||'').toLowerCase().includes(q) ||
        (p.seller_name||'').toLowerCase().includes(q)
      );
    }
    // FIX BUG #9 — use snake_case field names (posted_date not postedDate)
    list.sort((a, b) => {
      let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      if (sortCol === 'price') { av = +av; bv = +bv; }
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    return list;
  }

  function renderTable() {
    const all    = getFiltered();
    const total  = all.length;
    const { page, perPage } = pagination.products;
    const pages  = Math.max(1, Math.ceil(total / perPage));
    const pPage  = Math.min(page, pages);
    pagination.products.page = pPage;
    const list   = all.slice((pPage-1)*perPage, pPage*perPage);

    const sortArrow = (col) => sortCol === col ? (sortDir === 1 ? ' ↑' : ' ↓') : '';

    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:42px;height:42px;background:var(--cream-dark);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${p.emoji}</div>
            <div>
              <div style="font-weight:600;color:var(--ink);font-size:14px;">${escHtml(p.title)}</div>
              <div style="font-size:12px;color:var(--ink-muted);">${escHtml(p.brand)} · ${escHtml(p.condition)}</div>
            </div>
          </div>
        </td>
        <td><span class="pill pill-${p.category==='clothes'?'green':p.category==='shoes'?'blue':p.category==='electronics'?'amber':'gray'}">${p.category}</span></td>
        <td><span style="font-family:var(--font-d);font-size:16px;font-weight:700;">$${p.price}</span></td>
        <td style="font-size:13px;color:var(--ink-muted);">${escHtml(p.location||'—')}</td>
        <td style="font-size:13px;color:var(--ink-muted);">${fmtDate(p.posted_date)}</td>
        <td><span class="pill pill-${p.status==='available'?'green':'gray'}">${p.status}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-outline" onclick="openProductDetailModal('${p.id}')">View</button>
            <button class="btn btn-sm btn-outline" onclick="openEditProductModal('${p.id}')">Edit</button>
            <button class="btn btn-sm btn-red" onclick="deleteProduct('${p.id}')">Del</button>
          </div>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📦</div><h3>No products found</h3></div></td></tr>`;

    renderPagination('prodPagination', total, pPage, perPage, (p) => {
      pagination.products.page = p; renderTable();
    });

    document.querySelectorAll('.sort-th').forEach(th => {
      th.onclick = () => {
        const col = th.dataset.col;
        if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
        renderTable();
      };
      th.querySelector('.sort-arrow').textContent = sortArrow(th.dataset.col);
    });
  }

  main.innerHTML = `
    <div class="anim-in">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-eyebrow">Management</div>
          <h1>Products</h1>
          <p id="prodCount">${allProducts.length} products</p>
        </div>
        <button class="btn btn-green" onclick="openAddProductModal()">+ Add Product</button>
      </div>

      <div class="card" style="padding:18px;margin-bottom:18px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:2;min-width:160px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">🔍 Search</label>
            <input id="prodSearch" placeholder="Title, category, location, seller…"
              style="width:100%;font-family:var(--font-b);font-size:14px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);" />
          </div>
          <div style="min-width:130px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">Category</label>
            <select id="prodCat" style="width:100%;font-family:var(--font-b);font-size:13px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);">
              <option value="all">All</option>
              <option value="clothes">Clothes</option>
              <option value="shoes">Shoes</option>
              <option value="electronics">Electronics</option>
              <option value="furniture">Furniture</option>
            </select>
          </div>
          <div style="min-width:120px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">Status</label>
            <select id="prodStatus" style="width:100%;font-family:var(--font-b);font-size:13px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);">
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div style="min-width:140px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">Listed From</label>
            <input type="date" id="prodDate"
              style="width:100%;font-family:var(--font-b);font-size:13px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);" />
          </div>
          <button class="btn btn-outline btn-sm" onclick="clearProdFilters()">Clear</button>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th class="sort-th" data-col="title">Product <span class="sort-arrow"></span></th>
              <th class="sort-th" data-col="category">Category <span class="sort-arrow"></span></th>
              <th class="sort-th" data-col="price">Price <span class="sort-arrow"></span></th>
              <th>Location</th>
              <th class="sort-th" data-col="posted_date">Date <span class="sort-arrow"></span></th>
              <th class="sort-th" data-col="status">Status <span class="sort-arrow"></span></th>
              <th>Actions</th>
            </tr></thead>
            <tbody id="productsTableBody"></tbody>
          </table>
        </div>
        <div id="prodPagination" style="padding:14px 20px;border-top:1px solid var(--border);"></div>
      </div>
    </div>
  `;

  renderTable();

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  document.getElementById('prodSearch').addEventListener('input', debounce(e => { searchQ = e.target.value; pagination.products.page=1; renderTable(); }, 250));
  document.getElementById('prodCat').addEventListener('change',    e => { filterCat    = e.target.value; pagination.products.page=1; renderTable(); });
  document.getElementById('prodStatus').addEventListener('change', e => { filterStatus = e.target.value; pagination.products.page=1; renderTable(); });
  document.getElementById('prodDate').addEventListener('change',   e => { filterDate   = e.target.value; pagination.products.page=1; renderTable(); });

  window.clearProdFilters = () => {
    filterCat='all'; filterStatus='all'; filterDate=''; searchQ='';
    document.getElementById('prodSearch').value = '';
    document.getElementById('prodCat').value    = 'all';
    document.getElementById('prodStatus').value = 'all';
    document.getElementById('prodDate').value   = '';
    pagination.products.page = 1;
    renderTable();
  };
}

// ---- Pagination helper ----
function renderPagination(containerId, total, page, perPage, onPage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) {
    el.innerHTML = `<span style="font-size:12px;color:var(--ink-muted);">${total} result${total!==1?'s':''}</span>`;
    return;
  }
  el.innerHTML = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
    <span style="font-size:12px;color:var(--ink-muted);margin-right:8px;">${total} result${total!==1?'s':''}</span>
    ${Array.from({length:pages},(_,i)=>i+1).map(i=>`
      <button data-pg="${i}" style="width:32px;height:32px;border-radius:6px;border:1.5px solid ${i===page?'var(--green)':'var(--border)'};background:${i===page?'var(--green)':'white'};color:${i===page?'white':'var(--ink-soft)'};font-size:13px;cursor:pointer;font-weight:600;">${i}</button>
    `).join('')}
  </div>`;
  el.querySelectorAll('[data-pg]').forEach(btn => {
    btn.addEventListener('click', () => onPage(+btn.dataset.pg));
  });
}

// FIX BUG #4 — deleteProduct is now async
window.deleteProduct = async function(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await DB.deleteProduct(id);
    showToast('Product deleted', 'success');
    renderProductsManager();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// FIX BUG #4 — openAddProductModal is now async (needs seller list)
window.openAddProductModal = async function() {
  let sellers = [];
  if (currentUser.role === 'admin') {
    try {
      const all = await DB.getUsers();
      sellers   = all.filter(u => u.role === 'seller');
    } catch {}
  }
  openModal('Add New Product', `
    <form class="form-grid" id="addProdForm" novalidate>
      <div class="form-row"><label>Title *</label><input id="fp-title" placeholder="e.g. Levi's 501 Jeans" required /></div>
      <div class="form-row"><label>Price ($) *</label><input id="fp-price" type="number" min="0" step="0.01" placeholder="0.00" required /></div>
      <div class="form-row"><label>Category *</label>
        <select id="fp-cat" required><option value="">Choose…</option><option value="clothes">Clothes</option><option value="shoes">Shoes</option><option value="electronics">Electronics</option><option value="furniture">Furniture</option></select>
      </div>
      <div class="form-row"><label>Condition *</label>
        <select id="fp-cond" required><option value="">Choose…</option><option>Like New</option><option>Very Good</option><option>Good</option><option>New with Tags</option></select>
      </div>
      <div class="form-row"><label>Brand</label><input id="fp-brand" placeholder="Brand name" /></div>
      <div class="form-row"><label>Size</label><input id="fp-size" placeholder="S / M / 42 / —" /></div>
      <div class="form-row"><label>Location *</label><input id="fp-location" placeholder="City, Country" required /></div>
      <div class="form-row"><label>Emoji Icon</label><input id="fp-emoji" placeholder="📦" value="📦" /></div>
      ${currentUser.role==='admin' ? `<div class="form-row full"><label>Seller *</label>
        <select id="fp-seller" required><option value="">Choose seller…</option>${sellers.map(s=>`<option value="${s.id}">${escHtml(s.name)}</option>`).join('')}</select>
      </div>` : ''}
      <div class="form-row full"><label>Description *</label><textarea id="fp-desc" rows="3" placeholder="Describe the item…" required></textarea></div>
    </form>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-green" onclick="saveNewProduct()">Add Product</button>
    </div>
  `);
};

window.saveNewProduct = async function() {
  const form = document.getElementById('addProdForm');
  clearAllErrors(form);
  if (!validateRequired(form)) { showToast('Please fill all required fields', 'error'); return; }

  const sellerEl  = document.getElementById('fp-seller');
  const seller_id = sellerEl ? sellerEl.value : currentUser.id;

  try {
    await DB.addProduct({
      title:       document.getElementById('fp-title').value.trim(),
      price:       parseFloat(document.getElementById('fp-price').value),
      category:    document.getElementById('fp-cat').value,
      condition:   document.getElementById('fp-cond').value,
      brand:       document.getElementById('fp-brand').value.trim() || '—',
      size:        document.getElementById('fp-size').value.trim()  || '—',
      location:    document.getElementById('fp-location').value.trim(),
      emoji:       document.getElementById('fp-emoji').value || '📦',
      seller_id,
      description: document.getElementById('fp-desc').value.trim(),
    });
    closeModal();
    showToast('Product added successfully!', 'success');
    renderProductsManager();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.openEditProductModal = async function(id) {
  let p;
  try { p = await DB.getProductById(id); } catch { return; }
  if (!p) return;

  openModal('Edit Product', `
    <form class="form-grid" id="editProdForm" novalidate>
      <div class="form-row"><label>Title *</label><input id="ep-title" value="${escHtml(p.title)}" required /></div>
      <div class="form-row"><label>Price ($) *</label><input id="ep-price" type="number" value="${p.price}" required /></div>
      <div class="form-row"><label>Category</label>
        <select id="ep-cat">${['clothes','shoes','electronics','furniture'].map(c=>`<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-row"><label>Condition</label>
        <select id="ep-cond">${['Like New','Very Good','Good','New with Tags'].map(c=>`<option ${p.condition===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-row"><label>Location *</label><input id="ep-location" value="${escHtml(p.location||'')}" required /></div>
      <div class="form-row"><label>Status</label>
        <select id="ep-status">
          <option value="available" ${p.status==='available'?'selected':''}>Available</option>
          <option value="sold" ${p.status==='sold'?'selected':''}>Sold</option>
        </select>
      </div>
      <div class="form-row full"><label>Description *</label><textarea id="ep-desc" rows="3" required>${escHtml(p.description)}</textarea></div>
    </form>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-green" onclick="saveEditProduct('${p.id}')">Save Changes</button>
    </div>
  `);
};

window.saveEditProduct = async function(id) {
  const form = document.getElementById('editProdForm');
  clearAllErrors(form);
  if (!validateRequired(form)) { showToast('Please fill all required fields', 'error'); return; }
  try {
    await DB.updateProduct(id, {
      title:       document.getElementById('ep-title').value.trim(),
      price:       parseFloat(document.getElementById('ep-price').value),
      category:    document.getElementById('ep-cat').value,
      condition:   document.getElementById('ep-cond').value,
      location:    document.getElementById('ep-location').value.trim(),
      status:      document.getElementById('ep-status').value,
      description: document.getElementById('ep-desc').value.trim(),
    });
    closeModal();
    showToast('Product updated!', 'success');
    renderProductsManager();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.openProductDetailModal = async function(id) {
  let p, seller;
  try {
    p      = await DB.getProductById(id);
    seller = p ? await DB.getUserById(p.seller_id).catch(() => null) : null;
  } catch { return; }
  if (!p) return;

  openModal(null, `
    <div style="display:grid;grid-template-columns:1fr 1fr;">
      <div style="background:var(--cream-dark);display:flex;align-items:center;justify-content:center;font-size:88px;min-height:280px;border-radius:var(--r-xl) 0 0 var(--r-xl);">${p.emoji}</div>
      <div style="padding:32px 28px;">
        <div style="font-size:10.5px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">${p.category}</div>
        <h2 style="font-family:var(--font-d);font-size:22px;font-weight:700;color:var(--ink);letter-spacing:-0.4px;margin-bottom:4px;">${escHtml(p.title)}</h2>
        <div style="font-size:12.5px;color:var(--ink-muted);margin-bottom:4px;">${escHtml(p.condition)}${p.size&&p.size!=='—'?' · Size '+escHtml(p.size):''} · ${escHtml(p.brand)}</div>
        <div style="font-size:12px;color:var(--ink-muted);margin-bottom:16px;">📍 ${escHtml(p.location||'—')} · 📅 ${fmtDate(p.posted_date)}</div>
        <div style="font-family:var(--font-d);font-size:36px;font-weight:700;color:var(--green);letter-spacing:-1px;margin-bottom:18px;">$${p.price}</div>
        <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.75;margin-bottom:20px;font-weight:300;">${escHtml(p.description)}</p>
        ${seller ? `
          <div style="display:flex;align-items:center;gap:10px;background:var(--cream);border-radius:var(--r-md);padding:12px 14px;margin-bottom:20px;">
            <div class="avatar">${seller.avatar}</div>
            <div>
              <div style="font-size:13.5px;font-weight:600;color:var(--ink);">${escHtml(seller.name)}</div>
              <div style="font-size:12px;color:var(--ink-muted);">${escHtml(seller.location||'')}</div>
            </div>
          </div>
        ` : ''}
        <div style="display:flex;gap:10px;font-size:12px;color:var(--ink-muted);margin-bottom:16px;">
          <span>❤️ ${p.likes||0} likes</span>
          <span>👁 ${p.views||0} views</span>
        </div>
        ${p.status==='available' ? `
          <button onclick="handleBuy('${p.id}')" style="width:100%;background:var(--green);color:white;font-family:var(--font-b);font-size:15px;font-weight:600;border:none;padding:14px;border-radius:var(--r-md);cursor:pointer;">Buy Now — $${p.price}</button>
        ` : `<button disabled style="width:100%;background:var(--cream-dark);color:var(--ink-muted);font-family:var(--font-b);font-size:15px;font-weight:600;border:none;padding:14px;border-radius:var(--r-md);">Sold Out</button>`}
      </div>
    </div>
  `);
};

// FIX BUG #4 — handleBuy is now async, calls DB.buyProduct() for real transaction
window.handleBuy = async function(id) {
  const btn = document.querySelector(`button[onclick="handleBuy('${id}')"]`);
  if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }
  try {
    const result = await DB.buyProduct(id);
    // Update local balance
    currentUser.balance -= result.product.price;
    closeModal();
    showToast(`🎉 "${result.product.title}" purchased!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.textContent = `Buy Now — $${btn.dataset?.price || ''}`; btn.disabled = false; }
  }
};

// =============================================
//  VIEW: ALL USERS PANEL (admin)
//  FIX BUG #4 — async
// =============================================
async function renderUsersPanel() {
  const main = document.getElementById('mainContent');
  showLoading(main);

  let allUsers = [];
  try {
    allUsers = await DB.getUsers();
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="es-icon">⚠️</div><h3>Failed to load users</h3><p>${err.message}</p></div>`;
    return;
  }

  let filterRole = 'all', searchQ = '';
  pagination.users.page = 1;

  function getFiltered() {
    let list = [...allUsers];
    if (filterRole !== 'all') list = list.filter(u => u.role === filterRole);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.location||'').toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderTable() {
    const all   = getFiltered();
    const total = all.length;
    const { page, perPage } = pagination.users;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const pPage = Math.min(page, pages);
    pagination.users.page = pPage;
    const list  = all.slice((pPage-1)*perPage, pPage*perPage);

    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    // FIX BUG #9 — use created_at (snake_case)
    tbody.innerHTML = list.length ? list.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="avatar">${u.avatar}</div>
            <div>
              <div style="font-weight:600;color:var(--ink);font-size:14px;">${escHtml(u.name)}</div>
              <div style="font-size:12px;color:var(--ink-muted);">${escHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td><span class="pill pill-${u.role==='admin'?'amber':u.role==='seller'?'green':'blue'}">${u.role}</span></td>
        <td style="font-size:13px;color:var(--ink-muted);">${escHtml(u.location||'—')}</td>
        <td style="font-size:13px;color:var(--ink-muted);">${fmtDate(u.created_at)}</td>
        <td><span class="pill pill-green">${escHtml(u.badge)}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            ${u.id !== currentUser.id
              ? `<button class="btn btn-sm btn-red" onclick="adminDeleteUser('${u.id}')">Remove</button>`
              : '<span style="font-size:12px;color:var(--ink-muted);">You</span>'}
          </div>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="es-icon">👥</div><h3>No users found</h3></div></td></tr>`;

    renderPagination('usersPagination', total, pPage, perPage, p => {
      pagination.users.page = p; renderTable();
    });
  }

  main.innerHTML = `
    <div class="anim-in">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-eyebrow">Administration</div>
          <h1>All Users</h1>
          <p>${allUsers.length} registered members</p>
        </div>
      </div>
      <div class="card" style="padding:18px;margin-bottom:18px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:2;min-width:160px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">🔍 Search</label>
            <input id="userSearch" placeholder="Name, email, location…"
              style="width:100%;font-family:var(--font-b);font-size:14px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);" />
          </div>
          <div style="min-width:130px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">Role</label>
            <select id="userRole" style="width:100%;font-family:var(--font-b);font-size:13px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);">
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>User</th><th>Role</th><th>Location</th><th>Joined</th><th>Badge</th><th>Actions</th>
            </tr></thead>
            <tbody id="usersTableBody"></tbody>
          </table>
        </div>
        <div id="usersPagination" style="padding:14px 20px;border-top:1px solid var(--border);"></div>
      </div>
    </div>
  `;

  renderTable();

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  document.getElementById('userSearch').addEventListener('input', debounce(e => { searchQ = e.target.value; pagination.users.page=1; renderTable(); }, 250));
  document.getElementById('userRole').addEventListener('change', e => { filterRole = e.target.value; pagination.users.page=1; renderTable(); });
}

window.adminDeleteUser = async function(id) {
  if (!confirm('Remove this user? Their products will also be removed.')) return;
  try {
    await DB.deleteUser(id);
    showToast('User removed', 'success');
    renderUsersPanel();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// =============================================
//  VIEW: SELLER PROFILE
//  FIX BUG #4 — async; FIX BUG #9 — snake_case fields
// =============================================
async function renderSellerProfile(isSelf) {
  const main = document.getElementById('mainContent');
  showLoading(main);

  const user = currentUser;
  let myProducts = [];
  try { myProducts = await DB.getProductsBySeller(user.id); } catch {}

  main.innerHTML = `
    <div class="anim-in">
      <div class="profile-hero">
        <div class="avatar avatar-xl">${user.avatar}</div>
        <div class="ph-info">
          <div class="ph-name">${escHtml(user.name)}</div>
          <div class="ph-meta">📍 ${escHtml(user.location||'—')} · Member since ${fmtDate(user.created_at)}</div>
          <div class="ph-bio">${escHtml(user.bio||'No bio yet.')}</div>
          <div class="ph-stats">
            <div class="ph-stat"><div class="ph-stat-val">${myProducts.length}</div><div class="ph-stat-lbl">Listings</div></div>
            <div class="ph-stat"><div class="ph-stat-val">${myProducts.filter(p=>p.status==='sold').length}</div><div class="ph-stat-lbl">Sold</div></div>
            <div class="ph-stat"><div class="ph-stat-val">$${parseFloat(user.balance||0).toLocaleString()}</div><div class="ph-stat-lbl">Balance</div></div>
          </div>
          <span class="ph-badge badge-verify">${escHtml(user.badge)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
          <button class="btn btn-outline btn-sm" onclick="openEditProfileModal()">✏️ Edit Profile</button>
          <button class="btn btn-outline btn-sm" onclick="openChangePasswordModal()">🔑 Change Password</button>
          <button class="btn btn-red btn-sm" onclick="openDeleteAccountModal()">🗑 Delete Account</button>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">My Listings (${myProducts.length})</div>
        <div class="products-grid">
          ${myProducts.length
            ? myProducts.map(p => productCardHTML(p, true)).join('')
            : `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">📦</div><h3>No listings yet</h3><p>Add your first item!</p></div>`}
        </div>
      </div>
    </div>
  `;

  main.querySelectorAll('.view-detail-btn').forEach(btn =>
    btn.addEventListener('click', () => openProductDetailModal(btn.dataset.id)));
  main.querySelectorAll('.edit-product-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditProductModal(btn.dataset.id)));
}

function openEditProfileModal() {
  openModal('Edit Profile', `
    <form class="form-grid" id="editProfileForm" novalidate>
      <div class="form-row"><label>Full Name *</label><input id="ep-name" value="${escHtml(currentUser.name)}" required /></div>
      <div class="form-row"><label>Location</label><input id="ep-loc" value="${escHtml(currentUser.location||'')}" /></div>
      <div class="form-row full"><label>Bio</label><textarea id="ep-bio" rows="3">${escHtml(currentUser.bio||'')}</textarea></div>
    </form>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-green" onclick="saveProfile()">Save Changes</button>
    </div>
  `);
}

window.saveProfile = async function() {
  const form = document.getElementById('editProfileForm');
  clearAllErrors(form);
  if (!validateRequired(form)) return;
  try {
    const updated = await DB.updateUser(currentUser.id, {
      name:     document.getElementById('ep-name').value.trim(),
      location: document.getElementById('ep-loc').value.trim(),
      bio:      document.getElementById('ep-bio').value.trim(),
    });
    Object.assign(currentUser, updated);
    document.getElementById('sidebarUser').querySelector('.su-name').textContent = updated.name;
    closeModal();
    showToast('Profile updated!', 'success');
    renderSellerProfile(true);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

function openChangePasswordModal() {
  openModal('Change Password', `
    <form class="form-grid" id="pwdForm" novalidate>
      <div class="form-row full"><label>Current Password *</label><input type="password" id="pwdCurrent" required placeholder="Current password" /></div>
      <div class="form-row full"><label>New Password *</label><input type="password" id="pwdNew" required placeholder="Min. 6 characters" /></div>
      <div class="form-row full"><label>Confirm New Password *</label><input type="password" id="pwdConfirm" required placeholder="Repeat new password" /></div>
    </form>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-green" onclick="changePassword()">Update Password</button>
    </div>
  `);
}

window.changePassword = async function() {
  const form = document.getElementById('pwdForm');
  clearAllErrors(form);
  if (!validateRequired(form)) return;
  const curr    = document.getElementById('pwdCurrent').value;
  const newPwd  = document.getElementById('pwdNew').value;
  const confirm = document.getElementById('pwdConfirm').value;

  if (newPwd.length < 6) {
    showFieldError(document.getElementById('pwdNew'), 'Password must be at least 6 characters.');
    return;
  }
  if (newPwd !== confirm) {
    showFieldError(document.getElementById('pwdConfirm'), 'Passwords do not match.');
    return;
  }
  try {
    await DB.changePassword(currentUser.id, curr, newPwd);
    closeModal();
    showToast('Password updated successfully!', 'success');
  } catch (err) {
    showFieldError(document.getElementById('pwdCurrent'), err.message);
  }
};

function openDeleteAccountModal() {
  openModal('Delete Account', `
    <div style="text-align:center;padding:20px 0;">
      <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
      <h3 style="font-family:var(--font-d);font-size:22px;color:var(--ink);margin-bottom:8px;">Are you sure?</h3>
      <p style="font-size:14px;color:var(--ink-muted);line-height:1.7;margin-bottom:24px;">This will permanently delete your account and all your listings. This cannot be undone.</p>
      <div class="form-row full" style="margin-bottom:16px;">
        <label>Type your password to confirm *</label>
        <input type="password" id="deleteConfirmPwd" placeholder="Your password" style="width:100%;font-family:var(--font-b);font-size:14px;border:1.5px solid var(--red);border-radius:var(--r-sm);padding:10px 14px;outline:none;" />
        <div id="deleteError" style="color:var(--red);font-size:12px;margin-top:4px;"></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-red" onclick="confirmDeleteAccount()">Delete My Account</button>
      </div>
    </div>
  `);
}

window.confirmDeleteAccount = async function() {
  const pwd   = document.getElementById('deleteConfirmPwd').value;
  const errEl = document.getElementById('deleteError');
  if (!pwd) { errEl.textContent = 'Password is required.'; return; }

  // Verify password via change password endpoint with wrong new pass — use login instead
  try {
    // Re-authenticate to verify password before deleting
    await DB.login(currentUser.email, pwd);
    await DB.deleteUser(currentUser.id);
    await DB.logout();
    currentUser = null;
    closeModal();
    document.getElementById('appShell').classList.add('hidden');
    renderAuthPage('login');
    showToast('Account deleted. Goodbye!', 'info');
  } catch (err) {
    errEl.textContent = 'Incorrect password.';
  }
};

// =============================================
//  VIEW: SELLER LISTINGS
// =============================================
function renderSellerListings() {
  renderProductsManager(currentUser.id);
}

// =============================================
//  VIEW: ADD PRODUCT (seller)
// =============================================
function renderAddProduct() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="anim-in" style="max-width:720px;">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-eyebrow">Sell Something</div>
          <h1>Add New Item</h1>
        </div>
      </div>
      <div class="card">
        <form class="form-grid" id="addItemForm" novalidate>
          <div class="form-row"><label>Item Title *</label><input id="ap-title" placeholder="e.g. Vintage Denim Jacket" required /></div>
          <div class="form-row"><label>Price ($) *</label><input id="ap-price" type="number" min="0" placeholder="0.00" required /></div>
          <div class="form-row"><label>Category *</label>
            <select id="ap-cat" required><option value="">Choose…</option><option value="clothes">Clothes</option><option value="shoes">Shoes</option><option value="electronics">Electronics</option><option value="furniture">Furniture</option></select>
          </div>
          <div class="form-row"><label>Condition *</label>
            <select id="ap-cond" required><option value="">Choose…</option><option>Like New</option><option>Very Good</option><option>Good</option><option>New with Tags</option></select>
          </div>
          <div class="form-row"><label>Brand</label><input id="ap-brand" placeholder="Brand / maker" /></div>
          <div class="form-row"><label>Size</label><input id="ap-size" placeholder="S / M / 42 / —" /></div>
          <div class="form-row"><label>Location *</label><input id="ap-location" placeholder="City, Country" required /></div>
          <div class="form-row"><label>Emoji Icon</label><input id="ap-emoji" placeholder="e.g. 👕" value="📦" /></div>
          <div class="form-row full"><label>Description *</label><textarea id="ap-desc" rows="4" placeholder="Describe your item honestly…" required></textarea></div>
        </form>
        <div class="form-actions" style="margin-top:24px;">
          <button class="btn btn-outline" onclick="navigate('seller-listings')">Cancel</button>
          <button class="btn btn-green" onclick="submitNewListing()">📤 List Item</button>
        </div>
      </div>
    </div>
  `;
}

window.submitNewListing = async function() {
  const form = document.getElementById('addItemForm');
  clearAllErrors(form);
  if (!validateRequired(form)) { showToast('Please fill all required fields', 'error'); return; }

  const title = document.getElementById('ap-title').value.trim();
  try {
    await DB.addProduct({
      title,
      price:       parseFloat(document.getElementById('ap-price').value),
      category:    document.getElementById('ap-cat').value,
      condition:   document.getElementById('ap-cond').value,
      brand:       document.getElementById('ap-brand').value.trim() || '—',
      size:        document.getElementById('ap-size').value.trim()  || '—',
      location:    document.getElementById('ap-location').value.trim(),
      emoji:       document.getElementById('ap-emoji').value || '📦',
      seller_id:   currentUser.id,
      description: document.getElementById('ap-desc').value.trim(),
    });
    showToast(`"${title}" listed successfully!`, 'success');
    navigate('seller-listings');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// =============================================
//  VIEW: BUYER PROFILE
//  FIX BUG #9 — created_at snake_case
// =============================================
function renderBuyerProfile(isSelf) {
  const main = document.getElementById('mainContent');
  const user = currentUser;
  main.innerHTML = `
    <div class="anim-in">
      <div class="profile-hero">
        <div class="avatar avatar-xl">${user.avatar}</div>
        <div class="ph-info">
          <div class="ph-name">${escHtml(user.name)}</div>
          <div class="ph-meta">📍 ${escHtml(user.location||'—')} · Member since ${fmtDate(user.created_at)}</div>
          <div class="ph-bio">${escHtml(user.bio||'No bio yet.')}</div>
          <div class="ph-stats">
            <div class="ph-stat"><div class="ph-stat-val">$${parseFloat(user.balance||0).toLocaleString()}</div><div class="ph-stat-lbl">Balance</div></div>
          </div>
          <span class="ph-badge badge-verify">${escHtml(user.badge)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
          <button class="btn btn-outline btn-sm" onclick="openEditBuyerProfileModal()">✏️ Edit Profile</button>
          <button class="btn btn-outline btn-sm" onclick="openChangePasswordModal()">🔑 Change Password</button>
          <button class="btn btn-red btn-sm" onclick="openDeleteAccountModal()">🗑 Delete Account</button>
        </div>
      </div>
    </div>
  `;
}

window.openEditBuyerProfileModal = function() {
  openModal('Edit Profile', `
    <form class="form-grid" id="editProfileForm" novalidate>
      <div class="form-row"><label>Full Name *</label><input id="ep-name" value="${escHtml(currentUser.name)}" required /></div>
      <div class="form-row"><label>Location</label><input id="ep-loc" value="${escHtml(currentUser.location||'')}" /></div>
      <div class="form-row full"><label>Bio</label><textarea id="ep-bio" rows="3">${escHtml(currentUser.bio||'')}</textarea></div>
    </form>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-green" onclick="saveProfile()">Save Changes</button>
    </div>
  `);
};

// =============================================
//  VIEW: BUYER PURCHASES
// =============================================
function renderBuyerPurchases() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="anim-in">
      <div class="page-header"><div class="page-header-left">
        <div class="page-eyebrow">My Account</div><h1>My Purchases</h1>
        <p>Balance: $${parseFloat(currentUser.balance||0).toLocaleString()}</p>
      </div></div>
      <div class="empty-state"><div class="es-icon">🧾</div><h3>No purchases yet</h3><p>Browse the store to find great deals!</p></div>
    </div>
  `;
}

// =============================================
//  VIEW: BUYER WISHLIST
//  FIX BUG #4 — async
// =============================================
async function renderBuyerWishlist() {
  const main = document.getElementById('mainContent');
  showLoading(main);
  let wished = [];
  try {
    const all = await DB.getProducts();
    wished = all.filter(p => likedIds.has(p.id));
  } catch {}

  main.innerHTML = `
    <div class="anim-in">
      <div class="page-header"><div class="page-header-left">
        <div class="page-eyebrow">My Account</div><h1>My Wishlist</h1>
        <p>${wished.length} saved items</p>
      </div></div>
      <div class="products-grid">
        ${wished.length
          ? wished.map(p => productCardHTML(p)).join('')
          : `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">❤️</div><h3>Your wishlist is empty</h3><p>Click ❤️ on any item to save it here.</p></div>`}
      </div>
    </div>
  `;
  main.querySelectorAll('.view-detail-btn').forEach(btn =>
    btn.addEventListener('click', () => openProductDetailModal(btn.dataset.id)));
}

// =============================================
//  VIEW: STOREFRONT
//  FIX BUG #4 — async; FIX BUG #9 — snake_case
// =============================================
async function renderStorefront() {
  const main = document.getElementById('mainContent');
  showLoading(main);

  let allProds = [];
  try { allProds = await DB.getProducts(); } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="es-icon">⚠️</div><h3>Failed to load store</h3><p>${err.message}</p></div>`;
    return;
  }

  let filterCat = 'all', filterStatus = 'all', sortBy = 'newest', searchQ = '';

  function filteredProds() {
    let list = [...allProds];
    if (filterCat !== 'all')    list = list.filter(p => p.category === filterCat);
    if (filterStatus !== 'all') list = list.filter(p => p.status   === filterStatus);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.location||'').toLowerCase().includes(q) ||
        (p.seller_name||'').toLowerCase().includes(q)
      );
    }
    // FIX BUG #9 — sort by posted_date (snake_case)
    if (sortBy === 'newest')      list.sort((a,b) => b.posted_date.localeCompare(a.posted_date));
    else if (sortBy === 'oldest') list.sort((a,b) => a.posted_date.localeCompare(b.posted_date));
    else if (sortBy === 'price-asc')  list.sort((a,b) => a.price - b.price);
    else if (sortBy === 'price-desc') list.sort((a,b) => b.price - a.price);
    return list;
  }

  function renderGrid() {
    const list = filteredProds();
    const grid = document.getElementById('storefrontGrid');
    if (!grid) return;
    grid.innerHTML = list.length
      ? list.map(p => productCardHTML(p)).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">🔍</div><h3>No items found</h3></div>`;
    grid.querySelectorAll('.view-detail-btn').forEach(btn =>
      btn.addEventListener('click', () => openProductDetailModal(btn.dataset.id)));
    grid.querySelectorAll('.like-product-btn').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); toggleLike(btn.dataset.id, btn); }));
    const rc = document.getElementById('sfResultCount');
    if (rc) rc.textContent = `${list.length} item${list.length!==1?'s':''}`;
  }

  const availableCount = allProds.filter(p=>p.status==='available').length;

  main.innerHTML = `
    <div class="anim-in">
      <div class="storefront-hero">
        <div class="sfh-eyebrow">✦ ${availableCount} items available today</div>
        <div class="sfh-title">Buy &amp; Sell<br/><em>Used Items</em><br/>Easily.</div>
        <div class="sfh-sub">A curated second-hand marketplace for clothes, electronics, furniture and more.</div>
        <div class="sfh-actions">
          <button class="sfh-btn-main" onclick="document.getElementById('storefrontGrid').scrollIntoView({behavior:'smooth'})">Browse Items</button>
          ${currentUser.role==='seller'?`<button class="sfh-btn-ghost" onclick="navigate('seller-add')">+ List an Item</button>`:''}
        </div>
      </div>

      <div class="card" style="padding:16px;margin-bottom:18px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:2;min-width:160px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">🔍 Search</label>
            <input id="sfSearch" placeholder="Title, location, seller…"
              style="width:100%;font-family:var(--font-b);font-size:14px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);" />
          </div>
          <div style="min-width:120px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">Status</label>
            <select id="sfStatus" style="width:100%;font-family:var(--font-b);font-size:13px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);">
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div style="min-width:140px;">
            <label style="font-size:12px;font-weight:600;color:var(--ink-muted);display:block;margin-bottom:5px;">Sort By</label>
            <select id="sfSort" style="width:100%;font-family:var(--font-b);font-size:13px;border:1.5px solid var(--border);border-radius:var(--r-sm);padding:9px 13px;outline:none;background:var(--cream);">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;flex-wrap:wrap;">
        <div class="cat-pills">
          ${[{id:'all',emoji:'🛍️',label:'All'},{id:'clothes',emoji:'👕',label:'Clothes'},{id:'shoes',emoji:'👟',label:'Shoes'},{id:'electronics',emoji:'📱',label:'Electronics'},{id:'furniture',emoji:'🪑',label:'Furniture'}].map(c=>`
            <div class="cat-pill ${c.id==='all'?'active':''}" data-cat="${c.id}">${c.emoji} ${c.label}</div>
          `).join('')}
        </div>
        <span id="sfResultCount" style="font-size:13px;color:var(--ink-muted);font-weight:500;white-space:nowrap;"></span>
      </div>

      <div class="products-grid" id="storefrontGrid"></div>
    </div>
  `;

  renderGrid();

  main.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      filterCat = pill.dataset.cat;
      main.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === filterCat));
      renderGrid();
    });
  });

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  document.getElementById('sfSearch').addEventListener('input',  debounce(e => { searchQ      = e.target.value; renderGrid(); }, 250));
  document.getElementById('sfStatus').addEventListener('change', e => { filterStatus = e.target.value; renderGrid(); });
  document.getElementById('sfSort').addEventListener('change',   e => { sortBy       = e.target.value; renderGrid(); });
}

function toggleLike(id, btn) {
  if (likedIds.has(id)) {
    likedIds.delete(id);
    btn.innerHTML = '🤍';
    btn.style.background = 'white';
  } else {
    likedIds.add(id);
    btn.innerHTML = '❤️';
    btn.style.background = '#fff0f0';
    btn.style.transform = 'scale(1.25)';
    setTimeout(() => { btn.style.transform = ''; }, 200);
    showToast('Added to wishlist!', 'success');
  }
}

// =============================================
//  PRODUCT CARD HTML (shared)
//  FIX BUG #9 — snake_case: badge_label, seller_name, posted_date
// =============================================
function productCardHTML(p, showEdit = false) {
  const isLiked = likedIds.has(p.id);
  const badgeLabel = p.badge_label || p.badgeLabel || '';
  const badgeHTML  = p.badge
    ? `<div class="pill pill-${p.badge==='new'?'green':p.badge==='hot'?'amber':'blue'}" style="position:absolute;top:10px;left:10px;font-size:10px;">${escHtml(badgeLabel)}</div>`
    : '';
  const statusHTML = p.status === 'sold'
    ? `<div class="pill pill-gray" style="position:absolute;top:10px;right:10px;font-size:10px;">Sold</div>`
    : '';

  return `
    <div class="product-card">
      <div class="pc-img">
        ${p.emoji}
        ${badgeHTML}
        ${statusHTML}
        <button class="like-product-btn" data-id="${p.id}"
          style="position:absolute;bottom:10px;right:10px;width:32px;height:32px;border-radius:50%;background:${isLiked?'#fff0f0':'white'};border:none;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:all 0.2s;">
          ${isLiked?'❤️':'🤍'}
        </button>
      </div>
      <div class="pc-body">
        <div class="pc-cat">${p.category}</div>
        <div class="pc-title">${escHtml(p.title)}</div>
        <div class="pc-cond">${escHtml(p.condition)}${p.size&&p.size!=='—'?' · '+escHtml(p.size):''}</div>
        ${p.location ? `<div style="font-size:11px;color:var(--ink-muted);margin-bottom:6px;">📍 ${escHtml(p.location)}</div>` : ''}
        <div class="pc-footer">
          <div class="pc-price">$${p.price}</div>
          <div class="pc-actions">
            ${showEdit ? `<button class="btn btn-sm btn-outline edit-product-btn" data-id="${p.id}">✏️</button>` : ''}
            <button class="btn btn-sm btn-green view-detail-btn" data-id="${p.id}">View</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =============================================
//  MODAL SYSTEM
// =============================================
function openModal(title, bodyHTML) {
  document.getElementById('modalInner').innerHTML = `
    ${title ? `<div class="modal-header"><h2>${escHtml(title)}</h2></div>` : ''}
    <div class="modal-body-inner">${bodyHTML}</div>
  `;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// =============================================
//  TOAST
// =============================================
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type]||'✓'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// =============================================
//  BOOT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // FIX BUG #4 — initAuth is async
  initAuth();
});
