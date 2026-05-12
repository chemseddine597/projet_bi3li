<?php
// =============================================
//  Bi3li — api/auth.php
// =============================================
require_once __DIR__ . '/../config.php';
$action = $_GET['action'] ?? '';
$body   = getJsonBody();

// ---- ME — verify token ----
if ($action === 'me') {
    $me = requireAuth();
    unset($me['password']);
    jsonResponse(['user' => $me]);
}

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

    // Clean expired sessions
    $db->prepare("DELETE FROM sessions WHERE expires_at <= NOW()")->execute();

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

    if (!$name)                                        jsonError('Full name is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))    jsonError('Invalid email address.');
    if (strlen($password) < 6)                         jsonError('Password must be at least 6 characters.');
    if (!in_array($role, ['buyer', 'seller'], true))   jsonError('Invalid role.');

    $db   = getDB();
    $chk  = $db->prepare("SELECT id FROM users WHERE email = ?");
    $chk->execute([strtolower($email)]);
    if ($chk->fetch()) jsonError('Email already registered.');

    $id      = generateId('u');
    $hash    = password_hash($password, PASSWORD_BCRYPT);
    $avatar  = ($role === 'seller') ? '🛍️' : '🛒';
    $badge   = ($role === 'seller') ? 'Verified Seller' : 'Buyer Member';
    $balance = ($role === 'buyer')  ? 1000.00 : 0.00;
    $today   = date('Y-m-d');

    $db->prepare(
        "INSERT INTO users
           (id, email, password, role, name, avatar, location, bio, badge, balance, created_at)
         VALUES
           (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)"
    )->execute([$id, strtolower($email), $hash, $role, $name, $avatar, $location, $badge, $balance, $today]);

    $token  = generateToken();
    $expiry = date('Y-m-d H:i:s', time() + SESSION_DURATION);
    $db->prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
       ->execute([$token, $id, $expiry]);

    $stmt2 = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt2->execute([$id]);
    $user = $stmt2->fetch();
    unset($user['password']);

    jsonResponse(['token' => $token, 'user' => $user], 201);
}

// ---- LOGOUT ----
if ($action === 'logout') {
    $header = $_SERVER['HTTP_AUTHORIZATION']
           ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
           ?? '';
    if (!$header && function_exists('apache_request_headers')) {
        $ah = apache_request_headers();
        $header = $ah['Authorization'] ?? $ah['authorization'] ?? '';
    }
    if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
        getDB()->prepare("DELETE FROM sessions WHERE token = ?")->execute([trim($m[1])]);
    }
    jsonResponse(['message' => 'Signed out successfully.']);
}

jsonError('Unknown action.', 404);
