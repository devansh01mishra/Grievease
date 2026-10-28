import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';

export const uploadsDirectory = path.resolve(process.cwd(), 'uploads');
mkdirSync(uploadsDirectory, { recursive: true });

const acceptedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['application/pdf', '.pdf'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx']
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDirectory),
  filename: (_req, file, callback) => {
    const extension = acceptedTypes.get(file.mimetype);
    if (!extension) return callback(new Error('Unsupported attachment type.'));
    return callback(null, `${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (!acceptedTypes.has(file.mimetype)) {
      return callback(new Error('Attachments must be JPEG, PNG, PDF, or DOCX files.'));
    }
    return callback(null, true);
  }
});

export default upload;
