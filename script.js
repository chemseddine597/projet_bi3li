// =============================================
//  MINI MARKET — JavaScript
// =============================================

const categories = [
  { id: 'clothes',     emoji: '👕', name: 'Clothes',     count: 847 },
  { id: 'shoes',       emoji: '👟', name: 'Shoes',       count: 412 },
  { id: 'electronics', emoji: '📱', name: 'Electronics', count: 631 },
  { id: 'furniture',   emoji: '🪑', name: 'Furniture',   count: 294 },
];

const products = [
  {
    id: 1,
    title: "Levi's 501 Jeans", /* تم إصلاح علامة الاقتباس هنا */
    category: 'clothes',
    price: 35,
    emoji: '👖',
    badge: 'new',
    badgeLabel: 'New',
    condition: 'Like New · Size M',
    description: "Classic Levi's 501 straight-cut jeans in excellent condition. Only worn twice.",
    seller: { name: 'Sophie M.', rating: '★★★★★  4.9', avatar: '👩' },
  },
  {
    id: 2,
    title: 'Nike Air Max 270',
    category: 'shoes',
    price: 68,
    emoji: '👟',
    badge: 'hot',
    badgeLabel: '🔥 Hot',
    condition: 'Good · Size 42',
    description: 'Nike Air Max 270 in grey and white colorway. Great daily sneaker.',
    seller: { name: 'Karim B.', rating: '★★★★☆  4.6', avatar: '👨' },
  },
  {
    id: 3,
    title: 'iPhone 13 — 128GB',
    category: 'electronics',
    price: 340,
    emoji: '📱',
    badge: 'deal',
    badgeLabel: '% Deal',
    condition: 'Very Good · Midnight Blue',
    description: 'iPhone 13 128GB in Midnight Blue. Battery health at 92%.',
    seller: { name: 'Amira T.', rating: '★★★★★  5.0', avatar: '👩' },
  },
  {
    id: 4,
    title: 'Scandinavian Chair',
    category: 'furniture',
    price: 90,
    emoji: '🪑',
    badge: null,
    badgeLabel: '',
    condition: 'Good · Natural Wood',
    description: 'Gorgeous solid oak Scandinavian dining chair.',
    seller: { name: 'Léa D.', rating: '★★★★☆  4.7', avatar: '👩' },
  }
];

const likedProducts = new Set();
let activeFilter = 'all';

let currentUser = { id: 101, name: 'Demo User', avatar: '🧑‍💻', balance: 1500 };
let purchases = [];
let storeStats = { totalRevenue: 1250, itemsSold: 24, totalViews: 840 };

