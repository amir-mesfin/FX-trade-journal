require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { configure: configureCloudinary, configured: cloudinaryReady } = require('./utils/cloudinary');

configureCloudinary();

const authRoutes = require('./routes/auth');
const tradesRoutes = require('./routes/trades');
const statsRoutes = require('./routes/stats');
const journalRoutes = require('./routes/journal');
const reportsRoutes = require('./routes/reports');
const insightsRoutes = require('./routes/insights');

const app = express();

// Default cors() uses Allow-Origin: * — browsers block that when the request uses
// Authorization (or other non-simple headers). Reflect the request Origin instead.
const corsOptions = {
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};
if (process.env.CORS_ORIGINS) {
  const allowed = process.env.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  corsOptions.origin = (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    callback(null, false);
  };
}
app.use(cors(corsOptions));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    dbReady: mongoose.connection.readyState === 1,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/insights', insightsRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in backend/.env (see .env.example)');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Set JWT_SECRET in backend/.env');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    if (cloudinaryReady()) console.log('Cloudinary ready for image uploads');
    else console.log('Cloudinary not set — trade images require CLOUDINARY_* in .env');
    app.listen(PORT, () => {
      console.log(`API http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
