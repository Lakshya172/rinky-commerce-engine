const mongoose = require('mongoose');

// The single, current Gold & Silver rates for the shop.
//
// This collection is a single source of truth, not a history: it holds exactly
// one document, identified by `key: 'current'`. Updates overwrite that document
// in place, so no previous rates or timestamps are ever retained.
//
// `unique` on `key` makes a second current document impossible at the database
// level, rather than relying on application code alone.
const RATE_KEY = 'current';

const positiveRate = {
  type: Number,
  required: true,
  min: [0.01, 'Rates must be greater than zero.']
};

const ratesSchema = new mongoose.Schema({
  key:         { type: String, default: RATE_KEY, unique: true, immutable: true },
  gold24:      positiveRate,   // ₹ per 10 g, 24 KT, excluding GST
  gold22:      positiveRate,   // ₹ per 10 g, 22 KT, excluding GST
  gold20:      positiveRate,   // ₹ per 10 g, 20 KT, excluding GST
  gold18:      positiveRate,   // ₹ per 10 g, 18 KT, excluding GST
  silver:      positiveRate,   // ₹ per kg, excluding GST
  // Always generated on the server at the moment of a successful update.
  lastUpdated: { type: Date, required: true },
  // Who set the current values. 'manual' for the admin portal today; a trusted
  // automatic feed added later can write its own identifier here without any
  // schema change.
  source:      { type: String, default: 'manual', trim: true }
}, {
  collection: 'rates',
  versionKey: false
});

module.exports = mongoose.model('Rates', ratesSchema);
module.exports.RATE_KEY = RATE_KEY;
