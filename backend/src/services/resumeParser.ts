import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { ParsedResume, ResumeExperience, ResumeEducation } from '../types';
import { extractSkills } from '../utils/keywords';

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

const SECTION_HEADERS = [
  'summary','profile','objective','about',
  'experience','work experience','professional experience','employment',
  'education','academic',
  'skills','technical skills','core competencies',
  'projects','publications','certifications','awards'
];

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf' || mimetype.includes('pdf')) {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype.includes('word') || mimetype.includes('docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // Fallback: treat as plain text
  return buffer.toString('utf8');
}

function isLikelyHeader(line: string): string | null {
  const cleaned = line.trim().toLowerCase().replace(/[:•·\-—]+$/, '').trim();
  if (!cleaned || cleaned.length > 40) return null;
  for (const h of SECTION_HEADERS) {
    if (cleaned === h || cleaned.startsWith(h + ' ') || cleaned.startsWith(h + ':')) return h;
  }
  return null;
}

function splitIntoSections(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const sections: Record<string, string[]> = { header: [] };
  let current = 'header';
  for (const line of lines) {
    const h = isLikelyHeader(line);
    if (h) {
      current = h;
      if (!sections[current]) sections[current] = [];
    } else {
      sections[current].push(line);
    }
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sections)) out[k] = v.join('\n').trim();
  return out;
}

// Handles "Mar 2025", "Mar,2025", "March, 2025", "03/2025", "2025"; range to "Present" or another date.
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*';
const YEAR = '\\d{4}';
const DATE_TOKEN = `(?:${MONTH}\\.?[,\\s]+${YEAR}|${YEAR})`;
const DATE_RANGE_RE = new RegExp(
  `(?<![A-Za-z])(${DATE_TOKEN}\\s*(?:[-–—]|to)\\s*(?:Present|Current|${DATE_TOKEN}))`,
  'i'
);

function looksLikeBullet(line: string): boolean {
  return /^[•\-*·]\s/.test(line) || /^\d+\.\s/.test(line);
}

function looksLikeCompany(line: string): boolean {
  // Company line is short, not a bullet, doesn't start a sentence, isn't all dates.
  if (!line || looksLikeBullet(line)) return false;
  if (line.length > 80) return false;
  if (DATE_RANGE_RE.test(line) && line.replace(DATE_RANGE_RE, '').trim().length < 3) return false;
  // Heuristic: starts with a capital letter or contains common org suffixes / locations.
  return /[A-Z]/.test(line[0]) || /\b(Inc|LLC|Ltd|GmbH|Pvt|Limited|Corp|Bank|University|College)\b/i.test(line);
}

function parseExperience(block: string): ResumeExperience[] {
  if (!block) return [];
  // Roles separated by blank lines.
  const chunks = block.split(/\n\s*\n+/).map(c => c.trim()).filter(Boolean);

  return chunks.map(chunk => {
    const lines = chunk.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { title: '', company: '', dates: '', bullets: [] };

    // 1. Extract dates from anywhere in the top 2 header lines, then strip them out.
    let dates = '';
    const header = [...lines];
    for (let i = 0; i < Math.min(2, header.length); i++) {
      const m = header[i].match(DATE_RANGE_RE);
      if (m) {
        dates = m[0].trim();
        header[i] = header[i].replace(m[0], '').replace(/[|•·\-–—,]+\s*$/, '').replace(/^\s*[|•·\-–—,]+/, '').trim();
        break;
      }
    }
    // Fallback: single-date or bare year range elsewhere in the chunk.
    if (!dates) {
      const bare = chunk.match(/\b\d{4}\s*(?:[-–—]|to)\s*(?:Present|Current|\d{4})\b/i);
      if (bare) dates = bare[0];
    }

    // 2. Title vs company. Prefer inline separator on cleaned firstLine,
    //    then the next non-bullet line, then leave company blank.
    const firstLine = header[0] || '';
    let title = firstLine;
    let company = '';
    let companyLineIdx = -1;

    const inline = firstLine.match(/^(.+?)\s+(?:[—–|@]|\bat\b)\s+(.+)$/i);
    if (inline) {
      title = inline[1].trim();
      company = inline[2].trim();
    } else {
      // Look at the next 1-2 header lines for a likely company line.
      for (let i = 1; i < Math.min(3, header.length); i++) {
        if (looksLikeCompany(header[i]) && !DATE_RANGE_RE.test(header[i])) {
          company = header[i];
          companyLineIdx = i;
          break;
        }
      }
    }

    // 3. Bullets: skip the title line and (if present) the company line,
    //    drop anything that's just a date, accept • / - / * / numbered, or long prose.
    const bulletStart = companyLineIdx >= 0 ? companyLineIdx + 1 : 1;
    const bullets = lines
      .slice(bulletStart)
      .filter(l => !DATE_RANGE_RE.test(l) || l.replace(DATE_RANGE_RE, '').trim().length > 20)
      .filter(l => looksLikeBullet(l) || l.length > 30)
      .map(l => l.replace(/^[•\-*·]\s*|^\d+\.\s*/, '').trim())
      .filter(Boolean);

    return { title: title.trim(), company: company.trim(), dates, bullets };
  });
}

