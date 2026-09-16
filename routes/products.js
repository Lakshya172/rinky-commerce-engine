const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, featured, limit, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (search) filter.name = { $regex: search, $options: 'i' };

    let query = Product.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.limit(Number(limit));
    const products = await query;
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// GET /api/products/categories
// Declared before '/:id' so the literal path is not captured as an id.
// Returns every category that currently exists in the catalogue, together with
// the images belonging to that category, so the home page can show a picture
// that genuinely comes from the category it labels.
router.get('/categories', async (req, res) => {
  try {
    const grouped = await Product.aggregate([
      { $match: { category: { $nin: [null, ''] } } },
      {
        $project: {
          category: 1,
          inStock: 1,
          // Old products only have `image`; newer ones have a gallery.
          pics: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] },
              '$images',
              { $cond: [{ $ifNull: ['$image', false] }, ['$image'], []] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          inStockCount: { $sum: { $cond: ['$inStock', 1, 0] } },
          images: { $push: '$pics' }
        }
      },
      { $sort: { count: -1, _id: 1 } }
    ]);

    const categories = grouped.map(g => ({
      name: g._id,
      count: g.count,
      inStockCount: g.inStockCount,
      // Flatten, drop blanks, de-duplicate. May legitimately be empty, in
      // which case the client falls back to a bundled image.
      images: [...new Set([].concat(...g.images).filter(src => typeof src === 'string' && src.trim()))]
    }));

    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const related = await Product.find({ category: product.category, _id: { $ne: product._id } }).limit(3);
    res.json({ success: true, product, related });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
});

module.exports = router;
