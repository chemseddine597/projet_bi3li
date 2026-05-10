// =============================================
//  Bi3li — api-client.js
//  Remplace data.js (localStorage) → appels PHP
//  Inclure CE fichier à la place de data.js dans main.html
// =============================================

const API_BASE = 'api'; // chemin relatif vers le dossier api/

// ---- Token de session ----
const TokenStore = {
    get()       { return sessionStorage.getItem('bi3li_token'); },
    set(t)      { sessionStorage.setItem('bi3li_token', t); },
    clear()     { sessionStorage.removeItem('bi3li_token'); },
};

// ---- Requête générique ----
async function apiRequest(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };// =============================================
//  Bi3li — api-client.js
//  Remplace data.js (localStorage) → appels PHP
//  Inclure CE fichier à la place de data.js dans main.html
// =============================================

const API_BASE = 'api'; // chemin relatif vers le dossier api/

// ---- Token de session ----
const TokenStore = {
    get()       { return sessionStorage.getItem('bi3li_token'); },
    set(t)      { sessionStorage.setItem('bi3li_token', t); },
    clear()     { sessionStorage.removeItem('bi3li_token'); },
};

// ---- Requête générique ----
async function apiRequest(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token   = TokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    const res  = await fetch(API_BASE + '/' + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// =============================================
//  DB — interface identique à l'ancienne data.js
//  pour ne PAS toucher à app.js
// =============================================
const DB = {
    // Cache local (évite les allers-retours inutiles)
    _users:    null,
    _products: null,
    _session:  null,   // { userId, user }

    // ---- Init ----
    async init() {
        const token = TokenStore.get();
        if (token) {
            try {
                // Vérifier que le token est encore valide
                // On recharge en lazy dans getSession()
                this._session = { userId: '__pending__' };
            } catch { TokenStore.clear(); }
        }
    },

    // ---- Session ----
    getSession() { return this._session; },

    async login(email, password) {
        const data = await apiRequest('auth.php?action=login', 'POST', { email, password });
        TokenStore.set(data.token);
        this._session = { userId: data.user.id, user: data.user };
        return data.user;
    },

    async register(fields) {
        const data = await apiRequest('auth.php?action=register', 'POST', fields);
        TokenStore.set(data.token);
        this._session = { userId: data.user.id, user: data.user };
        return data.user;
    },

    async logout() {
        try { await apiRequest('auth.php?action=logout', 'POST'); } catch {}
        TokenStore.clear();
        this._session = null;
        this._users   = null;
        this._products = null;
    },

    // ---- Users ----
    async getUsers() {
        if (this._users) return this._users;
        const data = await apiRequest('users.php');
        this._users = data.users;
        return this._users;
    },

    async getUserById(id) {
        const data = await apiRequest('users.php?id=' + id);
        return data.user;
    },

    async updateUser(id, fields) {
        this._users = null; // invalider le cache
        const data  = await apiRequest('users.php?id=' + id, 'PUT', fields);
        return data.user;
    },

    async changePassword(id, current_password, new_password) {
        return apiRequest('users.php?id=' + id + '&action=password', 'PUT',
            { current_password, new_password });
    },

    async deleteUser(id) {
        this._users = null;
        return apiRequest('users.php?id=' + id, 'DELETE');
    },

    // ---- Products ----
    async getProducts(filters = {}) {
        const qs = new URLSearchParams(filters).toString();
        const data = await apiRequest('products.php' + (qs ? '?' + qs : ''));
        this._products = data.products;
        return data.products;
    },

    async getProductById(id) {
        const data = await apiRequest('products.php?id=' + id);
        return data.product;
    },

    async getProductsBySeller(sellerId) {
        return this.getProducts({ seller_id: sellerId });
    },

    async addProduct(fields) {
        this._products = null;
        const data = await apiRequest('products.php', 'POST', fields);
        return data.product;
    },

    async updateProduct(id, fields) {
        this._products = null;
        const data = await apiRequest('products.php?id=' + id, 'PUT', fields);
        return data.product;
    },

    async deleteProduct(id) {
        this._products = null;
        return apiRequest('products.php?id=' + id, 'DELETE');
    },

    // ---- Buy ----
    async buyProduct(product_id) {
        return apiRequest('buy.php', 'POST', { product_id });
    },

    // ---- Store stats (admin) ----
    async getStore() {
        const data = await apiRequest('store.php');
        return data;
    },
};

    const token   = TokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    const res  = await fetch(API_BASE + '/' + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// =============================================
//  DB — interface identique à l'ancienne data.js
//  pour ne PAS toucher à app.js
// =============================================
const DB = {
    // Cache local (évite les allers-retours inutiles)
    _users:    null,
    _products: null,
    _session:  null,   // { userId, user }

    // ---- Init ----
    async init() {
        const token = TokenStore.get();
        if (token) {
            try {
                // Vérifier que le token est encore valide
                // On recharge en lazy dans getSession()
                this._session = { userId: '__pending__' };
            } catch { TokenStore.clear(); }
        }
    },

    // ---- Session ----
    getSession() { return this._session; },

    async login(email, password) {
        const data = await apiRequest('auth.php?action=login', 'POST', { email, password });
        TokenStore.set(data.token);
        this._session = { userId: data.user.id, user: data.user };
        return data.user;
    },

    async register(fields) {
        const data = await apiRequest('auth.php?action=register', 'POST', fields);
        TokenStore.set(data.token);
        this._session = { userId: data.user.id, user: data.user };
        return data.user;
    },

    async logout() {
        try { await apiRequest('auth.php?action=logout', 'POST'); } catch {}
        TokenStore.clear();
        this._session = null;
        this._users   = null;
        this._products = null;
    },

    // ---- Users ----
    async getUsers() {
        if (this._users) return this._users;
        const data = await apiRequest('users.php');
        this._users = data.users;
        return this._users;
    },

    async getUserById(id) {
        const data = await apiRequest('users.php?id=' + id);
        return data.user;
    },

    async updateUser(id, fields) {
        this._users = null; // invalider le cache
        const data  = await apiRequest('users.php?id=' + id, 'PUT', fields);
        return data.user;
    },

    async changePassword(id, current_password, new_password) {
        return apiRequest('users.php?id=' + id + '&action=password', 'PUT',
            { current_password, new_password });
    },

    async deleteUser(id) {
        this._users = null;
        return apiRequest('users.php?id=' + id, 'DELETE');
    },

    // ---- Products ----
    async getProducts(filters = {}) {
        const qs = new URLSearchParams(filters).toString();
        const data = await apiRequest('products.php' + (qs ? '?' + qs : ''));
        this._products = data.products;
        return data.products;
    },

    async getProductById(id) {
        const data = await apiRequest('products.php?id=' + id);
        return data.product;
    },

    async getProductsBySeller(sellerId) {
        return this.getProducts({ seller_id: sellerId });
    },

    async addProduct(fields) {
        this._products = null;
        const data = await apiRequest('products.php', 'POST', fields);
        return data.product;
    },

    async updateProduct(id, fields) {
        this._products = null;
        const data = await apiRequest('products.php?id=' + id, 'PUT', fields);
        return data.product;
    },

    async deleteProduct(id) {
        this._products = null;
        return apiRequest('products.php?id=' + id, 'DELETE');
    },

    // ---- Buy ----
    async buyProduct(product_id) {
        return apiRequest('buy.php', 'POST', { product_id });
    },

    // ---- Store stats (admin) ----
    async getStore() {
        const data = await apiRequest('store.php');
        return data;
    },
};
