const express = require('express');
const JournalEntry = require('../models/JournalEntry');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    const filter = { user: req.userId };
    if (year && month) {
      const y = String(year);
      const m = String(month).padStart(2, '0');
      const prefix = `${y}-${m}-`;
      filter.journalDate = new RegExp(`^${prefix}`);
    }
    const items = await JournalEntry.find(filter).sort({ journalDate: -1 }).lean();
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not list journal entries' });
  }
});

router.get('/day/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Invalid date (use YYYY-MM-DD)' });
    const entry = await JournalEntry.findOne({ user: req.userId, journalDate: date }).lean();
    if (!entry) return res.status(404).json({ error: 'No entry for this day' });
    res.json(entry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load journal entry' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { journalDate, mood, tags, content } = req.body || {};
    if (!journalDate || !DATE_RE.test(String(journalDate))) {
      return res.status(400).json({ error: 'journalDate (YYYY-MM-DD) is required' });
    }
    const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
    const doc = await JournalEntry.findOneAndUpdate(
      { user: req.userId, journalDate: String(journalDate) },
      {
        user: req.userId,
        journalDate: String(journalDate),
        mood: mood && ['calm', 'focused', 'stressed', 'tired', 'confident', 'revenge', 'neutral'].includes(mood)
          ? mood
          : 'neutral',
        tags: tagList,
        content: content != null ? String(content) : '',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Entry exists for this day' });
    console.error(e);
    res.status(500).json({ error: 'Could not save journal entry' });
  }
});

router.patch('/day/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Invalid date' });
    const entry = await JournalEntry.findOne({ user: req.userId, journalDate: date });
    if (!entry) return res.status(404).json({ error: 'No entry for this day' });
    const { mood, tags, content } = req.body || {};
    if (mood !== undefined) {
      if (['calm', 'focused', 'stressed', 'tired', 'confident', 'revenge', 'neutral'].includes(mood)) {
        entry.mood = mood;
      }
    }
    if (tags !== undefined) {
      entry.tags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
    }
    if (content !== undefined) entry.content = String(content);
    await entry.save();
    res.json(entry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update journal entry' });
  }
});

router.delete('/day/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Invalid date' });
    const r = await JournalEntry.deleteOne({ user: req.userId, journalDate: date });
    if (r.deletedCount === 0) return res.status(404).json({ error: 'No entry for this day' });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete journal entry' });
  }
});

module.exports = router;
