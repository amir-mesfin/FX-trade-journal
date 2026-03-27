require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in backend/.env (see .env.example)');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    dbReady: mongoose.connection.readyState === 1,
  });
});

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
