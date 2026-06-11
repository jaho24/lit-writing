import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db, { statements } from '../database';
import { extractPDFMetadata } from '../services/pdf-parser';

const router = Router();
const DATA_DIR = process.env.DATA_DIR || './data';
const PDF_DIR = path.join(DATA_DIR, 'pdfs');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PDF_DIR),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 50_000_000 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

router.post('/pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const relativePath = path.relative(DATA_DIR, filePath);

  try {
    const metadata = await extractPDFMetadata(filePath);

    const result = statements.createLiterature.run(
      metadata.title,
      metadata.authors,
      metadata.year,
      metadata.journal,
      metadata.doi,
      metadata.abstract,
      relativePath,
      fileName,
      req.body.library_id ? Number(req.body.library_id) : null,
      JSON.stringify(metadata.confidence)
    );

    const literatureId = Number(result.lastInsertRowid);

    if (req.body.library_id) {
      statements.addLiteratureLibrary.run(literatureId, Number(req.body.library_id));
    }

    res.json({
      id: literatureId,
      ...metadata,
      file_path: relativePath,
      file_name: fileName,
    });
  } catch (err) {
    fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process PDF', detail: String(err) });
  }
});

router.post('/folder', async (req, res) => {
  const { folder_path, library_id } = req.body;

  if (!folder_path || !fs.existsSync(folder_path)) {
    return res.status(400).json({ error: 'Invalid folder path' });
  }

  try {
    const { scanAndImport } = await import('../services/file-scanner');
    const result = await scanAndImport(folder_path, library_id ? Number(library_id) : null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan folder', detail: String(err) });
  }
});

export default router;