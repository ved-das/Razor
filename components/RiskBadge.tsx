import type { RiskLevel } from "@/lib/types";

const riskStyles: Record<RiskLevel, string> = {
  Low: "border-emerald-400/25 bg-emerald-400/12 text-emerald-100",
  Medium: "border-amber-400/25 bg-amber-400/12 text-amber-100",
  High: "border-orange-400/25 bg-orange-400/12 text-orange-100",
  Critical: "border-[#e11d2e]/45 bg-[#e11d2e]/18 text-[#ffd2d6]",
};

type RiskBadgeProps = {
  level: RiskLevel;
};

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font800 shadow-sm ${riskStyles[level]}`}>
      {level}
    </span>
  );
}
