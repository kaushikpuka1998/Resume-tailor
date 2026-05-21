import type { JDAnalysis, ParsedResume, TailoredResume } from '../types';

const BASE = '/api';

export async function parseResume(file: File): Promise<ParsedResume> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/parse-resume`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to parse resume.');
  const data = await res.json();
  return data.resume as ParsedResume;
}

export async function analyze(
  resume: ParsedResume,
  jdText: string,
  useAI: boolean
): Promise<{ jd: JDAnalysis; tailored: TailoredResume }> {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, jdText, useAI })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to analyze.');
  return res.json();
}

export async function downloadPdf(tailored: TailoredResume): Promise<Blob> {
  const res = await fetch(`${BASE}/generate-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tailored })
  });
  if (!res.ok) throw new Error('Failed to generate PDF.');
  return res.blob();
}

export async function health(): Promise<{ ok: boolean; aiEnabled: boolean }> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error('Backend unreachable.');
  return res.json();
}
