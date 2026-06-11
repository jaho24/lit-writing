import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import './database';

import literatureRoutes from './routes/literature';
import libraryRoutes from './routes/libraries';
import uploadRoutes from './routes/upload';
import annotationRoutes from './routes/annotations';
import tagRoutes from './routes/tags';
import writingStyleRoutes from './routes/writingStyles';
import generateRoutes from './routes/generate';
import configRoutes from './routes/config';
import chatRoutes from './routes/chat';
import promptTemplateRoutes from './routes/promptTemplates';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/literature', literatureRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/annotations', annotationRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/writing-styles', writingStyleRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/config', configRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/prompt-templates', promptTemplateRoutes);

app.use('/pdfs', express.static(path.join(process.env.DATA_DIR || './data', 'pdfs')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`LitWrite backend running on http://localhost:${PORT}`);
});

export default app;