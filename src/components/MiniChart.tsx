interface MiniChartProps {
  values: number[];
  id: string;
  color?: string;
  height?: number;
  area?: boolean;
}

function chartPoints(values: number[], width: number, height: number) {
  if (values.length < 2) return `0,${height / 2} ${width},${height / 2}`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const top = 8;
  const bottom = height - 6;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = bottom - ((value - min) / range) * (bottom - top);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function MiniChart({
  values,
  id,
  color = "#5b3df5",
  height = 90,
  area = true,
}: MiniChartProps) {
  const width = 320;
  const points = chartPoints(values, width, height);
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradientId = `chart-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height }}
      aria-hidden
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            className="mini-chart-area"
            points={areaPoints}
            fill={`url(#${gradientId})`}
          />
        </>
      )}
      <polyline
        className="mini-chart-line"
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
