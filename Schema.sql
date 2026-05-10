-- =============================================
--  Bi3li — Schéma MySQL
-- =============================================

CREATE DATABASE IF NOT EXISTS bi3li CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bi3li;

-- ---- USERS ----
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(40)  PRIMARY KEY,
  email       VARCHAR(191) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,         -- bcrypt hash
  role        ENUM('admin','seller','buyer') NOT NULL DEFAULT 'buyer',
  name        VARCHAR(150) NOT NULL,
  avatar      VARCHAR(20)  NOT NULL DEFAULT '🛒',
  location    VARCHAR(150)          DEFAULT '',
  bio         TEXT                  DEFAULT '',
  badge       VARCHAR(100)          DEFAULT 'Buyer Member',
  balance     DECIMAL(10,2)         DEFAULT 0.00,
  created_at  DATE         NOT NULL DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB;

-- ---- PRODUCTS ----
CREATE TABLE IF NOT EXISTS products (
  id          VARCHAR(40)  PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  category    ENUM('clothes','shoes','electronics','furniture') NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  emoji       VARCHAR(10)  NOT NULL DEFAULT '📦',
  badge       VARCHAR(20)           DEFAULT NULL,
  badge_label VARCHAR(50)           DEFAULT '',
  `condition` VARCHAR(100) NOT NULL,
  size        VARCHAR(50)           DEFAULT '—',
  brand       VARCHAR(100)          DEFAULT '—',
  seller_id   VARCHAR(40)  NOT NULL,
  seller_name VARCHAR(150)          DEFAULT '—',
  location    VARCHAR(150)          DEFAULT '—',
  description TEXT         NOT NULL,
  likes       INT          NOT NULL DEFAULT 0,
  views       INT          NOT NULL DEFAULT 0,
  status      ENUM('available','sold') NOT NULL DEFAULT 'available',
  posted_date DATE         NOT NULL DEFAULT (CURRENT_DATE),
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- SESSIONS ----
CREATE TABLE IF NOT EXISTS sessions (
  token       VARCHAR(64)  PRIMARY KEY,
  user_id     VARCHAR(40)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME     NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- SEED DATA (demo accounts) ----
INSERT IGNORE INTO users (id, email, password, role, name, avatar, location, bio, badge, balance, created_at) VALUES
('u_admin', 'admin@minimarket.io',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',  'Admin User',    '👑', 'Paris, FR',    'Platform administrator.',                   'Store Admin',  0,    '2023-01-01'),
('u_s1',    'seller@minimarket.io', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'seller', 'Sophie Martin', '👩', 'Paris, FR',    'Fashion lover reselling quality clothes.',  'Top Seller',   3240, '2023-03-15'),
('u_b1',    'buyer@minimarket.io',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'buyer',  'Nour Hassan',   '👩', 'Tunis, TN',    'Fashion & lifestyle buyer.',                'Buyer Member', 1500, '2024-02-10');
-- Note: all seed passwords = "password123"

INSERT IGNORE INTO products (id, title, category, price, emoji, badge, badge_label, `condition`, size, brand, seller_id, seller_name, location, description, likes, views, status, posted_date) VALUES
('p1','Levi\'s 501 Jeans',    'clothes',     35,  '👖', 'new',  'New',     'Like New', 'M',   'Levi\'s', 'u_s1','Sophie Martin','Paris, FR',   'Classic Levi\'s 501 straight-cut jeans.',          14, 89,  'available','2025-04-28'),
('p2','Nike Air Max 270',      'shoes',       68,  '👟', 'hot',  '🔥 Hot',  'Good',     '42',  'Nike',    'u_s1','Sophie Martin','Lyon, FR',    'Nike Air Max 270 grey/white.',                     31, 204, 'available','2025-04-25'),
('p3','iPhone 13 — 128GB',     'electronics', 340, '📱', 'deal', '% Deal',  'Very Good','—',   'Apple',   'u_s1','Sophie Martin','Algiers, DZ', 'iPhone 13 128GB Midnight Blue. Battery 92%.',     47, 389, 'available','2025-04-20'),
('p4','Scandinavian Chair',    'furniture',   90,  '🪑', NULL,   '',        'Good',     '—',   'Handmade','u_s1','Sophie Martin','Bordeaux, FR','Solid oak Scandinavian dining chair.',             9,  67,  'available','2025-04-18'),
('p5','Sony WH-1000XM5',       'electronics', 175, '🎧', 'deal', '% Deal',  'Like New', '—',   'Sony',    'u_s1','Sophie Martin','Paris, FR',   'Sony WH-1000XM5 noise-cancelling headphones.',    38, 271, 'available','2025-04-12'),
('p6','MacBook Air M2',        'electronics', 780, '💻', 'deal', '% Deal',  'Very Good','13"', 'Apple',   'u_s1','Sophie Martin','Lyon, FR',    'MacBook Air M2 13-inch Silver, 8GB/256GB.',       63, 521, 'available','2025-04-01'),
('p7','Summer Floral Dress',   'clothes',     28,  '👗', 'new',  'New',     'Like New', 'S',   'Zara',    'u_s1','Sophie Martin','Bordeaux, FR','Zara floral midi dress, worn once.',              17, 112, 'available','2025-04-03'),
('p8','Adidas Campus 00s',     'shoes',       55,  '👟', NULL,   '',        'Good',     '40',  'Adidas',  'u_s1','Sophie Martin','Paris, FR',   'Adidas Campus 00s brown/off-white.',              19, 133, 'sold',     '2025-04-10');