products[0].ownerId = 101;
products[1].ownerId = 101;
products[2].ownerId = 101;

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if(!grid) return;
  grid.innerHTML = '';
  categories.forEach((cat, i) => {
    const card = document.createElement('div');
    card.className = 'cat-card reveal';
    card.style.transitionDelay = `${i * 0.08}s`;
    card.innerHTML = `
      <span class="cat-emoji">${cat.emoji}</span>
      <div class="cat-name">${cat.name}</div>
      <div class="cat-count">${cat.count.toLocaleString()} items</div>
      <div class="cat-arrow">Browse →</div>
    `;
    card.addEventListener('click', () => {
      setFilter(cat.id);
      document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(card);
  });
}

function renderProducts(filter = 'all') {
  const grid = document.getElementById('productsGrid');
  if(!grid) return;
  grid.innerHTML = '';
  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--ink-muted);padding:60px 0;font-size:16px;">No items found in this category yet.</p>`;
    return;
  }

  filtered.forEach((product, i) => {
    const card = document.createElement('div');
    card.className = 'product-card reveal';
    card.style.transitionDelay = `${i * 0.07}s`;
    const isLiked = likedProducts.has(product.id);
    const badgeHTML = product.badge ? `<span class="product-badge badge-${product.badge}">${product.badgeLabel}</span>` : '';

    card.innerHTML = `
      <div class="product-img">
        <span>${product.emoji}</span>
        <div class="product-img-overlay"></div>
        ${badgeHTML}
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${product.id}" aria-label="Like">
          ${isLiked ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="product-info">
        <div class="product-category-tag">${product.category}</div>
        <div class="product-title">${product.title}</div>
        <div class="product-condition">${product.condition}</div>
        <div class="product-footer">
          <div class="product-price"><span class="currency">$</span>${product.price}</div>
          <button class="view-btn" data-id="${product.id}">Details</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(parseInt(btn.dataset.id), btn);
    });
  });

  grid.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)));
  });
  setTimeout(observeReveal, 50);
}

function toggleLike(id, btn) {
  if (likedProducts.has(id)) {
    likedProducts.delete(id);
    btn.classList.remove('liked');
    btn.innerHTML = '🤍';
    btn.style.transform = 'scale(0.8)';
  } else {
    likedProducts.add(id);
    btn.classList.add('liked');
    btn.innerHTML = '❤️';
    btn.style.transform = 'scale(1.3)';
  }
  setTimeout(() => { btn.style.transform = ''; }, 200);
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderProducts(filter);
}

function openModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <div class="modal-image"><span>${product.emoji}</span></div>
    <div class="modal-details">
      <div class="modal-cat">${product.category}</div>
      <h2 class="modal-title">${product.title}</h2>
      <div class="modal-condition">${product.condition}</div>
      <div class="modal-price">$${product.price}</div>
      <p class="modal-desc">${product.description}</p>
      <div class="modal-seller">
        <div class="seller-avatar">${product.seller.avatar}</div>
        <div class="seller-info">
          <span class="seller-name">${product.seller.name}</span>
          <span class="seller-rating">${product.seller.rating}</span>
        </div>
      </div>
      <button class="buy-btn" id="buyBtn">Buy Now — $${product.price}</button>
    </div>
  `;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  document.getElementById('buyBtn').addEventListener('click', () => {
    if (product.ownerId === currentUser.id) return alert("You cannot buy your own item!");
    if (currentUser.balance < product.price) return alert("Insufficient balance!");
    currentUser.balance -= product.price;
    purchases.push({...product, purchasedAt: new Date().toLocaleDateString()});
    const idx = products.findIndex(p => p.id === product.id);
    if(idx !== -1) products.splice(idx, 1);
    alert(`🎉 You successfully purchased "${product.title}" for $${product.price}!\nNew Balance: $${currentUser.balance}`);
    closeModal();
    renderProducts(activeFilter);
    updateDashboardUI();
  });
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if(overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if(navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if(hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function observeReveal() {
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => observer.observe(el));
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if(form){
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = '✓ Message Sent!';
      btn.style.background = '#2d8f64';
      btn.disabled = true;
      form.reset();
      setTimeout(() => { btn.textContent = original; btn.style.background = ''; btn.disabled = false; }, 3000);
    });
  }
}

function initModal() {
  const mc = document.getElementById('modalClose');
  if(mc) mc.addEventListener('click', closeModal);
  const mo = document.getElementById('modalOverlay');
  if(mo) mo.addEventListener('click', (e) => { if (e.target === mo) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function initDashboardNav() {
  const dashboardView = document.getElementById('dashboardView');
  const marketplaceView = document.getElementById('marketplaceView');
  const navSellBtn = document.getElementById('navSellBtn');
  if(navSellBtn) {
    navSellBtn.addEventListener('click', (e) => {
      e.preventDefault();
      marketplaceView.style.display = 'none';
      dashboardView.style.display = 'block';
      switchDashTab('inventory');
      openCrudModal();
    });
  }
  document.querySelectorAll('.dash-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchDashTab(btn.dataset.tab));
  });
}

function switchDashTab(tabId) {
  document.querySelectorAll('.dash-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.dash-nav-btn[data-tab="${tabId}"]`)?.classList.add('active');
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  const t = document.getElementById(`tab-${tabId}`);
  if(t) t.classList.add('active');
}

function updateDashboardUI() {
  const db = document.getElementById('dashBalance');
  if(db) db.textContent = `$${currentUser.balance.toLocaleString()}`;
  const myItems = products.filter(p => p.ownerId === currentUser.id);
  const statsGrid = document.getElementById('statsGrid');
  if(statsGrid){
    statsGrid.innerHTML = `
      <div class="stat-card"><div class="stat-card-title">Total Revenue</div><div class="stat-card-value">$${storeStats.totalRevenue.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-card-title">Active Listings</div><div class="stat-card-value">${myItems.length}</div></div>
      <div class="stat-card"><div class="stat-card-title">Items Sold</div><div class="stat-card-value">${storeStats.itemsSold}</div></div>
    `;
  }
}

function initCrud() {
  const addBtn = document.getElementById('addNewBtn');
  if(addBtn) addBtn.addEventListener('click', () => openCrudModal());
  const closeBtn = document.getElementById('crudModalClose');
  if(closeBtn) closeBtn.addEventListener('click', closeCrudModal);
  const cancelBtn = document.getElementById('crudCancelBtn');
  if(cancelBtn) cancelBtn.addEventListener('click', closeCrudModal);
  const form = document.getElementById('crudForm');
  if(form) form.addEventListener('submit', (e) => { e.preventDefault(); saveProduct(); });
}

function openCrudModal(product = null) {
  document.getElementById('crudModalOverlay')?.classList.add('open');
}

function closeCrudModal() {
  document.getElementById('crudModalOverlay')?.classList.remove('open');
}

function saveProduct() {
  closeCrudModal();
  renderProducts(activeFilter);
  updateDashboardUI();
}

window.editProduct = function(id) { openCrudModal(); };
window.deleteProduct = function(id) {
  if(confirm('Are you sure you want to delete this listing?')) {
    const idx = products.findIndex(p => p.id === id);
    if(idx !== -1) { products.splice(idx, 1); renderProducts(activeFilter); updateDashboardUI(); }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderProducts('all');
  initFilters();
  initNavbar();
  initHamburger();
  initSmoothScroll();
  initModal();
  initContactForm();
  initDashboardNav();
  initCrud();
  updateDashboardUI();
  setTimeout(observeReveal, 100);
});