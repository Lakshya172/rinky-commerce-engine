const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');
const Contact = require('../models/Contact');
const User    = require('../models/User');
const { requireAdmin } = require('../middleware/auth');
const { validateRates, setCurrentRates } = require('../utils/rates');

const MAX_PRODUCT_IMAGES = 4;

// Accepts either the new `images` array or the legacy single `image` field and
// returns a cleaned gallery, or an error string when the 1-4 rule is broken.
function normaliseGallery(body) {
  let list;
  if (Array.isArray(body.images)) list = body.images;
  else if (typeof body.images === 'string' && body.images.trim()) list = [body.images];
  else if (body.image) list = [body.image];
  else list = [];

  const cleaned = list
    .filter(src => typeof src === 'string' && src.trim())
    .map(src => src.trim());

  if (!cleaned.length) return { error: 'At least one product image is required.' };
  if (cleaned.length > MAX_PRODUCT_IMAGES) {
    return { error: `A product can have at most ${MAX_PRODUCT_IMAGES} images.` };
  }
  return { images: cleaned };
}

// ── Optional product video ──
// At most one per product, kept exactly like the images: either a data URL
// from an upload or a direct link. 4 MB of video becomes roughly 5.5 MB of
// base64, which together with four images stays inside both the 10 mb JSON
// body limit and MongoDB's 16 MB document limit.
const MAX_VIDEO_BYTES = 4 * 1024 * 1024;
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const VIDEO_LINK_EXT = /\.(mp4|webm|ogg|ogv)$/i;

// Returns { video } with the value to store, or { error }. An empty string is
// a valid result: it means this product has no video.
function normaliseVideo(raw) {
  if (raw === undefined || raw === null) return { video: '' };
  if (typeof raw !== 'string') return { error: 'Invalid product video.' };

  const value = raw.trim();
  if (!value) return { video: '' };

  if (/^https?:\/\//i.test(value)) {
    // Quotes and angle brackets would break out of the attribute the player is
    // rendered into, and no legitimate video link needs them unencoded.
    if (/["'<>\s]/.test(value)) {
      return { error: 'That video link contains characters that are not allowed.' };
    }
    let url;
    try { url = new URL(value); } catch { return { error: 'Enter a valid video link.' }; }
    if (!VIDEO_LINK_EXT.test(url.pathname)) {
      return { error: 'The link must point straight at an .mp4, .webm or .ogg file. Page links such as YouTube cannot be played here.' };
    }
    return { video: value };
  }

  const comma = value.indexOf(',');
  const header = comma === -1 ? '' : value.slice(0, comma).toLowerCase();
  if (!header.startsWith('data:') || !header.endsWith(';base64')) {
    return { error: 'Unsupported video. Upload an MP4, WebM or OGG file, or paste a direct link to one.' };
  }
  if (!VIDEO_MIME_TYPES.includes(header.slice(5, -7))) {
    return { error: 'Unsupported video format. Use MP4, WebM or OGG.' };
  }

  // The size is worked out from the base64 length before the contents are
  // examined, so an oversized upload is rejected without scanning megabytes.
  const body = value.slice(comma + 1);
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  const bytes = Math.floor(body.length * 3 / 4) - padding;
  if (bytes > MAX_VIDEO_BYTES) {
    return {
      error: `That video is ${(bytes / (1024 * 1024)).toFixed(1)} MB. Please keep it under ${MAX_VIDEO_BYTES / (1024 * 1024)} MB.`
    };
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return { error: 'That video file could not be read.' };

  return { video: value };
}

// All admin routes require admin role
router.use(requireAdmin);

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const [products, messages, users] = await Promise.all([
      Product.countDocuments(),
      Contact.countDocuments(),
      User.countDocuments()
    ]);
    const featured = await Product.countDocuments({ featured: true });
    res.json({ success: true, stats: { products, messages, users, featured } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed.' });
  }
});

// GET all products (admin)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.aggregate([
      { $sort: { createdAt: -1 } },
      { $project: {
        name: 1, image: 1, category: 1, price: 1, material: { $ifNull: ['$material', '22K Gold'] }, jewelryType: 1,
        bisNumber: 1, bisHallmark: { $ifNull: ['$bisHallmark', false] },
        featured: 1, inStock: { $ifNull: ['$inStock', true] },
        imageCount: { $size: { $ifNull: ['$images', []] } }
      } }
    ]);
    res.json({ success: true, products });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load products.' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ success: true, categories });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load categories.' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product: product.toObject({ virtuals: false }) });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load product.' });
  }
});

// POST add product
router.post('/products', async (req, res) => {
  try {
    const { name, price, category, description, material, weight, featured, inStock, jewelryType, bisHallmark, bisNumber } = req.body;
    if (!name || !price || !category)
      return res.status(400).json({ success: false, message: 'Name, price and category are required.' });

    const gallery = normaliseGallery(req.body);
    if (gallery.error) return res.status(400).json({ success: false, message: gallery.error });

    const video = normaliseVideo(req.body.video);
    if (video.error) return res.status(400).json({ success: false, message: video.error });

    const product = await Product.create({
      name, price: Number(price), category, description, material, weight,
      image: gallery.images[0],
      images: gallery.images,
      video: video.video,
      featured: featured === true || featured === 'true',
      inStock:  inStock  !== false && inStock  !== 'false',
      jewelryType: jewelryType || 'Gold',
      bisHallmark: bisHallmark === true || bisHallmark === 'true',
      bisNumber: bisNumber || ''
    });
    res.json({ success: true, product });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors)[0];
      return res.status(400).json({ success: false, message: first ? first.message : 'Invalid product data.' });
    }
    res.status(500).json({ success: false, message: 'Failed to add product.' });
  }
});

