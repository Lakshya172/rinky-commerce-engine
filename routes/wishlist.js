const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET wishlist
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('wishlist');
    res.json({ success: true, wishlist: user.wishlist });
  } catch {
    res.status(500).json({ success: false });
  }
});

// POST toggle wishlist item
router.post('/:productId', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const id   = req.params.productId;
    const idx  = user.wishlist.indexOf(id);
    if (idx === -1) {
      user.wishlist.push(id);
    } else {
      user.wishlist.splice(idx, 1);
    }
    await user.save();
    res.json({ success: true, inWishlist: idx === -1, count: user.wishlist.length });
  } catch {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
