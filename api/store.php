<?php
// =============================================
//  Bi3li — api/store.php
//  GET /api/store.php  → admin dashboard stats
// =============================================
// FIX BUG #3 — this file previously contained users CRUD code.
// Correct store stats logic restored here.

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Method not allowed.', 405);

$me = requireAuth();
requireRole($me, ['admin']);

$db = getDB();

// Global totals
$r = $db->query(
    "SELECT COUNT(*) AS total_orders, COALESCE(SUM(price),0) AS total_revenue
     FROM products WHERE status = 'sold'"
)->fetch();

$monthR = $db->query(
    "SELECT COUNT(*) AS month_orders, COALESCE(SUM(price),0) AS month_revenue
     FROM products
     WHERE status = 'sold'
       AND YEAR(posted_date)  = YEAR(CURDATE())
       AND MONTH(posted_date) = MONTH(CURDATE())"
)->fetch();

$users    = $db->query("SELECT COUNT(*) AS total FROM users")->fetch();
$newUsers = $db->query(
    "SELECT COUNT(*) AS cnt FROM users
     WHERE YEAR(created_at)  = YEAR(CURDATE())
       AND MONTH(created_at) = MONTH(CURDATE())"
)->fetch();

// Revenue for last 8 months (chart)
$revenueChart = $db->query(
    "SELECT DATE_FORMAT(posted_date,'%b') AS month,
            COALESCE(SUM(price),0) AS revenue
     FROM products
     WHERE status = 'sold'
       AND posted_date >= DATE_SUB(CURDATE(), INTERVAL 8 MONTH)
     GROUP BY YEAR(posted_date), MONTH(posted_date)
     ORDER BY MIN(posted_date) ASC"
)->fetchAll();

// Category breakdown
$cats        = $db->query(
    "SELECT category AS name, COUNT(*) AS count FROM products GROUP BY category"
)->fetchAll();
$total_prods = array_sum(array_column($cats, 'count')) ?: 1;
foreach ($cats as &$c) {
    $c['pct'] = round($c['count'] / $total_prods * 100);
}

// Recent activity (last 5 sold)
$activity = $db->query(
    "SELECT title, price, posted_date FROM products
     WHERE status = 'sold' ORDER BY posted_date DESC LIMIT 5"
)->fetchAll();

// Format activity for frontend compatibility
$activityFormatted = array_map(function($a) {
    return [
        'type'   => 'sale',
        'text'   => $a['title'] . ' sold',
        'time'   => date('M j', strtotime($a['posted_date'])),
        'amount' => (float)$a['price'],
    ];
}, $activity);

jsonResponse([
    'totalRevenue'   => (float)$r['total_revenue'],
    'monthRevenue'   => (float)$monthR['month_revenue'],
    'totalOrders'    => (int)$r['total_orders'],
    'monthOrders'    => (int)$monthR['month_orders'],
    'totalUsers'     => (int)$users['total'],
    'monthUsers'     => (int)$newUsers['cnt'],
    'avgRating'      => 4.8,
    'revenueChart'   => array_map(fn($r) => (float)$r['revenue'], $revenueChart),
    'months'         => array_map(fn($r) => $r['month'],           $revenueChart),
    'categories'     => $cats,
    'recentActivity' => $activityFormatted,
]);
