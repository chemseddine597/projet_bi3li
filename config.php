<?php
// =============================================
//  Bi3li — config.php
//  Connexion MySQL + helpers globaux
// =============================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'bi3li');
define('DB_USER', 'root');       // ← modifier selon votre serveur
define('DB_PASS', '');           // ← modifier selon votre serveur
define('DB_CHARSET', 'utf8mb4');

define('SESSION_DURATION', 86400 * 7); // 7 jours en secondes

// ---- Connexion PDO ----
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            jsonError('Database connection failed: ' . $e->getMessage(), 500);
        }
    }
    return $pdo;
}

// ---- Réponse JSON ----
function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400): void {
    jsonResponse(['error' => $message], $status);
}

// ---- CORS (dev) ----
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ---- Lire le body JSON ----
function getJsonBody(): array {
    $body = file_get_contents('php://input');
    return json_decode($body, true) ?? [];
}

// ---- Générer un ID unique ----
function generateId(string $prefix = 'u'): string {
    return $prefix . '_' . bin2hex(random_bytes(8));
}

// ---- Token de session ----
function generateToken(): string {
    return bin2hex(random_bytes(32));
}

// ---- Récupérer l'utilisateur via token (header Authorization: Bearer <token>) ----
function requireAuth(): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/', $header, $m)) {
        jsonError('Unauthorized', 401);
    }
    $token = $m[1];
    $db = getDB();
    $stmt = $db->prepare(
        "SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW()"
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) jsonError('Session expired or invalid', 401);
    return $user;
}

function requireRole(array $user, array $roles): void {
    if (!in_array($user['role'], $roles)) {
        jsonError('Forbidden', 403);
    }
}
