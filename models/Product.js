const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  price:       { type: Number, required: true, min: 0 },
  category:    { type: String, required: true, trim: true },
  // Primary image. Kept as the first entry of `images` so that products
  // created before the gallery existed keep working untouched.
  image:       { type: String, required: true },
  images: {
    type: [String],
    default: undefined,
    validate: [
      {
        validator: v => v === undefined || v.length >= 1,
        message: 'At least one image is required.'
      },
      {
        validator: v => v === undefined || v.length <= 4,
        message: 'A product can have at most 4 images.'
      }
    ]
  },
  // Optional showcase video, at most one per product. Held exactly like the
  // images — a data URL from an upload, or a direct link — so the feature needs
  // no new storage layer. Products saved before this field existed simply have
  // no video and keep working untouched.
  video: {
    type: String,
    default: '',
    trim: true,
    validate: {
      // Shape only. Size and exact format are enforced where the value enters
      // the system, in routes/admin.js.
      validator: v => !v || /^data:video\/(mp4|webm|ogg);base64,/i.test(v) || /^https?:\/\//i.test(v),
      message: 'Unsupported product video.'
    }
  },
  description: { type: String, trim: true, default: '' },
  material:    { type: String, default: '22K Gold' },
  weight:      { type: String, default: '' },
  featured:    { type: Boolean, default: false },
  inStock:     { type: Boolean, default: true },
  jewelryType: { type: String, enum: ['Gold', 'Silver', 'Artificial'], default: 'Gold' },
  bisHallmark: { type: Boolean, default: false },
  bisNumber:   { type: String, default: '' }
}, { timestamps: true });

// Keep `image` and `images` consistent in both directions: a product saved with
// only the legacy single field gains a one-entry gallery, and a product saved
// with a gallery gets its first entry mirrored into `image`. Blank entries are
// dropped here; the 1-4 bounds are left to the validators above so that an
// oversized gallery is rejected rather than silently truncated.
productSchema.pre('validate', function (next) {
  if (Array.isArray(this.images)) {
    this.images = this.images
      .filter(src => typeof src === 'string' && src.trim())
      .map(src => src.trim());
    if (this.images.length) this.image = this.images[0];
    else this.images = undefined;
  }
  if ((!this.images || !this.images.length) && this.image) {
    this.images = [this.image];
  }
  next();
});

// Read-side helper so older documents that only ever stored `image` still
// present a usable gallery to the front end without a migration.
productSchema.virtual('gallery').get(function () {
  const list = Array.isArray(this.images) ? this.images.filter(Boolean) : [];
  if (list.length) return list;
  return this.image ? [this.image] : [];
});

// The catalogue and the admin list both sort by newest first. Without this
// index that sort is a blocking in-memory sort holding whole documents, and
// MongoDB aborts it once the buffered documents pass 32 MiB. Because images
// are stored as base64 data URLs, a few dozen products are enough to reach
// that limit, which took the public product list down entirely. With the
// index the sort is served in index order and nothing is buffered.
productSchema.index({ createdAt: -1 });

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
