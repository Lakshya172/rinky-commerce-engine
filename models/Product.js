const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  price:       { type: Number, required: true, min: 0 },
  category:    { type: String, required: true, trim: true },
  image:       { type: String, required: true },
  description: { type: String, trim: true, default: '' },
  material:    { type: String, default: '22K Gold' },
  weight:      { type: String, default: '' },
  featured:    { type: Boolean, default: false },
  inStock:     { type: Boolean, default: true },
  jewelryType: { type: String, enum: ['Gold', 'Silver', 'Artificial'], default: 'Gold' },
  bisHallmark: { type: Boolean, default: false },
  bisNumber:   { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
