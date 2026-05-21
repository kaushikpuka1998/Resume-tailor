import { JDAnalysis, MatchReport, ParsedResume, TailoredResume } from '../types';
import { tokenize } from '../utils/keywords';

/**
 * Rule-based tailoring. Computes match score, reorders skills so JD-matched ones
 * come first, and flags which experience bullets best align with the JD.
 */
export function buildMatchReport(resume: ParsedResume, jd: JDAnalysis): MatchReport {
  const resumeTokens = new Set(tokenize(resume.rawText));
  const resumeSkillSet = new Set(resume.skills.map(s => s.toLowerCase()));

  const wanted = Array.from(new Set([...jd.requiredSkills, ...jd.niceToHaveSkills])).map(s => s.toLowerCase());
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of wanted) {
    const phraseHit = resume.rawText.toLowerCase().includes(skill);
    const skillHit = resumeSkillSet.has(skill);
    const tokenHit = !skill.includes(' ') && resumeTokens.has(skill);
    if (phraseHit || skillHit || tokenHit) matched.push(skill);
    else missing.push(skill);
  }

  // Weight required skills more heavily than nice-to-haves for the score.
  const requiredHits = jd.requiredSkills.filter(s => matched.includes(s.toLowerCase())).length;
  const niceHits = jd.niceToHaveSkills.filter(s => matched.includes(s.toLowerCase())).length;
  const requiredTotal = Math.max(1, jd.requiredSkills.length);
  const niceTotal = Math.max(1, jd.niceToHaveSkills.length);
  const score = Math.round((requiredHits / requiredTotal) * 70 + (niceHits / niceTotal) * 30);

  const suggestions: string[] = [];
  if (missing.length > 0) {
    suggestions.push(`Consider mentioning these JD keywords if you have relevant experience: ${missing.slice(0, 8).join(', ')}.`);
  }
  if (resume.summary.length < 60) {
    suggestions.push('Your summary is short — add 2-3 lines tying your experience to the role.');
  }
  if (resume.experience.some(e => e.bullets.length < 2)) {
    suggestions.push('Some roles have fewer than 2 bullets — add measurable achievements (numbers, %).');
  }
  if (jd.seniorityHint !== 'Unspecified') {
    suggestions.push(`JD seniority hint: ${jd.seniorityHint}. Make sure your summary signals this level.`);
  }

  return { matchScore: score, matchedKeywords: matched, missingKeywords: missing, suggestions };
}

export function reorderSkills(resume: ParsedResume, jd: JDAnalysis): string[] {
  const want = new Set([...jd.requiredSkills, ...jd.niceToHaveSkills].map(s => s.toLowerCase()));
  const inJD: string[] = [];
  const others: string[] = [];
  for (const s of resume.skills) {
    if (want.has(s.toLowerCase())) inJD.push(s);
    else others.push(s);
  }
  return [...inJD, ...others];
}

export function highlightBullets(resume: ParsedResume, jd: JDAnalysis): TailoredResume['highlightedBullets'] {
  const want = [...jd.requiredSkills, ...jd.niceToHaveSkills].map(s => s.toLowerCase());
  const out: TailoredResume['highlightedBullets'] = [];
  resume.experience.forEach((exp, ei) => {
    exp.bullets.forEach((b, bi) => {
      const lower = b.toLowerCase();
      const hit = want.find(k => lower.includes(k));
      if (hit) out.push({ experienceIndex: ei, bulletIndex: bi, reason: `Mentions JD keyword "${hit}"` });
    });
  });
  return out;
}

export function ruleBasedSummary(resume: ParsedResume, jd: JDAnalysis): string {
  const role = jd.responsibilities[0] || (jd.jdKeywords[0] ? `${jd.jdKeywords[0]} role` : 'the role');
  const topSkills = reorderSkills(resume, jd).slice(0, 5);
  const yrsMatch = resume.rawText.match(/(\d+)\+?\s*(?:years|yrs)/i);
  const years = yrsMatch ? `${yrsMatch[1]}+ years of` : 'proven';
  const original = resume.summary?.trim() ? ` ${resume.summary.trim()}` : '';
  return `${resume.name ? resume.name + ' — ' : ''}${years} engineering experience with strengths in ${topSkills.join(', ') || 'cross-functional delivery'}, applying directly to ${role}.${original}`.trim();
}
