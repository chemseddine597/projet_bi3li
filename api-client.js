// =============================================
//  Bi3li — api-client.js  (XAMPP-safe)
// =============================================

const API_BASE = '/bi3li/api';// ---- Session token storage ----
const TokenStore = {
    get()  { return sessionStorage.getItem('bi3li_token'); },
    set(t) { sessionStorage.setItem('bi3li_token', t); },
    clear(){ sessionStorage.removeItem('bi3li_token'); },
};

// ---- Generic API request — robust version ----
async function apiRequest(path, method, body) {
    method = method || 'GET';
    body   = body   || null;

    const headers = { 'Content-Type': 'application/json' };
    const token   = TokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { method: method, headers: headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    var res;
    try {
        res = await fetch(API_BASE + '/' + path, opts);
    } catch (networkErr) {
        throw new Error('Network error — is XAMPP running? ' + networkErr.message);
    }

    // Read raw text first — this never throws even on empty body
    var raw = await res.text();

    if (!raw || raw.trim() === '') {
        // Empty body — treat as error
        throw new Error('Server returned empty response for ' + path + '. Check PHP error log.');
    }

    // Try JSON parse
    var data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        // PHP sent HTML error page or a notice/warning before JSON
        console.error('[Bi3li] Non-JSON from ' + path + ':\n' + raw);
        throw new Error('PHP error — check XAMPP logs. Preview: ' + raw.substring(0, 300));
    }

    if (!res.ok) {
        throw new Error(data.error || 'Request failed (' + res.status + ')');
    }
    return data;
}

// =============================================
//  DB object
// =============================================
const DB = {
    _users:    null,
    _products: null,
    _session:  null,

    async init() {
        var token = TokenStore.get();
        if (!token) return;
        try {
            var data = await apiRequest('auth.php?action=me');
            this._session = { userId: data.user.id, user: data.user };
        } catch (e) {
            console.warn('Session validation failed:', e.message);
            TokenStore.clear();
            this._session = null;
        }
    },

    getSession() { return this._session; },

    async login(email, password) {
        var data = await apiRequest('auth.php?action=login', 'POST', { email: email, password: password });
        TokenStore.set(data.token);
        this._session = { userId: data.user.id, user: data.user };
        return data.user;
    },

    async register(fields) {
        var data = await apiRequest('auth.php?action=register', 'POST', fields);
        TokenStore.set(data.token);
        this._session = { userId: data.user.id, user: data.user };
        return data.user;
    },

    async logout() {
        try { await apiRequest('auth.php?action=logout', 'POST'); } catch(e) {}
        TokenStore.clear();
        this._session  = null;
        this._users    = null;
        this._products = null;
    },

    // ---- Users ----
    async getUsers() {
        if (this._users) return this._users;
        var data = await apiRequest('users.php');
        this._users = data.users;
        return this._users;
    },

    async getUserById(id) {
        if (this._users) {
            var cached = this._users.find(function(u){ return u.id === id; });
            if (cached) return cached;
        }
        var data = await apiRequest('users.php?id=' + id);
        return data.user;
    },

    async updateUser(id, fields) {
        this._users = null;
        var data = await apiRequest('users.php?id=' + id, 'PUT', fields);
        return data.user;
    },

    async changePassword(id, current_password, new_password) {
        return apiRequest('users.php?id=' + id + '&action=password', 'PUT',
            { current_password: current_password, new_password: new_password });
    },

    async deleteUser(id) {
        this._users = null;
        return apiRequest('users.php?id=' + id, 'DELETE');
    },

    // ---- Products ----
    async getProducts(filters) {
        filters = filters || {};
        var qs = new URLSearchParams(filters).toString();
        var data = await apiRequest('products.php' + (qs ? '?' + qs : ''));
        this._products = data.products;
        return data.products;
    },

    async getProductById(id) {
        if (this._products) {
            var cached = this._products.find(function(p){ return p.id === id; });
            if (cached) return cached;
        }
        var data = await apiRequest('products.php?id=' + id);
        return data.product;
    },

    async getProductsBySeller(sellerId) {
        return this.getProducts({ seller_id: sellerId });
    },

    async addProduct(fields) {
        this._products = null;
        var data = await apiRequest('products.php', 'POST', fields);
        return data.product;
    },

    async updateProduct(id, fields) {
        this._products = null;
        var data = await apiRequest('products.php?id=' + id, 'PUT', fields);
        return data.product;
    },

    async deleteProduct(id) {
        this._products = null;
        return apiRequest('products.php?id=' + id, 'DELETE');
    },

    // ---- Buy ----
    async buyProduct(product_id) {
        return apiRequest('buy.php', 'POST', { product_id: product_id });
    },

    // ---- Store stats ----
    async getStore() {
        return apiRequest('store.php');
    },
};
