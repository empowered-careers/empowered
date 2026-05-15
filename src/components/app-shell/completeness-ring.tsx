import { cn } from "@/lib/utils";

export interface CompletenessRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Show the percentage in the middle */
  showLabel?: boolean;
  className?: string;
}

export function CompletenessRing({
  value,
  size = 36,
  strokeWidth = 3,
  showLabel = true,
  className,
}: CompletenessRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        className="-rotate-90"
        height={size}
        role="img"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <title>{`Profile ${clamped}% complete`}</title>
        <circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke="var(--accent)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      {showLabel ? (
        <div
          className="absolute inset-0 flex items-center justify-center font-semibold text-[10px]"
          style={{ fontSize: size <= 40 ? 10 : Math.round(size * 0.28) }}
        >
          {clamped}
        </div>
      ) : null}
    </div>
  );
}
