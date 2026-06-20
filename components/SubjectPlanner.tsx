type SubjectPlannerProps = {
  autoPlan: boolean;
  maxDailyHours: number;
  onGeneratePlan: () => void;
  onToggleAutoPlan: () => void;
  onMaxDailyHoursChange: (hours: number) => void;
};

export function SubjectPlanner({
  autoPlan,
  maxDailyHours,
  onGeneratePlan,
  onToggleAutoPlan,
  onMaxDailyHoursChange,
}: SubjectPlannerProps) {
  return (
    <section className="glass-panel rounded-3xl p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
        <div>
          <p className="text-sm font800 uppercase tracking-wide text-[#ff6b76]">Scheduler engine</p>
          <h2 className="mt-1 max-w-3xl text-3xl font-black text-[#fff7f7]">Generate your adaptive study plan</h2>
          <p className="mt-3 max-w-3xl text-sm text-[#bfa4a7]">
            Set your daily capacity, choose whether Razor should re-plan automatically, then generate a schedule from the courses you manage.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#ffb4bb]/14 bg-[#070506]/55 px-3 py-2 text-sm text-[#d9c2c4]">
            <span className="text-[10px] font800 uppercase tracking-wide text-[#8f787b]">Daily cap</span>
            <span className="flex items-center justify-center gap-1.5">
              <input
                type="number"
                min={1}
                max={14}
                value={maxDailyHours}
                onChange={(event) => onMaxDailyHoursChange(Number(event.target.value))}
                className="w-10 bg-transparent text-center text-base font-black text-[#fff7f7] outline-none"
              />
              h
            </span>
          </label>
          <button
            type="button"
            onClick={onToggleAutoPlan}
            className={`min-h-12 rounded-xl border px-4 text-sm font800 transition ${
              autoPlan
                ? "border-[#e11d2e]/50 bg-[#e11d2e]/22 text-[#fff7f7] shadow-lg shadow-red-950/25"
                : "ghost-button"
            }`}
          >
            Auto-plan {autoPlan ? "on" : "off"}
          </button>
          <button type="button" onClick={onGeneratePlan} className="ember-button min-h-12 rounded-xl px-4 text-sm font800">
            Generate plan
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#ffb4bb]/12 bg-[#070506]/45 p-5">
        <p className="text-sm font700 text-[#fff7f7]">Courses are managed from the Courses page.</p>
        <p className="mt-1 text-sm text-[#bfa4a7]">
          Use the plus button to add a course, or hover any course card to edit or remove it.
        </p>
      </div>
    </section>
  );
}
