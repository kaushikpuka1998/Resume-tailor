import { Router } from 'express';
import multer from 'multer';
import { extractText, parseResumeText } from '../services/resumeParser';
import { analyzeJD } from '../services/jdAnalyzer';
import { buildMatchReport, highlightBullets, reorderSkills, ruleBasedSummary } from '../services/matcher';
import { aiRewriteSummary } from '../services/aiRewriter';
import { buildResumePdf } from '../services/pdfBuilder';
import { TailoredResume } from '../types';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8 MB
});

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, aiEnabled: !!process.env.OPENAI_API_KEY });
});

/**
 * POST /api/parse-resume
 * multipart/form-data: { file: PDF or DOCX }
 */
router.post('/parse-resume', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file).' });
    const text = await extractText(req.file.buffer, req.file.mimetype);
    if (!text || text.trim().length < 30) {
      return res.status(422).json({ error: 'Could not extract enough text from file. Is it a scanned image?' });
    }
    const parsed = parseResumeText(text);
    res.json({ resume: parsed });
  } catch (err) {
    console.error('[parse-resume]', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/analyze
 * body: { resume: ParsedResume, jdText: string, useAI?: boolean }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { resume, jdText, useAI } = req.body ?? {};
    if (!resume || !jdText) {
      return res.status(400).json({ error: 'resume and jdText are required.' });
    }
    const jd = analyzeJD(jdText);
    const match = buildMatchReport(resume, jd);
    const reorderedSkills = reorderSkills(resume, jd);
    const highlights = highlightBullets(resume, jd);

    let summary = ruleBasedSummary(resume, jd);
    let aiUsed = false;
    if (useAI !== false) {
      const ai = await aiRewriteSummary(resume, jd);
      if (ai) {
        summary = ai;
        aiUsed = true;
      }
    }

    const tailored: TailoredResume = {
      ...resume,
      tailoredSummary: summary,
      reorderedSkills,
      highlightedBullets: highlights,
      match,
      aiUsed
    };

    res.json({ jd, tailored });
  } catch (err) {
    console.error('[analyze]', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/generate-pdf
 * body: { tailored: TailoredResume }
 * returns: application/pdf
 */
router.post('/generate-pdf', async (req, res) => {
  try {
    const { tailored } = req.body ?? {};
    if (!tailored) return res.status(400).json({ error: 'tailored is required.' });
    const buf = await buildResumePdf(tailored as TailoredResume);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="tailored-resume.pdf"`);
    res.send(buf);
  } catch (err) {
    console.error('[generate-pdf]', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
