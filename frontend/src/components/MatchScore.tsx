interface Props { score: number; }

export function MatchScore({ score }: Props) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="score-ring">
      <svg width="110" height="110">
        <circle cx="55" cy="55" r={radius} stroke="#25305a" strokeWidth="10" fill="none" />
        <circle
          cx="55" cy="55" r={radius}
          stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="value" style={{ color }}>{score}</div>
      <div className="label">JD match</div>
    </div>
  );
}
