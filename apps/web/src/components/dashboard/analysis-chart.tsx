type AnalysisChartProps = {
  points: number[];
  labels?: string[];
};

export function AnalysisChart({ points, labels }: AnalysisChartProps) {
  const width = 720;
  const height = 240;
  const pad = 24;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);
  const range = Math.max(1, max - min);

  const path = points
    .map((point, i) => {
      const x = pad + (i * (width - pad * 2)) / Math.max(1, points.length - 1);
      const y = height - pad - ((point - min) * (height - pad * 2)) / range;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-wrap" role="img" aria-label="Analysis trend chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {labels && labels.length === points.length ? (
        <div className="chart-labels">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
