const Rates = require('../models/Rates');
const { RATE_KEY } = Rates;

// Every write to the current rates goes through setCurrentRates(), whether it
// comes from the admin portal today or from a trusted automatic feed later.
// That keeps validation, the server-side timestamp and the one-document rule
// in a single place, so adding a feed means calling this function — not
// redesigning the feature.

const RATE_FIELDS = [
  { key: 'gold24', label: '24 KT gold rate' },
  { key: 'gold22', label: '22 KT gold rate' },
  { key: 'gold20', label: '20 KT gold rate' },
  { key: 'gold18', label: '18 KT gold rate' },
  { key: 'silver', label: 'Silver rate' }
];

// Generous ceiling that still catches a slipped extra digit or two.
const MAX_RATE = 10000000;

// Plain positive decimal with at most two places. Rejects signs, exponents,
// hex, thousands separators, whitespace-only and other malformed input.
const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

function parseRate(raw, label) {
  if (raw === undefined || raw === null) return { error: `${label} is required.` };
  if (typeof raw === 'boolean' || typeof raw === 'object') {
    return { error: `${label} must be a number.` };
  }

  let value;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { error: `${label} must be a valid number.` };
    value = raw;
    if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-9) {
      return { error: `${label} can have at most 2 decimal places.` };
    }
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { error: `${label} is required.` };
    if (!DECIMAL_RE.test(trimmed)) {
      return { error: `${label} must be a positive number (digits only, up to 2 decimals).` };
    }
    value = Number(trimmed);
  } else {
    return { error: `${label} must be a number.` };
  }

  if (!(value > 0)) return { error: `${label} must be greater than zero.` };
  if (value > MAX_RATE) return { error: `${label} looks too large. Please check the value.` };
  return { value };
}

// Validates only the rate fields listed in RATE_FIELDS. Anything else in the
// payload — including any client-supplied `lastUpdated` — is deliberately
// ignored.
function validateRates(body) {
  const values = {};
  const errors = {};
  const source = body && typeof body === 'object' ? body : {};

  for (const { key, label } of RATE_FIELDS) {
    const result = parseRate(source[key], label);
    if (result.error) errors[key] = result.error;
    else values[key] = result.value;
  }

  const messages = Object.values(errors);
  return messages.length
    ? { errors, message: messages[0] }
    : { values };
}

function toPublic(doc) {
  if (!doc) return null;
  return {
    gold24: doc.gold24,
    gold22: doc.gold22,
    gold20: doc.gold20,
    gold18: doc.gold18,
    silver: doc.silver,
    lastUpdated: doc.lastUpdated
  };
}

// Guarantees at most one rates document. If development or testing left
// duplicates behind (for example documents written before the unique index
// existed), the most recently updated one is kept and the rest are removed,
// so no stale values survive. Uses the raw collection so malformed leftovers
// can still be inspected and cleaned up.
async function ensureSingleRatesDocument() {
  const col = Rates.collection;
  const total = await col.countDocuments();
  if (total === 0) return { kept: null, removed: 0 };

  const onlyOneCorrect = total === 1 && (await col.countDocuments({ key: RATE_KEY })) === 1;
  if (onlyOneCorrect) return { kept: RATE_KEY, removed: 0 };

  const [keep] = await col.find({}).sort({ lastUpdated: -1, _id: -1 }).limit(1).toArray();
  const { deletedCount } = await col.deleteMany({ _id: { $ne: keep._id } });
  if (keep.key !== RATE_KEY) {
    await col.updateOne({ _id: keep._id }, { $set: { key: RATE_KEY } });
  }
  return { kept: String(keep._id), removed: deletedCount };
}

async function getCurrentRates() {
  const doc = await Rates.findOne({ key: RATE_KEY }).lean();
  return toPublic(doc);
}

async function setCurrentRates(values, { source = 'manual' } = {}) {
  const update = {
    $set: {
      gold24: values.gold24,
      gold22: values.gold22,
      gold20: values.gold20,
      gold18: values.gold18,
      silver: values.silver,
      // Server clock only. Never taken from the request.
      lastUpdated: new Date(),
      source
    }
  };
  const options = { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true };

  await ensureSingleRatesDocument();
  try {
    return toPublic(await Rates.findOneAndUpdate({ key: RATE_KEY }, update, options).lean());
  } catch (err) {
    // Two first-ever saves racing each other: the unique index lets one insert
    // win, and the other simply updates the document that now exists.
    if (err && err.code === 11000) {
      return toPublic(await Rates.findOneAndUpdate({ key: RATE_KEY }, update, options).lean());
    }
    throw err;
  }
}

// Run once at startup: clean up any duplicates first, then make sure the
// unique index exists (it cannot be built while duplicates are present).
async function initRates() {
  const result = await ensureSingleRatesDocument();
  await Rates.createIndexes();
  return result;
}

module.exports = {
  RATE_FIELDS,
  validateRates,
  getCurrentRates,
  setCurrentRates,
  ensureSingleRatesDocument,
  initRates
};
