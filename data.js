// =============================================
//  Bi3li — Data Layer (Enhanced)
//  Backed by LocalStorage for persistence
// =============================================

const DB_KEY = 'minimarket_db';

// ---- DEFAULT SEED DATA ----
const SEED = {
  users: [
    {
      id: "u_admin", email: "admin@minimarket.io", password: "password123",
      role: "admin", name: "Admin User", avatar: "👑",
      location: "Paris, FR", bio: "Platform administrator.",
      badge: "Store Admin", createdAt: "2023-01-01", balance: 0,
    },
    {
      id: "u_s1", email: "seller@minimarket.io", password: "password123",
      role: "seller", name: "Sophie Martin", avatar: "👩",
      location: "Paris, FR", bio: "Fashion lover reselling quality second-hand clothes.",
      badge: "Top Seller", createdAt: "2023-03-15", balance: 3240,
    },
    {
      id: "u_b1", email: "buyer@minimarket.io", password: "password123",
      role: "buyer", name: "Nour Hassan", avatar: "👩",
      location: "Tunis, TN", bio: "Fashion & lifestyle buyer.",
      badge: "Buyer Member", createdAt: "2024-02-10", balance: 1500,
    },
  ],
  products: [
    {
      id: "p1", title: "Levi's 501 Jeans", category: "clothes", price: 35,
      emoji: "👖", badge: "new", badgeLabel: "New",
      condition: "Like New", size: "M", brand: "Levi's",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Paris, FR",
      description: "Classic Levi's 501 straight-cut jeans in excellent condition.",
      likes: 14, views: 89, status: "available",
      postedDate: "2025-04-28",
    },
    {
      id: "p2", title: "Nike Air Max 270", category: "shoes", price: 68,
      emoji: "👟", badge: "hot", badgeLabel: "🔥 Hot",
      condition: "Good", size: "42", brand: "Nike",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Lyon, FR",
      description: "Nike Air Max 270 in grey/white. Great daily sneaker.",
      likes: 31, views: 204, status: "available",
      postedDate: "2025-04-25",
    },
    {
      id: "p3", title: "iPhone 13 — 128GB", category: "electronics", price: 340,
      emoji: "📱", badge: "deal", badgeLabel: "% Deal",
      condition: "Very Good", size: "—", brand: "Apple",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Algiers, DZ",
      description: "iPhone 13 128GB Midnight Blue. Battery health 92%.",
      likes: 47, views: 389, status: "available",
      postedDate: "2025-04-20",
    },
    {
      id: "p4", title: "Scandinavian Chair", category: "furniture", price: 90,
      emoji: "🪑", badge: null, badgeLabel: "",
      condition: "Good", size: "—", brand: "Handmade",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Bordeaux, FR",
      description: "Solid oak Scandinavian dining chair. Timeless design.",
      likes: 9, views: 67, status: "available",
      postedDate: "2025-04-18",
    },
    {
      id: "p5", title: "Sony WH-1000XM5", category: "electronics", price: 175,
      emoji: "🎧", badge: "deal", badgeLabel: "% Deal",
      condition: "Like New", size: "—", brand: "Sony",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Paris, FR",
      description: "Sony WH-1000XM5 noise-cancelling headphones. Used 3 months.",
      likes: 38, views: 271, status: "available",
      postedDate: "2025-04-12",
    },
    {
      id: "p6", title: "MacBook Air M2", category: "electronics", price: 780,
      emoji: "💻", badge: "deal", badgeLabel: "% Deal",
      condition: "Very Good", size: "13\"", brand: "Apple",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Lyon, FR",
      description: "MacBook Air M2 13-inch Silver, 8GB RAM, 256GB SSD.",
      likes: 63, views: 521, status: "available",
      postedDate: "2025-04-01",
    },
    {
      id: "p7", title: "Summer Floral Dress", category: "clothes", price: 28,
      emoji: "👗", badge: "new", badgeLabel: "New",
      condition: "Like New", size: "S", brand: "Zara",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Bordeaux, FR",
      description: "Zara floral midi dress, worn once. Comes in original bag.",
      likes: 17, views: 112, status: "available",
      postedDate: "2025-04-03",
    },
    {
      id: "p8", title: "Adidas Campus 00s", category: "shoes", price: 55,
      emoji: "👟", badge: null, badgeLabel: "",
      condition: "Good", size: "40", brand: "Adidas",
      sellerId: "u_s1", sellerName: "Sophie Martin",
      location: "Paris, FR",
      description: "Adidas Campus 00s brown/off-white. Worn 5-6 times.",
      likes: 19, views: 133, status: "sold",
      postedDate: "2025-04-10",
    },
  ],
  session: null, // { userId }
  store: {
    totalRevenue: 48320, monthRevenue: 6840,
    totalOrders: 1247, monthOrders: 184,
    totalUsers: 3812, monthUsers: 312,
    avgRating: 4.8,
    revenueChart: [3200, 4100, 3800, 5200, 4700, 6100, 5800, 6840],
    months: ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"],
    categories: [
      { name: "Clothes",     count: 412, pct: 33 },
      { name: "Electronics", count: 298, pct: 24 },
      { name: "Shoes",       count: 311, pct: 25 },
      { name: "Furniture",   count: 226, pct: 18 },
    ],
    recentActivity: [
      { type: "sale",   text: "Nike Air Max 270 sold to Amira T.",  time: "2 min ago",  amount: 68   },
      { type: "join",   text: "New seller Karim B. joined",         time: "14 min ago", amount: null },
      { type: "sale",   text: "iPhone 13 sold to Sophie M.",        time: "1 hr ago",   amount: 340  },
      { type: "review", text: "Léa D. left a 5-star review",        time: "2 hr ago",   amount: null },
      { type: "sale",   text: "Vintage Chair sold to Omar F.",      time: "3 hr ago",   amount: 90   },
    ],
  },
};

