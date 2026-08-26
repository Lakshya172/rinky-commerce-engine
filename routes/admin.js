const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');
const Contact = require('../models/Contact');
const User    = require('../models/User');
const { requireAdmin } = require('../middleware/auth');

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
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load products.' });
  }
});

// POST add product
router.post('/products', async (req, res) => {
  try {
    const { name, price, category, image, description, material, weight, featured, inStock, jewelryType, bisHallmark, bisNumber } = req.body;
    if (!name || !price || !category || !image)
      return res.status(400).json({ success: false, message: 'Name, price, category and image are required.' });
    const product = await Product.create({
      name, price: Number(price), category, image, description, material, weight,
      featured: featured === true || featured === 'true',
      inStock:  inStock  !== false && inStock  !== 'false',
      jewelryType: jewelryType || 'Gold',
      bisHallmark: bisHallmark === true || bisHallmark === 'true',
      bisNumber: bisNumber || ''
    });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add product.' });
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
      { name:'Emerald Cocktail Ring',    price:55000, category:'Rings',     image:'https://images.unsplash.com/photo-1573408301185-9519f94798cb?w=600', description:'Colombian emerald surrounded by diamond pavé in 18K yellow gold.', material:'18K Gold', weight:'7g', featured:true, jewelryType:'Gold', bisHallmark:true, bisNumber:'G23489' },
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
