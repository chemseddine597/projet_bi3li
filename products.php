<?php
// =============================================
//  Bi3li — api/auth.php
//  POST /api/auth.php?action=login
//  POST /api/auth.php?action=register
//  POST /api/auth.php?action=logout
// =============================================
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

// ---- LOGIN ----
if ($action === 'login') {
    $email    = trim($body['email']    ?? '');
    $password =      $body['password'] ?? '';

    if (!$email || !$password) jsonError('Email and password are required.');

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([strtolower($email)]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonError('Invalid email or password.', 401);
    }

    // Créer session
    $token  = generateToken();
    $expiry = date('Y-m-d H:i:s', time() + SESSION_DURATION);
    $db->prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
       ->execute([$token, $user['id'], $expiry]);

    unset($user['password']);
    jsonResponse(['token' => $token, 'user' => $user]);
}

// ---- REGISTER ----
if ($action === 'register') {
    $name     = trim($body['name']     ?? '');
    $email    = trim($body['email']    ?? '');
    $password =      $body['password'] ?? '';
    $role     =      $body['role']     ?? 'buyer';
    $location = trim($body['location'] ?? '');

    // Validation
    if (!$name)                          jsonError('Full name is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Invalid email address.');
    if (strlen($password) < 6)           jsonError('Password must be at least 6 characters.');
    if (!in_array($role, ['buyer','seller'])) jsonError('Invalid role.');

    $db   = getDB();
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([strtolower($email)]);
    if ($stmt->fetch()) jsonError('Email already registered.');

    $id      = generateId('u');
    $hash    = password_hash($password, PASSWORD_BCRYPT);
    $avatar  = $role === 'seller' ? '🛍️' : '🛒';
    $badge   = $role === 'seller' ? 'Verified' : 'Buyer Member';
    $balance = $role === 'buyer'  ? 1000.00 : 0.00;
    $today   = date('Y-m-d');

    $db->prepare(
        "INSERT INTO users (id, email, password, role, name, avatar, location, badge, balance, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )->execute([$id, strtolower($email), $hash, $role, $name, $avatar, $location, $badge, $balance, $today]);

    // Créer session
    $token  = generateToken();
    $expiry = date('Y-m-d H:i:s', time() + SESSION_DURATION);
    $db->prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
       ->execute([$token, $id, $expiry]);

    $user = $db->prepare("SELECT * FROM users WHERE id = ?")->execute([$id]) ? null : null;
    $stmt2 = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt2->execute([$id]);
    $user = $stmt2->fetch();
    unset($user['password']);

    jsonResponse(['token' => $token, 'user' => $user], 201);
}

// ---- LOGOUT ----
if ($action === 'logout') {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/', $header, $m)) {
        getDB()->prepare("DELETE FROM sessions WHERE token = ?")->execute([$m[1]]);
    }
    jsonResponse(['message' => 'Signed out successfully.']);
}

jsonError('Unknown action.', 404);
