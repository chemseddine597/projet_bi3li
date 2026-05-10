[README.md](https://github.com/user-attachments/files/27572185/README.md)
# Bi3li — Backend PHP/MySQL

## Structure des fichiers

```
bi3li/
├── index.html          ← Front-End public (inchangé)
├── main.html           ← Plateforme (inchangé) — voir modification ci-dessous
├── style.css           (inchangé)
├── main.css            (inchangé)
├── script.js           (inchangé)
├── app.js              (inchangé)
├── api-client.js       ← NOUVEAU : remplace data.js côté client
├── .htaccess           ← NOUVEAU
├── config.php          ← NOUVEAU : connexion MySQL
├── schema.sql          ← NOUVEAU : base de données
└── api/
    ├── auth.php        ← NOUVEAU : login / register / logout
    ├── users.php       ← NOUVEAU : CRUD utilisateurs
    ├── products.php    ← NOUVEAU : CRUD produits
    ├── buy.php         ← NOUVEAU : achat
    └── store.php       ← NOUVEAU : stats admin
```

---

## 1. Créer la base de données

```bash
mysql -u root -p < schema.sql
```

---

## 2. Configurer la connexion

Éditer `config.php` :

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'bi3li');
define('DB_USER', 'root');   // ← votre utilisateur MySQL
define('DB_PASS', '');       // ← votre mot de passe MySQL
```

---

## 3. Modifier main.html (une seule ligne)

Remplacer dans `<head>` :

```html
<!-- AVANT -->
<script src="data.js"></script>
<script src="app.js"></script>

<!-- APRÈS -->
<script src="api-client.js"></script>
<script src="app.js"></script>
```

> `data.js` (localStorage) n'est plus nécessaire. `api-client.js` expose
> exactement la même interface `DB` mais appelle le backend PHP.

---

## 4. Adapter app.js (appels asynchrones)

`app.js` appelle `DB` de manière synchrone (ex: `DB.getUsers()`).
Avec le backend PHP, tous les appels `DB` deviennent des Promises.

**Exemple minimal** — dans `initAuth()` :

```js
// Avant
const sess = DB.getSession();
if (sess) { currentUser = DB.getUserById(sess.userId); showApp(); }

// Après
DB.init().then(() => {
  const sess = DB.getSession();
  if (sess && sess.user) { currentUser = sess.user; showApp(); return; }
  renderAuthPage('login');
});
```

**Pour le login** dans `renderAuthPage()` :

```js
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const user = await DB.login(email, pass);
    currentUser = user;
    showApp();
  } catch (err) {
    showFieldError(..., err.message);
  }
});
```

**Pour l'inscription** :

```js
const user = await DB.register({ name, email, password: pass, role, location });
```

---

## Comptes de démonstration (seed)

| Rôle   | Email                    | Mot de passe  |
|--------|--------------------------|---------------|
| Admin  | admin@minimarket.io      | password123   |
| Seller | seller@minimarket.io     | password123   |
| Buyer  | buyer@minimarket.io      | password123   |

---

## Endpoints API

| Méthode | URL                                  | Description              |
|---------|--------------------------------------|--------------------------|
| POST    | api/auth.php?action=login            | Connexion                |
| POST    | api/auth.php?action=register         | Inscription              |
| POST    | api/auth.php?action=logout           | Déconnexion              |
| GET     | api/users.php                        | Liste utilisateurs       |
| GET     | api/users.php?id=X                   | Profil utilisateur       |
| PUT     | api/users.php?id=X                   | Modifier profil          |
| PUT     | api/users.php?id=X&action=password   | Changer mot de passe     |
| DELETE  | api/users.php?id=X                   | Supprimer compte         |
| GET     | api/products.php                     | Liste produits (filtres) |
| GET     | api/products.php?id=X                | Détail produit           |
| POST    | api/products.php                     | Ajouter produit          |
| PUT     | api/products.php?id=X                | Modifier produit         |
| DELETE  | api/products.php?id=X                | Supprimer produit        |
| POST    | api/buy.php                          | Acheter un produit       |
| GET     | api/store.php                        | Stats dashboard admin    |

Toutes les routes protégées nécessitent le header :
`Authorization: Bearer <token>`
