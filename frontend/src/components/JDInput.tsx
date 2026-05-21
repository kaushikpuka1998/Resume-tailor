import { useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
  useAI: boolean;
  onToggleAI: (v: boolean) => void;
  aiAvailable: boolean;
  canAnalyze: boolean;
  loading: boolean;
}

const PLACEHOLDER = `Paste the full job description here.

For example:
Senior Backend Engineer — Stripe
Responsibilities:
• Design and ship payment APIs at high scale
• Mentor mid-level engineers

Requirements:
• 5+ years building distributed systems
• Strong Go, Postgres, Kafka
• Familiarity with AWS / Kubernetes

Nice to have:
• Experience with Stripe API
• gRPC, observability tooling`;

export function JDInput({ value, onChange, onAnalyze, useAI, onToggleAI, aiAvailable, canAnalyze, loading }: Props) {
  const [chars, setChars] = useState(value.length);

  return (
    <div className="card">
      <h2>2. Paste the job description</h2>
      <textarea
        placeholder={PLACEHOLDER}
        value={value}
        onChange={e => { onChange(e.target.value); setChars(e.target.value.length); }}
      />
      <div className="row between" style={{ marginTop: 12 }}>
        <label className="toggle" title={aiAvailable ? 'Use the AI rewrite layer (OpenAI key required on backend)' : 'Backend has no OPENAI_API_KEY set — using rule-based only.'}>
          <input
            type="checkbox"
            checked={useAI && aiAvailable}
            disabled={!aiAvailable}
            onChange={e => onToggleAI(e.target.checked)}
          />
          AI rewrite {aiAvailable ? '' : '(disabled — no API key)'}
        </label>
        <div className="row">
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{chars} chars</span>
          <button className="btn primary" disabled={!canAnalyze || loading} onClick={onAnalyze}>
            {loading ? <><span className="spinner" /> Analyzing…</> : 'Analyze & Tailor'}
          </button>
        </div>
      </div>
    </div>
  );
}
