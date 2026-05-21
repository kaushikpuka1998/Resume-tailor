import OpenAI from 'openai';
import { JDAnalysis, ParsedResume } from '../types';

/**
 * Optional AI rewrite layer. Returns null when no API key is configured so the
 * caller can transparently fall back to the rule-based summary.
 */
export async function aiRewriteSummary(
  resume: ParsedResume,
  jd: JDAnalysis
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = new OpenAI({ apiKey: key });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const prompt = `You rewrite resume summaries to match a target job. Be concise (max 4 sentences),
factual (do NOT invent skills the candidate doesn't have), and ATS-friendly.

CANDIDATE SKILLS: ${resume.skills.slice(0, 25).join(', ')}
CANDIDATE EXISTING SUMMARY: ${resume.summary || '(none)'}
CANDIDATE RECENT TITLES: ${resume.experience.slice(0, 3).map(e => e.title).join(' | ')}

JOB REQUIRED SKILLS: ${jd.requiredSkills.join(', ')}
JOB NICE-TO-HAVES: ${jd.niceToHaveSkills.join(', ')}
JOB SENIORITY HINT: ${jd.seniorityHint}
JOB KEY RESPONSIBILITIES: ${jd.responsibilities.slice(0, 5).join(' | ')}

Output ONLY the rewritten summary — no preamble.`;

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an expert technical resume writer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 280
    });
    return res.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('[aiRewriter] OpenAI call failed, falling back:', (err as Error).message);
    return null;
  }
}
