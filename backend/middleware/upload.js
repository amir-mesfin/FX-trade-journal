const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads', 'trades');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
  cb(null, ok);
};

const uploadScreenshots = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: imageFilter,
}).array('screenshots', 8);

module.exports = { uploadScreenshots, uploadDir };
