import { JDAnalysis } from '../types';
import { extractKeywords, extractSkills, detectSeniority } from '../utils/keywords';

/**
 * Analyze a job description. Splits into required vs nice-to-have using common
 * heading cues, falls back to whole-text extraction.
 */
export function analyzeJD(jdText: string): JDAnalysis {
  const text = jdText || '';
  const lower = text.toLowerCase();

  // Try to isolate the "required" and "nice to have" sub-blocks.
  const required = sliceSection(lower, [
    'requirements', 'required qualifications', 'must have', 'must-have',
    'minimum qualifications', 'what you bring', 'qualifications'
  ], [
    'nice to have', 'preferred', 'bonus', 'benefits', 'about us', 'what we offer'
  ]);
  const nice = sliceSection(lower, [
    'nice to have', 'nice-to-have', 'preferred qualifications', 'preferred', 'bonus', 'plus'
  ], [
    'benefits', 'about us', 'what we offer', 'compensation', 'eeo'
  ]);

  const requiredSkills = extractSkills(required || text);
  const niceToHaveSkills = nice ? extractSkills(nice).filter(s => !requiredSkills.includes(s)) : [];

  const responsibilities = extractBullets(text, [
    'responsibilities', 'what you will do', 'what you\'ll do', 'role', 'about the role', 'the job'
  ]);

  return {
    jdText: text,
    jdKeywords: extractKeywords(text, 35),
    requiredSkills,
    niceToHaveSkills,
    responsibilities,
    seniorityHint: detectSeniority(text)
  };
}

function sliceSection(lowerText: string, startHeaders: string[], endHeaders: string[]): string {
  let bestStart = -1;
  for (const h of startHeaders) {
    const idx = lowerText.indexOf(h);
    if (idx !== -1 && (bestStart === -1 || idx < bestStart)) bestStart = idx;
  }
  if (bestStart === -1) return '';
  let bestEnd = lowerText.length;
  for (const h of endHeaders) {
    const idx = lowerText.indexOf(h, bestStart + 1);
    if (idx !== -1 && idx < bestEnd) bestEnd = idx;
  }
  return lowerText.slice(bestStart, bestEnd);
}

function extractBullets(text: string, headers: string[]): string[] {
  const lower = text.toLowerCase();
  let startIdx = -1;
  for (const h of headers) {
    const i = lower.indexOf(h);
    if (i !== -1 && (startIdx === -1 || i < startIdx)) startIdx = i;
  }
  if (startIdx === -1) return [];
  const block = text.slice(startIdx, startIdx + 2000);
  return block
    .split(/\n/)
    .map(l => l.trim())
    .filter(l => /^[•\-*·]\s+/.test(l) || /^\d+\./.test(l))
    .map(l => l.replace(/^[•\-*·\d.]+\s*/, ''))
    .slice(0, 12);
}
