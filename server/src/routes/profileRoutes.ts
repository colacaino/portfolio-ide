import { Router } from 'express';
import { getProfile, upsertProfile, uploadAvatar } from '../controllers/profileController';
import { verifyToken, requireAdmin } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

router.get('/', getProfile);
router.put('/', verifyToken, requireAdmin, upsertProfile);
router.post('/avatar', verifyToken, requireAdmin, upload.single('avatar'), uploadAvatar);

export default router;
