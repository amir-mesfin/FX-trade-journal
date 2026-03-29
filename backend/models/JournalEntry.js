const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Calendar day YYYY-MM-DD */
    journalDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    mood: {
      type: String,
      enum: ['', 'calm', 'focused', 'stressed', 'tired', 'confident', 'revenge', 'neutral'],
      default: 'neutral',
    },
    tags: [{ type: String, trim: true }],
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

journalEntrySchema.index({ user: 1, journalDate: 1 }, { unique: true });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
