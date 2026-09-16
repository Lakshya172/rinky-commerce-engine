const express = require('express');
const router  = express.Router();
const { getCurrentRates } = require('../utils/rates');

// Public, read-only. There is intentionally no write route here: updates live
// behind the admin router at PUT /api/admin/rates.

// GET /api/rates
router.get('/', async (req, res) => {
  // Always fetch fresh, so a page refresh after an admin update shows the new
  // values rather than a cached response.
  res.set('Cache-Control', 'no-store');
  try {
    const rates = await getCurrentRates();
    // `rates` is null until the admin publishes rates for the first time.
    res.json({ success: true, rates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load rates.' });
  }
});

module.exports = router;
