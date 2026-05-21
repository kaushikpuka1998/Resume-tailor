# Resume Tailor

Upload your resume, paste a job description, get a tailored version back. Hybrid analysis: deterministic keyword extraction always runs, an optional AI layer rewrites the summary if you provide an OpenAI key.

- **Backend:** Node.js + TypeScript + Express, PDF/DOCX parsing, rule-based JD analysis, PDFKit generation, optional OpenAI rewrite.
- **Frontend:** React + TypeScript + Vite, drag-drop upload, JD textarea, live tailored preview, match-score dashboard, PDF download.

## Architecture

```
┌──────────────────┐    multipart    ┌──────────────────────────┐
│  React Frontend  │ ──────────────▶ │   POST /api/parse-resume │  pdf-parse / mammoth → ParsedResume
│  (Vite, TS, CSS) │                 │                          │
│                  │ ◀────────────── │   JSON ParsedResume      │
│                  │     JSON        ├──────────────────────────┤
│                  │ ──────────────▶ │   POST /api/analyze      │  JD analyzer + matcher + (optional) OpenAI
│                  │ ◀────────────── │   { jd, tailored }       │
│                  │                 ├──────────────────────────┤
│                  │ ──────────────▶ │   POST /api/generate-pdf │  PDFKit → application/pdf
│                  │ ◀────────────── │   PDF blob               │
└──────────────────┘                 └──────────────────────────┘
```


### Demo Pictures
<img width="1397" height="1186" alt="Screenshot 2026-05-21 at 8 26 05 PM" src="https://github.com/user-attachments/assets/9246a320-eff4-4783-957a-e5b874db12a8" />


### Backend modules

- `services/resumeParser.ts` — extracts raw text (pdf-parse / mammoth), splits into header/summary/skills/experience/education sections using a header dictionary, parses contact info via regex, infers role/company/dates per experience block.
- `services/jdAnalyzer.ts` — slices the JD into required vs nice-to-have sub-blocks by heading keywords ("Requirements", "Nice to have", etc.), extracts skills + keywords, infers seniority.
- `services/matcher.ts` — computes a weighted match score (70% required hits + 30% nice-to-have hits), reorders the candidate's skills so JD-matched ones appear first, flags experience bullets that mention JD keywords, and produces a deterministic rule-based summary.
- `services/aiRewriter.ts` — optional. If `OPENAI_API_KEY` is set, calls Chat Completions (`gpt-4o-mini` by default) to rewrite the summary anchored on the candidate's actual skills. Returns `null` to allow transparent fallback when no key / on error.
- `services/pdfBuilder.ts` — PDFKit one-pager with header rule, section titles, accent-coloured highlighted bullets, Helvetica family.

### Frontend modules

- `ResumeUploader` — drag-drop or click; calls `/api/parse-resume`.
- `JDInput` — textarea + AI toggle + analyze button.
- `AnalysisPanel` — circular match score, matched/missing keyword chips, suggestions.
- `ResumePreview` — printable HTML preview with the same accent colour the PDF uses; JD-aligned bullets are highlighted.

## Setup

Two terminals.

### Backend

```bash
cd backend
cp .env.example .env       # edit if you want AI: set OPENAI_API_KEY
npm install
npm run dev                # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`, so no CORS config needed in development.

## API

| Method | Path                | Body                                              | Returns                            |
| ------ | ------------------- | ------------------------------------------------- | ---------------------------------- |
| GET    | `/api/health`       | —                                                 | `{ ok, aiEnabled }`                |
| POST   | `/api/parse-resume` | multipart, field `file` (PDF/DOCX, ≤ 8 MB)        | `{ resume: ParsedResume }`         |
| POST   | `/api/analyze`      | `{ resume, jdText, useAI? }`                      | `{ jd: JDAnalysis, tailored }`     |
| POST   | `/api/generate-pdf` | `{ tailored: TailoredResume }`                    | `application/pdf`                  |

## Notes & limitations

- The resume parser handles well-formatted single-column resumes best. Two-column / heavily designed PDFs may collapse oddly because pdf-parse returns linearised text.
- Scanned (image-only) PDFs aren't OCR'd — the backend returns a 422 telling you so.
- The skill dictionary in `backend/src/utils/keywords.ts` covers ~120 common tech & business skills. Extend it to bias matching toward your domain.
- Privacy: the backend keeps no files on disk — uploads are processed in-memory only. If you enable the AI rewrite, the candidate summary, skills, and JD text are sent to OpenAI; disable the toggle in the UI (or leave the API key empty) to keep everything local.
# Resume-tailor
