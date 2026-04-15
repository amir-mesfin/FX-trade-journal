const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pair: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    lotSize: { type: Number, required: true, min: 0 },
    entryPrice: { type: Number, required: true },
    stopLoss: { type: Number },
    takeProfit: { type: Number },
    exitPrice: { type: Number },
    profitLoss: { type: Number },
    /** Realized R (risk = entry→SL); optional manual override */
    rMultiple: { type: Number },
    /** Dollar amount risked on this trade */
    riskAmount: { type: Number },
    /** Percentage of account balance risked (e.g. 1.5 = 1.5%) */
    riskPercent: { type: Number },
    strategy: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    /** { url, publicId } from Cloudinary, or legacy local filename string */
    screenshots: [{ type: mongoose.Schema.Types.Mixed }],
    openedAt: { type: Date, required: true },
    closedAt: { type: Date },
    status: { type: String, enum: ['open', 'closed'], default: 'closed' },
    /** Optional psychology / daily journal line tied to this trade */
    psychologyNote: { type: String, default: '' },
    /** ICT entry checklist — each step must be confirmed before entering */
    entryChecklist: {
      newsChecked:       { type: Boolean, default: false }, // Check news before 9:30
      liquidityMarked:   { type: Boolean, default: false }, // Mark liquidity & PD array
      waitedNYOpen:      { type: Boolean, default: false }, // Wait NY open (9:30)
      liquiditySweep:    { type: Boolean, default: false }, // Wait liquidity sweep
      crtConfirmed:      { type: Boolean, default: false }, // CRT confirmation
      reversalSign:      { type: Boolean, default: false }, // Reversal sign
      mssDisplacement:   { type: Boolean, default: false }, // MSS + displacement
      bprIfvgFvg:        { type: Boolean, default: false }, // BPR > IFVG > FVG
      entryTaken:        { type: Boolean, default: false }, // Enter trade
      targetCRT:         { type: Boolean, default: false }, // Target CRT
      journaled:         { type: Boolean, default: false }, // Journal
    },
    importSource: { type: String, enum: ['manual', 'csv'], default: 'manual' },
    /** Dedup CSV imports (e.g. MT ticket) */
    externalId: { type: String },
  },
  { timestamps: true }
);

// Unique per user only when externalId is set (CSV dedup). A plain sparse compound
// index still indexes every doc because `user` exists, so multiple manual trades
// without externalId collided as (user, null). Partial index excludes those rows.
tradeSchema.index(
  { user: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalId: { $exists: true, $type: 'string', $gt: '' },
    },
  }
);

module.exports = mongoose.model('Trade', tradeSchema);
