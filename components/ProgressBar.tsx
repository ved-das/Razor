type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-[#bfa4a7]">
        <span>{label ?? "Progress"}</span>
        <span className="font800 text-[#fff7f7]">{clamped}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#fff7f7]/10">
        <div
          className="theme-progress-fill h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
