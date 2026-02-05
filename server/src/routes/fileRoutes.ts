import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { getFiles, updateFile, createFile, deleteFile } from '../controllers/fileController';
import { verifyToken, requireAdmin } from '../middleware/auth';

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

// Definimos que cuando alguien entre a "/" (de esta ruta), ejecute getFiles
router.get('/', getFiles);
router.post('/', verifyToken, requireAdmin, upload.single('file'), createFile);
router.put('/:id', verifyToken, requireAdmin, updateFile);
router.delete('/:id', verifyToken, requireAdmin, deleteFile);

export default router;
