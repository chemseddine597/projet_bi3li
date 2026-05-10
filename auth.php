<?php
// =============================================
//  Bi3li — api/store.php
//  GET /api/store.php   → stats du tableau de bord admin (renderStoreDashboard)
// =============================================
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Method not allowed.', 405);

$me = requireAuth();
requireRole($me, ['admin']);

$db = getDB();

// Totaux globaux
$r = $db->query("SELECT
    COUNT(*) AS total_orders,
    COALESCE(SUM(price),0) AS total_revenue
  FROM products WHERE status = 'sold'")->fetch();

$monthR = $db->query("SELECT
    COUNT(*) AS month_orders,
    COALESCE(SUM(price),0) AS month_revenue
  FROM products
  WHERE status = 'sold'
    AND YEAR(posted_date)  = YEAR(CURDATE())
    AND MONTH(posted_date) = MONTH(CURDATE())")->fetch();

$users = $db->query("SELECT COUNT(*) AS total FROM users")->fetch();
$newUsers = $db->query("SELECT COUNT(*) AS cnt FROM users
  WHERE YEAR(created_at) = YEAR(CURDATE())
    AND MONTH(created_at) = MONTH(CURDATE())")->fetch();

// Revenus 8 derniers mois (pour le graphique revenueChart)
$revenueChart = $db->query(
    "SELECT DATE_FORMAT(posted_date,'%b') AS month,
            COALESCE(SUM(price),0) AS revenue
     FROM products
     WHERE status = 'sold'
       AND posted_date >= DATE_SUB(CURDATE(), INTERVAL 8 MONTH)
     GROUP BY YEAR(posted_date), MONTH(posted_date)
     ORDER BY MIN(posted_date) ASC"
)->fetchAll();

// Catégories
$cats = $db->query(
    "SELECT category AS name, COUNT(*) AS count FROM products GROUP BY category"
)->fetchAll();
$total_prods = array_sum(array_column($cats, 'count')) ?: 1;
foreach ($cats as &$c) $c['pct'] = round($c['count'] / $total_prods * 100);

// Activité récente (5 dernières ventes)
$activity = $db->query(
    "SELECT title, price, posted_date FROM products
     WHERE status = 'sold' ORDER BY posted_date DESC LIMIT 5"
)->fetchAll();

jsonResponse([
    'totalRevenue'  => (float)$r['total_revenue'],
    'monthRevenue'  => (float)$monthR['month_revenue'],
    'totalOrders'   => (int)$r['total_orders'],
    'monthOrders'   => (int)$monthR['month_orders'],
    'totalUsers'    => (int)$users['total'],
    'monthUsers'    => (int)$newUsers['cnt'],
    'revenueChart'  => array_column($revenueChart, 'revenue'),
    'months'        => array_column($revenueChart, 'month'),
    'categories'    => $cats,
    'recentActivity'=> $activity,
]);
