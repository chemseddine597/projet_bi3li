<?php
// =============================================
//  Bi3li — api/users.php
//  GET    /api/users.php              → list (admin only)
//  GET    /api/users.php?id=X         → single user
//  PUT    /api/users.php?id=X         → update profile
//  PUT    /api/users.php?id=X&action=password → change password
//  DELETE /api/users.php?id=X         → delete (admin or own account)
// =============================================
// FIX BUG #3 — this file previously contained store dashboard code.
// Correct users CRUD restored here.

require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;
$me     = requireAuth();

// ---- GET list (admin only) ----
if ($method === 'GET' && !$id) {
    requireRole($me, ['admin']);
    $db   = getDB();
    $stmt = $db->query(
        "SELECT id, email, role, name, avatar, location, bio, badge, balance, created_at
         FROM users ORDER BY created_at DESC"
    );
    jsonResponse(['users' => $stmt->fetchAll()]);
}

// ---- GET single user ----
if ($method === 'GET' && $id) {
    if ($me['id'] !== $id && $me['role'] !== 'admin') jsonError('Forbidden', 403);

    $db   = getDB();
    $stmt = $db->prepare(
        "SELECT id, email, role, name, avatar, location, bio, badge, balance, created_at
         FROM users WHERE id = ?"
    );
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) jsonError('User not found.', 404);
    jsonResponse(['user' => $user]);
}

// ---- PUT update profile ----
if ($method === 'PUT' && $id && $action !== 'password') {
    if ($me['id'] !== $id && $me['role'] !== 'admin') jsonError('Forbidden', 403);

    $body     = getJsonBody();
    $name     = trim($body['name']     ?? '');
    $location = trim($body['location'] ?? '');
    $bio      = trim($body['bio']      ?? '');

    if (!$name) jsonError('Full name is required.');

    $db = getDB();
    $db->prepare("UPDATE users SET name = ?, location = ?, bio = ? WHERE id = ?")
       ->execute([$name, $location, $bio, $id]);

    $stmt = $db->prepare(
        "SELECT id, email, role, name, avatar, location, bio, badge, balance, created_at
         FROM users WHERE id = ?"
    );
    $stmt->execute([$id]);
    jsonResponse(['user' => $stmt->fetch()]);
}

// ---- PUT change password ----
if ($method === 'PUT' && $id && $action === 'password') {
    if ($me['id'] !== $id) jsonError('Forbidden', 403);

    $body    = getJsonBody();
    $current = $body['current_password'] ?? '';
    $newPwd  = $body['new_password']     ?? '';

    // FIX BUG #6 — use password_verify() not plain comparison
    if (!password_verify($current, $me['password'])) jsonError('Current password is incorrect.');
    if (strlen($newPwd) < 6) jsonError('New password must be at least 6 characters.');

    $hash = password_hash($newPwd, PASSWORD_BCRYPT);
    getDB()->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hash, $id]);
    jsonResponse(['message' => 'Password updated successfully.']);
}

// ---- DELETE user ----
if ($method === 'DELETE' && $id) {
    if ($me['id'] !== $id && $me['role'] !== 'admin') jsonError('Forbidden', 403);

    $db = getDB();
    $db->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$id]);
    $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
    jsonResponse(['message' => 'Account deleted.']);
}

jsonError('Method not allowed.', 405);
