const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    /** IANA timezone for session analytics (e.g. America/New_York) */
    timezone: { type: String, default: 'UTC', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
