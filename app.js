require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const mongoose     = require('mongoose');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const methodOverride = require('method-override');
const path         = require('path');
const User         = require('./models/User');
const Product      = require('./models/Product');

const app = express();

// Render (and most PaaS) terminate TLS at a proxy in front of the app. Without
// this, secure cookies are never set and the rate limiter sees one shared IP.
const IS_PROD = process.env.NODE_ENV === 'production';
if (IS_PROD) app.set('trust proxy', 1);

// ── DB ────────────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rinky_jewellers';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    try {
      // Bootstrap admin accounts from numbered env slots: ADMIN_*, ADMIN2_*,
      // ADMIN3_* and so on. A slot is used only when both its email and its
      // password are set, so no known-credential account appears by accident.
      // Existing users are never modified — to rotate a password, use the admin
      // panel or delete the user and restart.
      const adminSlots = ['ADMIN', 'ADMIN2', 'ADMIN3', 'ADMIN4', 'ADMIN5'];
      let bootstrapped = 0;

      for (const slot of adminSlots) {
        const email    = process.env[`${slot}_EMAIL`];
        const password = process.env[`${slot}_PASSWORD`];
        if (!email || !password) continue;

        bootstrapped++;
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
          // Make sure a pre-existing account named in a slot really is an admin.
          if (existing.role !== 'admin') {
            existing.role = 'admin';
            existing.isVerified = true;
            await existing.save();
            console.log(`✅ Promoted ${email} to admin.`);
          }
          continue;
        }

        await User.create({
          name: process.env[`${slot}_NAME`] || 'Administrator',
          email,
          password,
          role: 'admin',
          isVerified: true
        });
        console.log(`✅ Admin account created for ${email}.`);
      }

      if (bootstrapped === 0) {
        console.warn('⚠️  No ADMIN_EMAIL / ADMIN_PASSWORD pair set — skipping admin bootstrap.');
      }

      // Auto-seed sample products if none exist
      const prodCount = await Product.countDocuments();
      if (prodCount === 0) {
        await Product.insertMany([
          {
            name: 'Royal Kundan Bridal Choker Necklace',
            price: 185000,
            category: 'Necklaces',
            image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
            description: 'An exquisite heirloom bridal choker necklace handcrafted in 22K hallmarked yellow gold with luminous uncut polki gems and radiant emerald drops.',
            material: '22K Hallmarked Gold',
            weight: '42.5 g',
            featured: true,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-916-KNP-2024-01'
          },
          {
            name: 'Artisanal Solitaire Crown Ring',
            price: 78500,
            category: 'Rings',
            image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
            description: 'A breathtaking 6-prong solitaire diamond ring featuring a brilliant 58-facet gemstone set on a sculpted 18K yellow gold band.',
            material: '18K Diamond & Gold',
            weight: '6.2 g',
            featured: true,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-750-KNP-2024-08'
          },
          {
            name: 'Temple Carved Mayur Jhumkas',
            price: 64200,
            category: 'Earrings',
            image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
            description: 'Intricately hand-engraved peacock motif temple jhumkas adorned with delicate hanging gold beads and floral ear studs.',
            material: '22K Hallmarked Gold',
            weight: '18.4 g',
            featured: true,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-916-KNP-2024-14'
          },
          {
            name: 'Regal Filigree Antique Kada Bangles',
            price: 142000,
            category: 'Bangles',
            image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
            description: 'A magnificent pair of solid 22K gold kadas featuring traditional Indian filigree craftsmanship with secure screw clasps.',
            material: '22K Hallmarked Gold',
            weight: '38.0 g',
            featured: true,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-916-KNP-2024-22'
          },
          {
            name: 'Imperial Emerald & Diamond Cocktail Ring',
            price: 92000,
            category: 'Rings',
            image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
            description: 'Striking emerald-cut Zambian emerald framed by a double halo of pave-set brilliant diamonds on polished 18K gold.',
            material: '18K Gold & Emerald',
            weight: '7.8 g',
            featured: true,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-750-KNP-2024-41'
          },
          {
            name: 'Chandbali Heritage Pearl Earrings',
            price: 54000,
            category: 'Earrings',
            image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800',
            description: 'Crescent-shaped Chandbali earrings with luminous Basra pearl fringe and intricate gold filigree embossing.',
            material: '22K Hallmarked Gold',
            weight: '15.2 g',
            featured: true,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-916-KNP-2024-52'
          },
          {
            name: 'Polki Diamond Grandeur Haar',
            price: 245000,
            category: 'Necklaces',
            image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800',
            description: 'A majestic multi-strand heritage necklace crafted with syndicate polki diamonds and hand-woven cluster pearls.',
            material: '22K Hallmarked Gold',
            weight: '55.0 g',
            featured: false,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-916-KNP-2024-35'
          },
          {
            name: 'Floral Nakshi Handcrafted Kada Pair',
            price: 168000,
            category: 'Bangles',
            image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
            description: 'Master artisan crafted pair of high-relief embossed Nakshi bangles depicting blooming lotus and royal vine patterns.',
            material: '22K Hallmarked Gold',
            weight: '44.1 g',
            featured: false,
            inStock: true,
            jewelryType: 'Gold',
            bisHallmark: true,
            bisNumber: 'RJ-916-KNP-2024-63'
          }
        ]);
        console.log('✨ Seeded 8 authentic luxury jewellery pieces into database.');
      }
    } catch (e) {
      console.error('Failed to ensure admin / seed products:', e);
    }
  })
  .catch(err => {
    // Exiting makes a bad deploy fail visibly instead of serving a site whose
    // every database-backed route is broken.
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

// ── Middleware ────────────────────────────────────────────────────────────────
// CSP is off because the pages load fonts, scripts and images from Google
// Fonts, cdnjs, jsdelivr and Unsplash and use inline scripts/styles throughout.
// Everything else helmet sets (HSTS, noSniff, frameguard, referrer policy) applies.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(methodOverride('_method'));

if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is not set. Add it to .env before starting the server.');
  process.exit(1);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD
  }
}));