// PUT update product
router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const { name, price, category, description, material, weight, featured, inStock, jewelryType, bisHallmark, bisNumber } = req.body;
    if (!name || !price || !category)
      return res.status(400).json({ success: false, message: 'Name, price and category are required.' });

    const gallery = normaliseGallery(req.body);
    if (gallery.error) return res.status(400).json({ success: false, message: gallery.error });

    // A body with no `video` key at all leaves the existing video untouched;
    // sending an empty string is how the admin portal removes one.
    let video = null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'video')) {
      video = normaliseVideo(req.body.video);
      if (video.error) return res.status(400).json({ success: false, message: video.error });
    }

    product.name        = name;
    product.price       = Number(price);
    product.category    = category;
    product.description = description || '';
    product.material    = material || '22K Gold';
    product.weight      = weight || '';
    product.images      = gallery.images;
    product.image       = gallery.images[0];
    product.featured    = featured === true || featured === 'true';
    product.inStock     = inStock !== false && inStock !== 'false';
    product.jewelryType = jewelryType || 'Gold';
    product.bisHallmark = bisHallmark === true || bisHallmark === 'true';
    product.bisNumber   = product.bisHallmark ? (bisNumber || '') : '';
    if (video) product.video = video.video;

    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors)[0];
      return res.status(400).json({ success: false, message: first ? first.message : 'Invalid product data.' });
    }
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Delete failed.' });
  }
});

// PATCH toggle featured
router.patch('/products/:id/featured', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Product not found.' });
    p.featured = !p.featured;
    await p.save();
    res.json({ success: true, featured: p.featured });
  } catch {
    res.status(500).json({ success: false });
  }
});

// PUT update the current Gold & Silver rates
// Protected by router.use(requireAdmin) above. Only the rate fields themselves
// are read from the body; the timestamp is always generated on the server.
router.put('/rates', async (req, res) => {
  try {
    const { values, errors, message } = validateRates(req.body);
    if (errors) return res.status(400).json({ success: false, message, errors });

    const rates = await setCurrentRates(values, { source: 'manual' });
    res.json({ success: true, rates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update rates.' });
  }
});

// GET all messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load messages.' });
  }
});

// DELETE message
router.delete('/messages/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// GET all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.session.userId) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Delete failed.' });
  }
});

// POST reset user password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch {
    res.status(500).json({ success: false, message: 'Reset failed.' });
  }
});

// POST seed
router.post('/seed', async (req, res) => {
  try {
    await Product.deleteMany({});
    await Product.insertMany([
      { name:'Royal Temple Necklace',    price:45000, category:'Necklaces', image:'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600', description:'Exquisite 22K gold temple necklace with ruby embellishments, perfect for weddings.', material:'22K Gold', weight:'35g', featured:true, jewelryType:'Gold', bisHallmark:true, bisNumber:'G18342' },
      { name:'Diamond Solitaire Ring',   price:85000, category:'Rings',     image:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600', description:'Brilliant cut 0.5ct diamond in 18K white gold. A timeless symbol of love.', material:'18K White Gold', weight:'5g', featured:true, jewelryType:'Gold', bisHallmark:true, bisNumber:'D90823' },
      { name:'Kundan Jhumka Earrings',   price:12000, category:'Earrings',  image:'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600', description:'Traditional Kundan jhumkas with meenakari work, handcrafted by master artisans.', material:'Gold Plated', weight:'18g', featured:true, jewelryType:'Artificial', bisHallmark:false, bisNumber:'' },
      { name:'Classic Gold Bangle Set',  price:38000, category:'Bangles',   image:'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600', description:'Set of 6 hallmarked gold bangles with delicate filigree work.', material:'22K Gold', weight:'48g', featured:true, jewelryType:'Gold', bisHallmark:true, bisNumber:'G76329' },
      { name:'Sterling Silver Choker',   price:12000, category:'Necklaces', image:'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=600', description:'Elegant 925 sterling silver choker, classic and modern.', material:'925 Sterling Silver', weight:'22g', featured:false, jewelryType:'Silver', bisHallmark:true, bisNumber:'S87311' },
      { name:'Emerald Cocktail Ring',    price:55000, category:'Rings',     image:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600', description:'Colombian emerald surrounded by diamond pavé in 18K yellow gold.', material:'18K Gold', weight:'7g', featured:true, jewelryType:'Gold', bisHallmark:true, bisNumber:'G23489' },
      { name:'Diamond Drop Earrings',    price:35000, category:'Earrings',  image:'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600', description:'Elegant diamond drop earrings in white gold, perfect for evenings.', material:'18K White Gold', weight:'6g', featured:false, jewelryType:'Gold', bisHallmark:true, bisNumber:'D10294' },
      { name:'Polki Bangle Set',         price:28000, category:'Bangles',   image:'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=600', description:'Traditional Rajasthani Polki bangles with colorful enamel work, set of 4.', material:'Gold Plated', weight:'60g', featured:false, jewelryType:'Artificial', bisHallmark:false, bisNumber:'' },
      { name:'Antique Haar Necklace',    price:68000, category:'Necklaces', image:'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600', description:'Heritage antique haar with meenakari and polki work, a bridal masterpiece.', material:'22K Gold', weight:'80g', featured:true, jewelryType:'Gold', bisHallmark:true, bisNumber:'A98302' },
      { name:'Rose Gold Twisted Ring',   price:18000, category:'Rings',     image:'https://images.unsplash.com/photo-1605106250963-ffda6d2a4b32?w=600', description:'Delicate rose gold twisted band, minimalist and modern.', material:'14K Rose Gold', weight:'4g', featured:false, jewelryType:'Gold', bisHallmark:true, bisNumber:'R58291' }
    ]);
    res.json({ success: true, message: '10 sample products added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Seed failed.' });
  }
});

module.exports = router;
