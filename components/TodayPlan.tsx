import { formatDate } from "@/lib/schedule";
import type { PlannerSettings, StudyTask } from "@/lib/types";
import { TaskList } from "./TaskList";

type TodayPlanProps = {
  today: string;
  tasks: StudyTask[];
  onToggleTask: (taskId: string) => void;
  language?: PlannerSettings["language"];
};

const todayCopy = {
  en: { today: "Today", plannedTasks: "planned tasks" },
  de: { today: "Heute", plannedTasks: "geplante Aufgaben" },
  pl: { today: "Dzisiaj", plannedTasks: "zaplanowane zadania" },
  it: { today: "Oggi", plannedTasks: "attività pianificate" },
};

export function TodayPlan({ today, tasks, onToggleTask, language = "en" }: TodayPlanProps) {
  const copy = todayCopy[language] ?? todayCopy.en;
  return (
    <section className="soft-card rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font800 uppercase tracking-wide text-[#ff6b76]">{copy.today}</p>
          <h2 className="text-2xl font800 text-[#fff7f7]">{formatDate(today)}</h2>
        </div>
        <p className="text-sm text-[#bfa4a7]">{tasks.length} {copy.plannedTasks}</p>
      </div>
      <TaskList tasks={tasks} today={today} onToggleTask={onToggleTask} language={language} />
    </section>
  );
}
