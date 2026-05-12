<?php
// =============================================
//  Bi3li — api/buy.php
//  POST /api/buy.php   → purchase a product
// =============================================
// FIX BUG #3 — this file previously contained products CRUD code.
// Correct buy logic restored here.

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Method not allowed.', 405);

$me   = requireAuth();
requireRole($me, ['buyer', 'admin']);

$body       = getJsonBody();
$product_id = trim($body['product_id'] ?? '');

if (!$product_id) jsonError('product_id is required.');

$db   = getDB();

// Load product
$stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
$stmt->execute([$product_id]);
$product = $stmt->fetch();

if (!$product)                          jsonError('Product not found.', 404);
if ($product['status'] !== 'available') jsonError('This product is no longer available.', 409);
if ($product['seller_id'] === $me['id']) jsonError('You cannot buy your own product.', 403);

// Check buyer balance
$buyerStmt = $db->prepare("SELECT balance FROM users WHERE id = ?");
$buyerStmt->execute([$me['id']]);
$buyer = $buyerStmt->fetch();

if ((float)$buyer['balance'] < (float)$product['price'])
    jsonError('Insufficient balance.', 402);

// Atomic transaction
$db->beginTransaction();
try {
    // Deduct from buyer
    $db->prepare("UPDATE users SET balance = balance - ? WHERE id = ?")
       ->execute([$product['price'], $me['id']]);

    // Credit to seller
    $db->prepare("UPDATE users SET balance = balance + ? WHERE id = ?")
       ->execute([$product['price'], $product['seller_id']]);

    // Mark product sold
    $db->prepare("UPDATE products SET status = 'sold' WHERE id = ?")
       ->execute([$product_id]);

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    jsonError('Purchase failed. Please try again.', 500);
}

jsonResponse([
    'message' => 'Purchase successful!',
    'product' => array_merge($product, ['status' => 'sold']),
]);
