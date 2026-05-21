import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router as apiRouter } from './routes/api';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.json({ name: 'resume-tailor-backend', endpoints: ['/api/health', '/api/parse-resume', '/api/analyze', '/api/generate-pdf'] });
});

app.listen(PORT, () => {
  console.log(`[resume-tailor-backend] listening on http://localhost:${PORT}`);
  console.log(`[resume-tailor-backend] AI rewriting: ${process.env.OPENAI_API_KEY ? 'enabled' : 'disabled (rule-based only)'}`);
});
