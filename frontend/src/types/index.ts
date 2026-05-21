export interface ResumeExperience {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  dates: string;
}

export interface ParsedResume {
  rawText: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
}

export interface JDAnalysis {
  jdText: string;
  jdKeywords: string[];
  requiredSkills: string[];
  niceToHaveSkills: string[];
  responsibilities: string[];
  seniorityHint: string;
}

export interface MatchReport {
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

export interface HighlightedBullet {
  experienceIndex: number;
  bulletIndex: number;
  reason: string;
}

export interface TailoredResume extends ParsedResume {
  tailoredSummary: string;
  reorderedSkills: string[];
  highlightedBullets: HighlightedBullet[];
  match: MatchReport;
  aiUsed: boolean;
}
