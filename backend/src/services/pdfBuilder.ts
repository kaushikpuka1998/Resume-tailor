import PDFDocument from 'pdfkit';
import { TailoredResume } from '../types';

/**
 * Renders a single-page A4 ATS-friendly PDF. Content is prioritized so the
 * most JD-relevant material survives any truncation:
 *   1. JD-highlighted bullets are kept first.
 *   2. Up to MAX_ROLES most-recent experiences are included.
 *   3. If the layout would still overflow, the builder retries with progressively
 *      tighter caps until everything fits on one A4 page.
 */

interface Caps {
  maxRoles: number;
  bulletsPerRole: number;
  summarySentences: number;
  skillsCap: number;
  baseFont: number;
  lineGap: number;
}

const RETRY_LADDER: Caps[] = [
  { maxRoles: 4, bulletsPerRole: 4, summarySentences: 4, skillsCap: 30, baseFont: 11,  lineGap: 1.5 },
  { maxRoles: 4, bulletsPerRole: 3, summarySentences: 3, skillsCap: 24, baseFont: 10.5, lineGap: 1.2 },
  { maxRoles: 3, bulletsPerRole: 3, summarySentences: 3, skillsCap: 20, baseFont: 10,   lineGap: 1   },
  { maxRoles: 3, bulletsPerRole: 2, summarySentences: 2, skillsCap: 16, baseFont: 9.5,  lineGap: 0.8 },
  { maxRoles: 2, bulletsPerRole: 2, summarySentences: 2, skillsCap: 14, baseFont: 9,    lineGap: 0.5 }
];

export async function buildResumePdf(tailored: TailoredResume): Promise<Buffer> {
  for (const caps of RETRY_LADDER) {
    const result = await tryBuild(tailored, caps);
    if (result.pages === 1) return result.buffer;
  }
  // Last resort: take the tightest attempt even if it bled to 2 pages.
  const last = await tryBuild(tailored, RETRY_LADDER[RETRY_LADDER.length - 1]);
  return last.buffer;
}

function tryBuild(tailored: TailoredResume, caps: Caps): Promise<{ buffer: Buffer; pages: number }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 42, bottom: 42, left: 48, right: 48 }
    });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c as Buffer));
    doc.on('end', () => {
      const range = doc.bufferedPageRange();
      resolve({ buffer: Buffer.concat(chunks), pages: range.count });
    });
    doc.on('error', reject);

    render(doc, tailored, caps);
    doc.end();
  });
}

function render(doc: PDFKit.PDFDocument, t: TailoredResume, caps: Caps) {
  const accent = '#2563eb';
  const subtle = '#6b7280';
  const dark = '#111827';

  // Header
  if (t.name) {
    doc.fontSize(20).fillColor(dark).font('Helvetica-Bold').text(t.name);
  }
  const contact = [t.email, t.phone, t.location].filter(Boolean).join('  •  ');
  if (contact) {
    doc.moveDown(0.15);
    doc.fontSize(9.5).fillColor(subtle).font('Helvetica').text(contact);
  }
  doc.moveDown(0.4);
  rule(doc, accent);

  // Summary (sentence-capped)
  if (t.tailoredSummary) {
    sectionHeader(doc, 'Summary', accent);
    const trimmed = trimSentences(t.tailoredSummary, caps.summarySentences);
    doc.fontSize(caps.baseFont).fillColor(dark).font('Helvetica')
       .text(trimmed, { align: 'left', lineGap: caps.lineGap });
    doc.moveDown(0.35);
  }

  // Skills (count-capped, prioritized list = reorderedSkills)
  if (t.reorderedSkills.length > 0) {
    sectionHeader(doc, 'Skills', accent);
    doc.fontSize(caps.baseFont).fillColor(dark).font('Helvetica')
       .text(t.reorderedSkills.slice(0, caps.skillsCap).join('  •  '), { lineGap: caps.lineGap });
    doc.moveDown(0.35);
  }

  // Experience — most recent first (assumes resume order is recent-first; otherwise it's a no-op).
  const roles = t.experience.slice(0, caps.maxRoles);
  if (roles.length > 0) {
    sectionHeader(doc, 'Experience', accent);
    roles.forEach((exp, ei) => {
      const realIndex = t.experience.indexOf(exp);
      doc.fontSize(caps.baseFont + 0.5).fillColor(dark).font('Helvetica-Bold')
         .text(exp.title || 'Role', { continued: !!exp.company });
      if (exp.company) {
        doc.font('Helvetica').fillColor(subtle).text(`  — ${exp.company}`);
      } else {
        doc.text('');
      }
      if (exp.dates) {
        doc.fontSize(caps.baseFont - 1.5).fillColor(subtle).font('Helvetica-Oblique').text(exp.dates);
      }

      const prioritized = prioritizeBullets(exp.bullets, realIndex, t).slice(0, caps.bulletsPerRole);
      prioritized.forEach(({ bullet, highlighted }) => {
        doc.fontSize(caps.baseFont)
           .fillColor(highlighted ? accent : dark)
           .font(highlighted ? 'Helvetica-Bold' : 'Helvetica')
           .text(`•  ${bullet}`, { indent: 6, lineGap: caps.lineGap });
      });
      doc.moveDown(0.3);
    });
  }

  // Education — keep compact, max 2.
  const edu = t.education.slice(0, 2);
  if (edu.length > 0) {
    sectionHeader(doc, 'Education', accent);
    edu.forEach(ed => {
      doc.fontSize(caps.baseFont).fillColor(dark).font('Helvetica-Bold')
         .text(ed.degree, { continued: !!ed.institution });
      if (ed.institution) {
        doc.font('Helvetica').fillColor(subtle).text(`  — ${ed.institution}`);
      } else {
        doc.text('');
      }
      if (ed.dates) {
        doc.fontSize(caps.baseFont - 1.5).fillColor(subtle).font('Helvetica-Oblique').text(ed.dates);
      }
      doc.moveDown(0.2);
    });
  }
}

function prioritizeBullets(
  bullets: string[],
  experienceIndex: number,
  t: TailoredResume
): { bullet: string; highlighted: boolean; originalIndex: number }[] {
  const flagged = new Set(
    t.highlightedBullets
      .filter(h => h.experienceIndex === experienceIndex)
      .map(h => h.bulletIndex)
  );
  return bullets
    .map((b, i) => ({ bullet: b, highlighted: flagged.has(i), originalIndex: i }))
    .sort((a, b) => {
      if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
      return a.originalIndex - b.originalIndex;
    });
}

function trimSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g);
  if (!sentences) return text;
  return sentences.slice(0, max).join('').trim();
}

function sectionHeader(doc: PDFKit.PDFDocument, text: string, color: string) {
  doc.fontSize(10.5).fillColor(color).font('Helvetica-Bold')
     .text(text.toUpperCase(), { characterSpacing: 1 });
  doc.moveDown(0.15);
}

function rule(doc: PDFKit.PDFDocument, color: string) {
  const y = doc.y;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc.strokeColor(color).lineWidth(0.8).moveTo(left, y).lineTo(right, y).stroke();
  doc.moveDown(0.4);
}