// ---- DB API ----
const DB = {
  _data: null,

  init() {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      try { this._data = JSON.parse(stored); }
      catch { this._data = JSON.parse(JSON.stringify(SEED)); }
    } else {
      this._data = JSON.parse(JSON.stringify(SEED));
    }
    // Migrate: ensure all products have location & postedDate
    this._data.products.forEach(p => {
      if (!p.location) p.location = "—";
      if (!p.postedDate) p.postedDate = "2025-01-01";
    });
    this.save();
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
  },

  reset() {
    localStorage.removeItem(DB_KEY);
    this._data = JSON.parse(JSON.stringify(SEED));
    this.save();
  },

  // ---- Session ----
  getSession() { return this._data.session; },
  setSession(userId) { this._data.session = userId ? { userId } : null; this.save(); },

  // ---- Users ----
  getUsers()        { return this._data.users; },
  getUserById(id)   { return this._data.users.find(u => u.id === id) || null; },
  getUserByEmail(e) { return this._data.users.find(u => u.email.toLowerCase() === e.toLowerCase()) || null; },

  registerUser(data) {
    if (this.getUserByEmail(data.email)) return { error: "Email already registered." };
    const user = {
      id: "u_" + Date.now(),
      email: data.email,
      password: data.password,
      role: data.role || "buyer",
      name: data.name,
      avatar: data.role === "seller" ? "🛍️" : "🛒",
      location: data.location || "",
      bio: "",
      badge: data.role === "seller" ? "Verified" : "Buyer Member",
      createdAt: new Date().toISOString().slice(0,10),
      balance: data.role === "buyer" ? 1000 : 0,
    };
    this._data.users.push(user);
    this.save();
    return { user };
  },

  updateUser(id, fields) {
    const u = this.getUserById(id);
    if (!u) return { error: "User not found." };
    Object.assign(u, fields);
    this.save();
    return { user: u };
  },

  deleteUser(id) {
    const idx = this._data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this._data.users.splice(idx, 1);
    this._data.products = this._data.products.filter(p => p.sellerId !== id);
    this.save();
    return true;
  },

  // ---- Products ----
  getProducts()        { return this._data.products; },
  getProductById(id)   { return this._data.products.find(p => p.id === id) || null; },
  getProductsBySeller(sid) { return this._data.products.filter(p => p.sellerId === sid); },

  addProduct(data) {
    const p = {
      id: "p_" + Date.now(),
      title: data.title, category: data.category, price: data.price,
      emoji: data.emoji || "📦", badge: "new", badgeLabel: "New",
      condition: data.condition, size: data.size || "—", brand: data.brand || "—",
      sellerId: data.sellerId, sellerName: data.sellerName || "—",
      location: data.location || "—",
      description: data.description,
      likes: 0, views: 0, status: "available",
      postedDate: new Date().toISOString().slice(0,10),
    };
    this._data.products.unshift(p);
    this.save();
    return p;
  },

  updateProduct(id, fields) {
    const p = this.getProductById(id);
    if (!p) return null;
    Object.assign(p, fields);
    this.save();
    return p;
  },

  deleteProduct(id) {
    const idx = this._data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this._data.products.splice(idx, 1);
    this.save();
    return true;
  },

  // ---- Store stats ----
  getStore() { return this._data.store; },
};