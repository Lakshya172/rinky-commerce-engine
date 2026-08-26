# 💍 Rinky Commerce Engine

> *Elegance You Can Wear* — the storefront for Rinky Jewellers, Awas Vikas, Kanpur.

A full-stack commerce engine architected with Node.js, Express, REST APIs, role-based access
control, authentication workflows, MongoDB Atlas, admin product CRUD, customer wishlists and
orders, and Brevo-powered transactional email verification.

Node.js + Express + MongoDB, with a server-rendered-free frontend: plain HTML, CSS and
vanilla JS, no build step and no framework.

---

## Stack

| Layer      | Choice                                                        |
|------------|---------------------------------------------------------------|
| Runtime    | Node.js 18+ (uses the global `fetch`)                          |
| Server     | Express 4                                                      |
| Database   | MongoDB via Mongoose 8                                         |
| Sessions   | `express-session` + `connect-mongo` (server-side, 7 days)      |
| Passwords  | `bcryptjs`, 12 salt rounds                                     |
| Email      | Brevo transactional API                                        |
| Security   | `helmet`, `express-rate-limit`                                 |
| Frontend   | Static HTML in `views/`, shared JS in `public/js/`             |

---

## Project structure

```
├── app.js                  # Entry point: DB, sessions, security, routing
├── render.yaml             # Render blueprint
│
├── models/
│   ├── User.js             # Auth, wishlist, cart, verify/reset tokens
│   ├── Product.js          # Catalogue item (+ BIS hallmark fields)
│   ├── Order.js            # Order + shipping + Razorpay fields  ⚠️ not yet wired
│   └── Contact.js          # Contact-form message
│
├── routes/
│   ├── auth.js             # signup, verify, login, logout, profile, passwords
│   ├── products.js         # public catalogue read
│   ├── wishlist.js         # toggle & fetch (auth required)
│   ├── contact.js          # contact-form submission
│   └── admin.js            # product/message/user management (admin only)
│
├── middleware/auth.js      # requireAuth, requireAdmin
├── utils/mailer.js         # Brevo verification & reset emails
│
├── views/                  # 15 static HTML pages served by path
└── public/
    ├── css/style.css       # Design system (~2.5k lines)
    └── js/
        ├── shared.js       # Auth state, toasts, wishlist, cards, transitions
        └── navbar.js       # Injects navbar + footer into every page
```

---

## Local setup

**1. Install**

```bash
npm install
```

**2. Configure**

```bash
cp .env.example .env
```

Fill in `.env`. `SESSION_SECRET` is mandatory — the server exits on startup without it:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**3. Start MongoDB**, then run:

```bash
npm run dev
```

Open http://localhost:3000. On first boot the app seeds 8 sample products and — only if
`ADMIN_EMAIL` and `ADMIN_PASSWORD` are set — creates the admin account.

---

## Deploying to Render

The repo ships a `render.yaml` blueprint. Point Render at this repository and it will pick up
the build command, start command and health check automatically.

**Before the first deploy you must provision a database.** Render does not host MongoDB —
create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas), allow access from
`0.0.0.0/0` (Render's outbound IPs are not static on the free plan), and use its SRV
connection string as `MONGO_URI`. A `localhost` URI will fail and the app will exit.

Set these in the Render dashboard under **Environment**:

| Variable             | Notes                                                        |
|----------------------|--------------------------------------------------------------|
| `NODE_ENV`           | `production` — enables secure cookies and proxy trust        |
| `MONGO_URI`          | Atlas SRV string                                             |
| `SESSION_SECRET`     | Generated for you by the blueprint                           |
| `BASE_URL`           | Your live URL, e.g. `https://<service>.onrender.com`         |
| `BREVO_API_KEY`      | From the Brevo dashboard                                     |
| `BREVO_SENDER_EMAIL` | Must be a verified sender in Brevo                           |
| `BREVO_SENDER_NAME`  | Display name on outgoing mail                                |
| `ADMIN_EMAIL`        | Bootstrap admin login                                        |
| `ADMIN_PASSWORD`     | Use a strong, unique value                                   |
| `ADMIN_NAME`         | Optional, defaults to `Administrator`                        |

`BASE_URL` matters: verification and password-reset links are built from it, so if it is wrong
those emails will point somewhere unreachable.

Health check: `GET /healthz` returns `200` when Mongo is connected, `503` otherwise.

> **Free-plan note:** Render spins the service down after inactivity, so the first request
> after an idle period takes a while to respond.

---

## API

### Pages

| URL | Description |
|-----|-------------|
| `/` | Home — hero, categories, featured |
| `/products` | Collection, with search and category filter |
| `/product?id=X` | Product detail |
| `/about`, `/contact` | Static content + contact form |
| `/login`, `/signup` | Login / sign-up (tabbed; `/signup` redirects) |
| `/profile`, `/wishlist` | Account pages (auth required) |
| `/forgot-password`, `/reset-password`, `/verify-email` | Account recovery flows |
| `/admin` | Admin dashboard (admin only) |

### Endpoints

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/signup` | — |
| GET | `/api/auth/verify-email/:token` | — |
| POST | `/api/auth/login` / `/logout` | — |
| POST | `/api/auth/forgot-password` / `/reset-password` | — |
| GET | `/api/auth/me` | — |
| PUT | `/api/auth/profile` / `/change-password` | user |
| GET | `/api/products` / `/api/products/:id` | — |
| GET | `/api/wishlist` | user |
| POST | `/api/wishlist/:productId` | user |
| POST | `/api/contact` | — |
| GET | `/api/admin/stats` / `/products` / `/messages` / `/users` | admin |
| POST | `/api/admin/products` / `/seed` / `/users/:id/reset-password` | admin |
| PATCH | `/api/admin/products/:id/featured` | admin |
| DELETE | `/api/admin/products/:id` / `/messages/:id` / `/users/:id` | admin |

The four credential endpoints are rate limited to 20 requests per IP per 15 minutes.

---

## Security notes

- Passwords are bcrypt-hashed (12 rounds) and never returned by any endpoint.
- Sessions live in MongoDB; cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- `requireAdmin` guards every `/api/admin/*` route at the router level.
- Unverified accounts cannot log in (admin accounts are exempt).
- No secrets are committed — `.env` is gitignored; `.env.example` documents the shape.

**Content-Security-Policy is currently disabled** in the helmet config. The pages pull fonts,
scripts and images from Google Fonts, cdnjs, jsdelivr and Unsplash, and use inline scripts and
styles throughout, so a meaningful policy needs those inlined or nonce'd first.

---

## Not built yet

Cart and checkout do not exist. `User.cart`, `models/Order.js` and the `razorpay` dependency
are all present but **nothing references them** — there is no add-to-cart control, no cart
page, no orders route and no payment flow. Treat that scaffolding as a starting point, not as
working code.

---

*Crafted for Rinky Jewellers, Awas Vikas, Kanpur.*
