/**
 * Lightweight keyword & skill extraction. No external NLP dependency — uses curated
 * dictionaries plus simple tokenization heuristics. Good enough for hybrid analysis;
 * the AI layer (optional) refines the rewrite, but everything else works without it.
 */

export const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','then','of','at','by','for','with','about','against',
  'between','into','through','during','before','after','above','below','to','from','up','down',
  'in','out','on','off','over','under','again','further','once','is','are','was','were','be',
  'been','being','have','has','had','having','do','does','did','doing','as','that','this',
  'these','those','it','its','their','they','them','we','our','you','your','i','my','me',
  'will','would','should','could','can','may','might','must','shall','also','than','such',
  'role','candidate','candidates','team','teams','company','companies','work','working','years',
  'year','experience','experienced','strong','excellent','good','great','ability','responsibilities',
  'responsibility','etc','including','include','includes','required','requirements','requirement',
  'qualifications','qualification','plus','must','preferred','familiar','familiarity','knowledge'
]);

// Curated tech / business skill dictionary. Lowercase keys.
export const SKILL_DICT: string[] = [
  // Languages
  'javascript','typescript','python','java','c++','c#','go','golang','rust','ruby','php','kotlin','swift','scala','r',
  // Frontend
  'react','redux','next.js','nextjs','vue','angular','svelte','tailwind','tailwindcss','sass','css','html','webpack','vite',
  // Backend
  'node.js','nodejs','express','nestjs','django','flask','fastapi','spring','spring boot','rails','laravel','graphql','rest','grpc',
  // Data / DB
  'postgresql','postgres','mysql','sqlite','mongodb','redis','elasticsearch','dynamodb','cassandra','snowflake','bigquery','redshift',
  // Cloud / DevOps
  'aws','gcp','azure','docker','kubernetes','k8s','terraform','ansible','jenkins','github actions','gitlab ci','circleci','helm',
  // ML / AI
  'pytorch','tensorflow','scikit-learn','sklearn','pandas','numpy','keras','huggingface','llm','llms','nlp','rag','transformers',
  // Testing
  'jest','mocha','cypress','playwright','vitest','junit','pytest','rspec',
  // Mobile
  'react native','flutter','android','ios',
  // Misc engineering
  'microservices','ci/cd','tdd','bdd','agile','scrum','rest api','oauth','jwt','websockets','kafka','rabbitmq','event-driven',
  // Soft / business
  'leadership','communication','mentorship','stakeholder management','product management','project management','roadmap'
];

const PHRASE_SKILLS = SKILL_DICT.filter(s => s.includes(' ') || s.includes('.') || s.includes('-') || s.includes('/') || s.includes('+') || s.includes('#'));
const SINGLE_SKILLS = new Set(SKILL_DICT.filter(s => !PHRASE_SKILLS.includes(s)));

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\- ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const phrase of PHRASE_SKILLS) {
    // word-boundary-ish: phrase wrapped in non-alphanumeric or string edges.
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (re.test(lower)) found.add(phrase);
  }

  for (const token of tokenize(text)) {
    if (SINGLE_SKILLS.has(token)) found.add(token);
  }

  return Array.from(found).sort();
}

export function extractKeywords(text: string, limit = 40): string[] {
  const tokens = tokenize(text).filter(t => t.length > 2 && !STOPWORDS.has(t));
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

export function detectSeniority(text: string): string {
  const t = text.toLowerCase();
  if (/\b(staff|principal|architect|distinguished)\b/.test(t)) return 'Staff/Principal';
  if (/\b(senior|sr\.|lead)\b/.test(t)) return 'Senior';
  if (/\b(junior|jr\.|entry|intern|graduate)\b/.test(t)) return 'Junior';
  if (/\b(mid|mid-level|intermediate)\b/.test(t)) return 'Mid-level';
  if (/\b(manager|director|head of|vp|vice president)\b/.test(t)) return 'Management';
  return 'Unspecified';
}
