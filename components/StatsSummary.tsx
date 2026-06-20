import { RiskBadge } from "./RiskBadge";
import type { RiskLevel } from "@/lib/types";

type StatsSummaryProps = {
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  overallProgress: number;
  riskLevel: RiskLevel;
};

export function StatsSummary({
  totalHours,
  completedHours,
  remainingHours,
  overallProgress,
  riskLevel,
}: StatsSummaryProps) {
  const stats = [
    { label: "Planned today", value: `${totalHours}h`, note: "The promise" },
    { label: "Completed", value: `${completedHours}h`, note: "Already banked" },
    { label: "Remaining", value: `${remainingHours}h`, note: "Still on deck" },
    { label: "Overall progress", value: `${overallProgress}%`, note: "Across active courses" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-panel rounded-2xl p-5 transition duration-300 hover:-translate-y-1">
          <p className="text-sm font600 text-[#bfa4a7]">{stat.label}</p>
          <p className="mt-3 text-4xl font-black text-[#fff7f7]">{stat.value}</p>
          <p className="mt-2 text-xs font600 uppercase tracking-wide text-[#8f787b]">{stat.note}</p>
        </div>
      ))}
      <div className="glass-panel rounded-2xl p-5 transition duration-300 hover:-translate-y-1">
        <p className="text-sm font600 text-[#bfa4a7]">Workload risk</p>
        <div className="mt-5">
          <RiskBadge level={riskLevel} />
        </div>
      </div>
    </section>
  );
}
