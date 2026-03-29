const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { isValidTimezone } = require('../utils/timezone');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
    });
    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, timezone: user.timezone || 'UTC' },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      '+password'
    );
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone || 'UTC',
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      timezone: user.timezone || 'UTC',
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load profile' });
  }
});

router.patch('/me', authRequired, async (req, res) => {
  try {
    const { name, timezone } = req.body || {};
    const updates = {};
    if (name !== undefined && String(name).trim()) updates.name = String(name).trim();
    if (timezone !== undefined) {
      const tz = String(timezone).trim() || 'UTC';
      if (!isValidTimezone(tz)) {
        return res.status(400).json({ error: 'Invalid IANA timezone' });
      }
      updates.timezone = tz;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide name and/or timezone to update' });
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select(
      '-password'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      timezone: user.timezone || 'UTC',
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

module.exports = router;
