import type { JDAnalysis, TailoredResume } from '../types';
import { MatchScore } from './MatchScore';

interface Props {
  jd: JDAnalysis;
  tailored: TailoredResume;
}

export function AnalysisPanel({ jd, tailored }: Props) {
  return (
    <div className="card">
      <h2>3. JD Analysis</h2>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 24, marginBottom: 16 }}>
        <MatchScore score={tailored.match.matchScore} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="row" style={{ marginBottom: 6 }}>
            <span className="badge"><span className="dot" />Seniority: {jd.seniorityHint}</span>
            <span className={`badge ${tailored.aiUsed ? 'ok' : 'warn'}`}>
              <span className="dot" />
              {tailored.aiUsed ? 'AI-rewritten summary' : 'Rule-based summary'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {tailored.match.matchedKeywords.length} matched • {tailored.match.missingKeywords.length} missing
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Matched JD skills</div>
        {tailored.match.matchedKeywords.length === 0 && <em style={{ color: 'var(--muted)' }}>No matches yet.</em>}
        {tailored.match.matchedKeywords.map(k => <span key={k} className="chip">{k}</span>)}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Missing from your resume</div>
        {tailored.match.missingKeywords.length === 0 && <em style={{ color: 'var(--muted)' }}>None — great coverage.</em>}
        {tailored.match.missingKeywords.map(k => <span key={k} className="chip missing">{k}</span>)}
      </div>

      {tailored.match.suggestions.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '12px 0 8px' }}>Suggestions</div>
          {tailored.match.suggestions.map((s, i) => <div key={i} className="suggestion">{s}</div>)}
        </div>
      )}
    </div>
  );
}
