import { formatDate, roundToOne, splitTasks, sumHours } from "@/lib/schedule";
import type { PlannerSettings, StudyTask } from "@/lib/types";

type TaskListProps = {
  tasks: StudyTask[];
  today: string;
  onToggleTask: (taskId: string) => void;
  grouped?: boolean;
  language?: PlannerSettings["language"];
};

const typeStyles: Record<StudyTask["type"], string> = {
  lecture: "task-type-lecture",
  coding: "bg-violet-400/12 text-violet-100 ring-violet-400/25",
  revision: "bg-amber-400/12 text-amber-100 ring-amber-400/25",
  mock: "task-type-mock",
  recap: "bg-emerald-400/12 text-emerald-100 ring-emerald-400/25",
  summary: "bg-indigo-400/12 text-indigo-100 ring-indigo-400/25",
  exam: "bg-[#fff7f7] text-[#090506] ring-[#fff7f7]",
  rest: "bg-[#fff7f7]/8 text-[#d9c2c4] ring-[#ffb4bb]/14",
};

const taskListCopy = {
  en: {
    empty: "No tasks here.",
    plannedHours: "planned hours",
    overdue: "Overdue",
    remaining: "Remaining",
    completed: "Completed",
    overdueBadge: "overdue",
    types: { lecture: "lecture", coding: "practice", revision: "revision", mock: "mock", recap: "assignment", summary: "study", exam: "exam", rest: "rest" },
  },
  de: {
    empty: "Keine Aufgaben vorhanden.",
    plannedHours: "geplante Stunden",
    overdue: "Überfällig",
    remaining: "Offen",
    completed: "Erledigt",
    overdueBadge: "überfällig",
    types: { lecture: "Vorlesung", coding: "Übung", revision: "Wiederholung", mock: "Probe", recap: "Aufgabe", summary: "Lernen", exam: "Prüfung", rest: "Pause" },
  },
  pl: {
    empty: "Brak zadań.",
    plannedHours: "zaplanowane godziny",
    overdue: "Zalegle",
    remaining: "Pozostale",
    completed: "Ukończone",
    overdueBadge: "zaległe",
    types: { lecture: "wykład", coding: "praktyka", revision: "powtórka", mock: "próbny", recap: "zadanie", summary: "nauka", exam: "egzamin", rest: "odpoczynek" },
  },
  it: {
    empty: "Nessuna attività qui.",
    plannedHours: "ore pianificate",
    overdue: "In ritardo",
    remaining: "Rimanenti",
    completed: "Completate",
    overdueBadge: "in ritardo",
    types: { lecture: "lezione", coding: "pratica", revision: "ripasso", mock: "simulazione", recap: "compito", summary: "studio", exam: "esame", rest: "riposo" },
  },
};

export function TaskList({ tasks, today, onToggleTask, grouped = false, language = "en" }: TaskListProps) {
  const copy = taskListCopy[language] ?? taskListCopy.en;
  if (tasks.length === 0) {
    return <p className="rounded-xl border border-dashed border-[#ffb4bb]/20 p-5 text-sm text-[#bfa4a7]">{copy.empty}</p>;
  }

  if (grouped) {
    const completedTasks = tasks.filter((task) => task.completed).sort((a, b) => a.date.localeCompare(b.date));
    const groups = [...tasks]
      .filter((task) => !task.completed)
      .sort((a, b) => a.date.localeCompare(b.date))
      .reduce<Record<string, StudyTask[]>>((acc, task) => {
        acc[task.date] = acc[task.date] ?? [];
        acc[task.date].push(task);
        return acc;
      }, {});

    return (
      <div className="space-y-6">
        {completedTasks.length > 0 ? (
          <details className="rounded-2xl border border-emerald-400/20 bg-emerald-400/6 p-4">
            <summary className="cursor-pointer select-none text-sm font800 text-emerald-100">
              {copy.completed} · {completedTasks.length}
            </summary>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {completedTasks.map((task) => (
                <TaskRow key={task.id} task={task} today={today} onToggleTask={onToggleTask} copy={copy} />
              ))}
            </div>
          </details>
        ) : null}
        {Object.entries(groups).map(([date, dayTasks]) => (
          <section key={date} className="space-y-3">
            <div className="flex flex-col gap-1 border-b border-[#ffb4bb]/10 pb-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font800 text-[#fff7f7]">{formatDate(date)}</h3>
              <p className="text-sm text-[#bfa4a7]">{roundToOne(sumHours(dayTasks))} {copy.plannedHours}</p>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {dayTasks.map((task) => (
                <TaskRow key={task.id} task={task} today={today} onToggleTask={onToggleTask} copy={copy} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const sections = splitTasks(tasks, today);

  return (
    <div className="space-y-5">
      <TaskSection title={copy.overdue} tasks={sections.overdue} today={today} onToggleTask={onToggleTask} copy={copy} />
      <TaskSection title={copy.remaining} tasks={sections.remaining} today={today} onToggleTask={onToggleTask} copy={copy} />
      <TaskSection title={copy.completed} tasks={sections.completed} today={today} onToggleTask={onToggleTask} copy={copy} />
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  today,
  onToggleTask,
  copy,
}: {
  title: string;
  tasks: StudyTask[];
  today: string;
  onToggleTask: (taskId: string) => void;
  copy: typeof taskListCopy.en;
}) {
  if (tasks.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font800 uppercase tracking-wide text-[#8f787b]">{title}</h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} onToggleTask={onToggleTask} copy={copy} />
        ))}
      </div>
    </section>
  );
}

function TaskRow({
  task,
  today,
  onToggleTask,
  copy,
}: {
  task: StudyTask;
  today: string;
  onToggleTask: (taskId: string) => void;
  copy: typeof taskListCopy.en;
}) {
  const overdue = !task.completed && task.date < today;

  return (
    <label
      className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition duration-200 ${
        task.completed
          ? "border-emerald-400/20 bg-emerald-400/8"
          : overdue
            ? "theme-task-card-overdue"
            : "theme-task-card"
      }`}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggleTask(task.id)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-[#ffb4bb]/30 accent-[#e11d2e]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font700 ${task.completed ? "text-[#8f787b] line-through" : "text-[#fff7f7]"}`}>
            {task.title}
          </p>
          <span className={`rounded-full px-2.5 py-1 text-xs font800 ring-1 ${typeStyles[task.type]}`}>
            {copy.types[task.type]}
          </span>
          {overdue ? <span className="theme-overdue-badge rounded-full px-2.5 py-1 text-xs font800">{copy.overdueBadge}</span> : null}
        </div>
        <p className="mt-2 text-sm text-[#bfa4a7]">
          {task.subject} - {task.phase} - {task.estimatedHours}h
        </p>
      </div>
    </label>
  );
}
