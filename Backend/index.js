import cors from 'cors';
import express from 'express';
import { unlink } from 'node:fs/promises';
import mongoose from 'mongoose';
import adminRouter from './src/routes/adminRouter.js';
import authRouter from './src/routes/authRouter.js';
import grievanceRouter from './src/routes/grievanceRouter.js';
import officialRouter from './src/routes/officialRouter.js';
import studentRouter from './src/routes/studentRouter.js';
import { startEscalationWorker, stopEscalationWorker } from './src/services/escalationService.js';
import { HttpError } from './src/utils/httpError.js';

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, `Origin ${origin} is not allowed by CORS.`));
  }
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/grievances', grievanceRouter);
app.use('/api/student', studentRouter);
app.use('/api/official', officialRouter);
app.use('/api/admin', adminRouter);

app.use((req, _res, next) => {
  next(new HttpError(404, `Route ${req.method} ${req.path} not found.`));
});

app.use(async (error, req, res, _next) => {
  const status = error instanceof HttpError
    ? error.status
    : error.name === 'ValidationError' || error.name === 'CastError'
      ? 400
      : error.code === 11000
        ? 409
        : error instanceof SyntaxError && 'body' in error
          ? 400
          : error.code?.startsWith('LIMIT_')
            ? 400
            : 500;
  if (status >= 500) console.error('Request failed:', error);
  if (req.files?.length) {
    try {
      await Promise.all(req.files.map((file) => unlink(file.path)));
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') console.error('Uploaded-file cleanup failed:', cleanupError);
    }
  }
  res.status(status).json({
    error: status >= 500 ? 'An internal server error occurred.' : error.message
  });
});

export async function startServer() {
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGIN?.trim()) {
    throw new Error('FRONTEND_ORIGIN must be configured for production deployments.');
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => {
    console.log(`Grievease API listening on port ${port}.`);
    startEscalationWorker();
  });

  const shutdown = async () => {
    stopEscalationWorker();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Could not start Grievease API:', error.message);
    process.exitCode = 1;
  });
}

export default app;