// ── Serve static HTML pages ───────────────────────────────────────────────────
const VIEWS = path.join(__dirname, 'views');
const send  = f => (req, res) => res.sendFile(path.join(VIEWS, f));

app.get('/',            send('index.html'));
app.get('/about',       send('about.html'));
app.get('/products',    send('products.html'));
app.get('/contact',     send('contact.html'));
app.get('/login',       send('login.html'));
app.get('/signup',      send('signup.html'));
app.get('/profile',     send('profile.html'));
app.get('/product',     send('product-detail.html'));
app.get('/admin',       send('admin.html'));
app.get('/wishlist',    send('wishlist.html'));
app.get('/forgot-password', send('forgot-password.html'));
app.get('/reset-password', send('reset-password.html'));
app.get('/verify-email', send('verify-email.html'));

// ── API Routes ────────────────────────────────────────────────────────────────
// Throttle the credential endpoints; the rest of the API is left alone.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' }
});
app.use(['/api/auth/login', '/api/auth/signup', '/api/auth/forgot-password', '/api/auth/reset-password'], authLimiter);

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/contact',  require('./routes/contact'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/wishlist', require('./routes/wishlist'));

// ── SEO: sitemap ──────────────────────────────────────────────────────────────
const SITE_URL = (process.env.BASE_URL || 'https://www.rinkyjewellers.in').replace(/\/+$/, '');

const sitemapUrl = (loc, lastmod, changefreq, priority) => [
  '  <url>',
  `    <loc>${loc}</loc>`,
  `    <lastmod>${lastmod}</lastmod>`,
  `    <changefreq>${changefreq}</changefreq>`,
  `    <priority>${priority}</priority>`,
  '  </url>'
].join('\n');

app.get('/sitemap.xml', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { loc: '/',         changefreq: 'weekly',  priority: '1.0' },
      { loc: '/products', changefreq: 'weekly',  priority: '0.9' },
      { loc: '/about',    changefreq: 'monthly', priority: '0.6' },
      { loc: '/contact',  changefreq: 'monthly', priority: '0.6' }
    ];

    const products = await Product.find({ inStock: true })
      .select('_id updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const urls = [
      ...staticPages.map(p => sitemapUrl(SITE_URL + p.loc, today, p.changefreq, p.priority)),
      ...products.map(p => sitemapUrl(
        `${SITE_URL}/product?id=${p._id}`,
        new Date(p.updatedAt || Date.now()).toISOString().split('T')[0],
        'weekly',
        '0.8'
      ))
    ].join('\n');

    res.type('application/xml').send([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      '</urlset>'
    ].join('\n'));
  } catch (err) {
    res.status(500).type('text/plain').send('Failed to build sitemap.');
  }
});

// ── Health check (Render pings this) ──────────────────────────────────────────
app.get('/healthz', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const db = states[mongoose.connection.readyState] || 'unknown';
  res.status(db === 'connected' ? 200 : 503).json({ status: db === 'connected' ? 'ok' : 'degraded', db });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(path.join(VIEWS, '404.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Listening on port ${PORT}`));
