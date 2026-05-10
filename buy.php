<?php
// =============================================
//  Bi3li — api/products.php
//  GET    /api/products.php              → liste publique (filtres via query string)
//  GET    /api/products.php?id=X         → détail + incrément views
//  POST   /api/products.php              → ajouter produit (seller/admin)
//  PUT    /api/products.php?id=X         → modifier (seller propriétaire/admin)
//  DELETE /api/products.php?id=X         → supprimer (seller propriétaire/admin)
// =============================================
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

// ---- GET liste ----
if ($method === 'GET' && !$id) {
    $db = getDB();

    $where  = ['1=1'];
    $params = [];

    // Filtres correspondant aux selects du Front
    if (!empty($_GET['category']) && $_GET['category'] !== 'all') {
        $where[] = 'category = ?'; $params[] = $_GET['category'];
    }
    if (!empty($_GET['status']) && $_GET['status'] !== 'all') {
        $where[] = 'status = ?'; $params[] = $_GET['status'];
    }
    if (!empty($_GET['seller_id'])) {
        $where[] = 'seller_id = ?'; $params[] = $_GET['seller_id'];
    }
    if (!empty($_GET['q'])) {
        $q = '%' . $_GET['q'] . '%';
        $where[] = '(title LIKE ? OR location LIKE ? OR seller_name LIKE ?)';
        $params  = array_merge($params, [$q, $q, $q]);
    }
    if (!empty($_GET['from_date'])) {
        $where[] = 'posted_date >= ?'; $params[] = $_GET['from_date'];
    }

    // Tri correspondant aux options du sfSort du Front
    $sortMap = [
        'newest'     => 'posted_date DESC',
        'oldest'     => 'posted_date ASC',
        'price-asc'  => 'price ASC',
        'price-desc' => 'price DESC',
    ];
    $sort = $sortMap[$_GET['sort'] ?? 'newest'] ?? 'posted_date DESC';

    $sql  = "SELECT * FROM products WHERE " . implode(' AND ', $where) . " ORDER BY $sort";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['products' => $stmt->fetchAll()]);
}

// ---- GET détail ----
if ($method === 'GET' && $id) {
    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) jsonError('Product not found.', 404);

    // Incrémenter les vues
    $db->prepare("UPDATE products SET views = views + 1 WHERE id = ?")->execute([$id]);
    $product['views']++;

    jsonResponse(['product' => $product]);
}

// ---- POST ajouter ----
if ($method === 'POST') {
    $me   = requireAuth();
    requireRole($me, ['seller', 'admin']);
    $body = getJsonBody();

    // Champs du formulaire openAddProductModal()
    $title       = trim($body['title']       ?? '');
    $price       = (float)($body['price']    ?? 0);
    $category    = $body['category']         ?? '';
    $condition   = $body['condition']        ?? '';
    $brand       = trim($body['brand']       ?? '—');
    $size        = trim($body['size']        ?? '—');
    $location    = trim($body['location']    ?? '—');
    $emoji       = trim($body['emoji']       ?? '📦');
    $description = trim($body['description'] ?? '');
    $seller_id   = $me['role'] === 'admin' ? ($body['seller_id'] ?? $me['id']) : $me['id'];

    if (!$title || !$category || !$condition || !$description || $price <= 0)
        jsonError('Please fill all required fields.');

    $validCats = ['clothes','shoes','electronics','furniture'];
    if (!in_array($category, $validCats)) jsonError('Invalid category.');

    $db = getDB();

    // Récupérer le nom du vendeur
    $s = $db->prepare("SELECT name FROM users WHERE id = ?");
    $s->execute([$seller_id]);
    $seller = $s->fetch();
    if (!$seller) jsonError('Seller not found.', 404);

    $pid    = generateId('p');
    $today  = date('Y-m-d');

    $db->prepare(
        "INSERT INTO products
         (id, title, category, price, emoji, badge, badge_label, `condition`, size, brand,
          seller_id, seller_name, location, description, likes, views, status, posted_date)
         VALUES (?, ?, ?, ?, ?, 'new', 'New', ?, ?, ?, ?, ?, ?, ?, 0, 0, 'available', ?)"
    )->execute([$pid, $title, $category, $price, $emoji, $condition, $size, $brand,
                $seller_id, $seller['name'], $location, $description, $today]);

    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$pid]);
    jsonResponse(['product' => $stmt->fetch()], 201);
}

// ---- PUT modifier ----
if ($method === 'PUT' && $id) {
    $me   = requireAuth();
    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) jsonError('Product not found.', 404);

    // Seul le vendeur propriétaire ou l'admin peut modifier
    if ($product['seller_id'] !== $me['id'] && $me['role'] !== 'admin')
        jsonError('Forbidden', 403);

    $body = getJsonBody();

    // Champs du formulaire openEditProductModal()
    $title       = trim($body['title']       ?? $product['title']);
    $price       = (float)($body['price']    ?? $product['price']);
    $category    = $body['category']         ?? $product['category'];
    $condition   = $body['condition']        ?? $product['condition'];
    $location    = trim($body['location']    ?? $product['location']);
    $status      = $body['status']           ?? $product['status'];
    $description = trim($body['description'] ?? $product['description']);

    if (!$title || $price <= 0) jsonError('Title and valid price are required.');
    if (!in_array($status, ['available','sold'])) jsonError('Invalid status.');

    $db->prepare(
        "UPDATE products
         SET title = ?, price = ?, category = ?, `condition` = ?, location = ?,
             status = ?, description = ?
         WHERE id = ?"
    )->execute([$title, $price, $category, $condition, $location, $status, $description, $id]);

    $stmt2 = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt2->execute([$id]);
    jsonResponse(['product' => $stmt2->fetch()]);
}

// ---- DELETE ----
if ($method === 'DELETE' && $id) {
    $me   = requireAuth();
    $db   = getDB();
    $stmt = $db->prepare("SELECT seller_id FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) jsonError('Product not found.', 404);

    if ($product['seller_id'] !== $me['id'] && $me['role'] !== 'admin')
        jsonError('Forbidden', 403);

    $db->prepare("DELETE FROM products WHERE id = ?")->execute([$id]);
    jsonResponse(['message' => 'Product deleted.']);
}

jsonError('Method not allowed.', 405);