function parseEducation(block: string): ResumeEducation[] {
  if (!block) return [];
  // Split by blank lines; group consecutive non-blank lines as one education entry.
  const entries = block.split(/\n\s*\n+/).map(e => e.trim()).filter(Boolean);
  return entries.slice(0, 5).map(entry => {
    // Try a full month-year range first (e.g. "Jul 2017 — Jul 2021").
    let dates = '';
    const range = entry.match(DATE_RANGE_RE);
    if (range) {
      dates = range[0].trim();
    } else {
      // Fall back to bare year-year range, then single year.
      const yearRange = entry.match(/\b\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})\b/i);
      if (yearRange) dates = yearRange[0];
      else {
        const singleYear = entry.match(/\b(19|20)\d{2}\b/);
        if (singleYear) dates = singleYear[0];
      }
    }

    const without = entry.replace(dates, '').replace(/\s+/g, ' ').trim();
    // Degree vs institution: split on the first strong separator (— – | , or two+ spaces).
    const parts = without.split(/\s*(?:[—–|]|\s{2,})\s*/).map(p => p.trim()).filter(Boolean);
    const degree = parts[0] ?? without;
    const institution = parts.slice(1).join(', ');
    return { degree, institution, dates };
  });
}

export function parseResumeText(text: string): ParsedResume {
  const sections = splitIntoSections(text);
  const header = sections.header || '';
  const emailMatch = text.match(EMAIL_RE);
  const phoneMatch = text.match(PHONE_RE);

  // Name = first non-empty line of header, sans email/phone if present.
  const headerLines = header.split(/\n/).map(l => l.trim()).filter(Boolean);
  let name = headerLines[0] || '';
  if (EMAIL_RE.test(name) || PHONE_RE.test(name)) {
    name = headerLines.find(l => !EMAIL_RE.test(l) && !PHONE_RE.test(l)) || '';
  }

  const locationLine = headerLines.find(l =>
    /[A-Z][a-z]+,\s*[A-Z]{2,}/.test(l) || /\b(remote|hybrid)\b/i.test(l)
  ) || '';

  const summary = (sections.summary || sections.profile || sections.objective || sections.about || '').trim();
  const skillsBlock = sections.skills || sections['technical skills'] || sections['core competencies'] || '';
  const dictSkills = extractSkills(text);
  const explicitSkills = skillsBlock
    .split(/[,•·\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 40);

  const skills = Array.from(new Set([...explicitSkills, ...dictSkills])).sort();

  const experience = parseExperience(
    sections.experience || sections['work experience'] || sections['professional experience'] || sections.employment || ''
  );
  const education = parseEducation(sections.education || sections.academic || '');

  return {
    rawText: text,
    name,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].trim() : '',
    location: locationLine,
    summary,
    skills,
    experience,
    education
  };
}
