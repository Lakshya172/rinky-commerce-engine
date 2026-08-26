const express = require('express');
const router  = express.Router();
const Contact = require('../models/Contact');

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    if (!/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    if (message.trim().length < 10)
      return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });

    await Contact.create({ name: name.trim(), email, phone: phone || '', message: message.trim() });
    res.json({ success: true, message: 'Message sent! We will reply within 24 hours.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

module.exports = router;
