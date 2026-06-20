import { useMemo, useState } from "react";
import { dateKey, formatDate, getRiskLevel, roundToOne, sumHours } from "@/lib/schedule";
import type { PlannerSettings, StudyTask } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

type CalendarSchedulerProps = {
  tasks: StudyTask[];
  today: string;
  onToggleTask: (taskId: string) => void;
  language?: PlannerSettings["language"];
};

const taskColor: Record<StudyTask["type"], string> = {
  lecture: "task-type-card-lecture",
  coding: "border-[#a855f7]/28 bg-[#a855f7]/12 text-[#ead7ff]",
  revision: "border-[#f59e0b]/30 bg-[#f59e0b]/12 text-[#ffe4b5]",
  mock: "task-type-card-mock",
  recap: "border-[#22c55e]/25 bg-[#22c55e]/10 text-[#d8ffe5]",
  summary: "border-[#60a5fa]/25 bg-[#60a5fa]/10 text-[#d9ebff]",
  exam: "border-[#ffb4bb]/42 bg-[#fff7f7]/13 text-[#fff7f7]",
  rest: "border-[#ffb4bb]/14 bg-[#fff7f7]/7 text-[#bfa4a7]",
};

const calendarCopy = {
  en: {
    locale: "en",
    title: "Calendar",
    hint: "Select a date to review the day plan.",
    previous: "Previous",
    today: "Today",
    next: "Next",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    task: "task",
    tasks: "tasks",
    dayPlan: "Day plan",
    selectDay: "Select a day",
    plannedHours: "planned hours",
    noWork: "No work scheduled for this day.",
    types: { lecture: "lecture", coding: "practice", revision: "revision", mock: "mock", recap: "assignment", summary: "study", exam: "exam", rest: "rest" },
  },
  de: {
    locale: "de-DE",
    title: "Kalender",
    hint: "Wähle ein Datum, um den Tagesplan zu prüfen.",
    previous: "Zurück",
    today: "Heute",
    next: "Weiter",
    weekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    task: "Aufgabe",
    tasks: "Aufgaben",
    dayPlan: "Tagesplan",
    selectDay: "Tag auswählen",
    plannedHours: "geplante Stunden",
    noWork: "Für diesen Tag ist keine Arbeit geplant.",
    types: { lecture: "Vorlesung", coding: "Übung", revision: "Wiederholung", mock: "Probe", recap: "Aufgabe", summary: "Lernen", exam: "Prüfung", rest: "Pause" },
  },
  pl: {
    locale: "pl-PL",
    title: "Kalendarz",
    hint: "Wybierz datę, aby przejrzeć plan dnia.",
    previous: "Poprzedni",
    today: "Dzisiaj",
    next: "Następny",
    weekdays: ["Pn", "Wt", "Sr", "Cz", "Pt", "So", "Nd"],
    task: "zadanie",
    tasks: "zadania",
    dayPlan: "Plan dnia",
    selectDay: "Wybierz dzień",
    plannedHours: "zaplanowane godziny",
    noWork: "Brak pracy zaplanowanej na ten dzień.",
    types: { lecture: "wykład", coding: "praktyka", revision: "powtórka", mock: "próbny", recap: "zadanie", summary: "nauka", exam: "egzamin", rest: "odpoczynek" },
  },
  it: {
    locale: "it-IT",
    title: "Calendario",
    hint: "Seleziona una data per vedere il piano del giorno.",
    previous: "Precedente",
    today: "Oggi",
    next: "Successivo",
    weekdays: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    task: "attività",
    tasks: "attività",
    dayPlan: "Piano del giorno",
    selectDay: "Seleziona un giorno",
    plannedHours: "ore pianificate",
    noWork: "Nessun lavoro pianificato per questo giorno.",
    types: { lecture: "lezione", coding: "pratica", revision: "ripasso", mock: "simulazione", recap: "compito", summary: "studio", exam: "esame", rest: "riposo" },
  },
};

export function CalendarScheduler({ tasks, today, onToggleTask, language = "en" }: CalendarSchedulerProps) {
  const copy = calendarCopy[language] ?? calendarCopy.en;
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const activeMonth = useMemo(() => {
    const date = new Date(`${today}T00:00:00`);
    date.setMonth(date.getMonth() + monthOffset);
    return date;
  }, [monthOffset, today]);

  const calendarDays = useMemo(() => buildMonthDays(activeMonth), [activeMonth]);
  const monthStartOffset = useMemo(() => getMondayStartOffset(activeMonth), [activeMonth]);
  const taskGroups = useMemo(
    () =>
      tasks.reduce<Record<string, StudyTask[]>>((groups, task) => {
        groups[task.date] = groups[task.date] ?? [];
        groups[task.date].push(task);
        return groups;
      }, {}),
    [tasks],
  );

  const monthLabel = new Intl.DateTimeFormat(copy.locale, { month: "long", year: "numeric" }).format(activeMonth);
  const selectedTasks = [...(taskGroups[selectedDate] ?? [])].sort(compareTasks);
  const selectedHours = roundToOne(sumHours(selectedTasks));
  const isSelectedInMonth = selectedDate.startsWith(`${activeMonth.getFullYear()}-${String(activeMonth.getMonth() + 1).padStart(2, "0")}`);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="glass-panel rounded-[1.35rem] p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.title}</p>
            <h2 className="mt-1 text-3xl font-black text-[#fff7f7]">{monthLabel}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#bfa4a7]">
              {copy.hint}
            </p>
          </div>
          <div className="flex rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/62 p-1 shadow-inner shadow-black/30">
            {[
              { label: copy.previous, action: "previous" },
              { label: copy.today, action: "today" },
              { label: copy.next, action: "next" },
            ].map(({ label, action }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (action === "previous") {
                    setMonthOffset((value) => value - 1);
                    setSelectedDate(getMonthDateKey(activeMonth, -1));
                  }
                  if (action === "today") {
                    setMonthOffset(0);
                    setSelectedDate(today);
                  }
                  if (action === "next") {
                    setMonthOffset((value) => value + 1);
                    setSelectedDate(getMonthDateKey(activeMonth, 1));
                  }
                }}
                className="rounded-lg px-3 py-2 text-sm font700 text-[#d9c2c4] transition duration-200 hover:bg-[#fff7f7]/10 hover:text-[#fff7f7]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 rounded-xl border border-[#ffb4bb]/10 bg-[#070506]/52 p-2 text-center text-xs font800 uppercase tracking-wide text-[#8f787b]">
          {copy.weekdays.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2.5">
          {Array.from({ length: monthStartOffset }, (_, index) => (
            <div key={`spacer-${index}`} className="aspect-square rounded-xl border border-transparent" aria-hidden="true" />
          ))}
          {calendarDays.map((day) => {
            const dayTasks = [...(taskGroups[day.key] ?? [])].sort(compareTasks);
            const hours = roundToOne(sumHours(dayTasks));
            const isSelected = selectedDate === day.key;
            const isToday = day.key === today;

            return (
              <article
                key={day.key}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDate(day.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDate(day.key);
                  }
                }}
                aria-label={`${formatDate(day.key)}, ${dayTasks.length} ${copy.tasks}`}
                className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border p-3 text-center outline-nonè transition duration-300 ${
                  isSelected
                    ? "calendar-day-selected z-20 ring-1 ring-[#ffb4bb]/20"
                    : isToday
                      ? "calendar-day-today shadow-lg shadow-black/24"
                      : "calendar-day-idle hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30"
                }`}
              >
                <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#ffb4bb]/18 to-transparent opacity-0 transition group-hover:opacity-100" />
                {isToday ? (
                  <span className="calendar-today-dot absolute right-3 top-3 h-2.5 w-2.5 rounded-full" />
                ) : null}
                <div className="relative flex h-full w-full flex-col items-center justify-center px-1">
                  <p className="text-2xl font-black leading-none text-[#fff7f7] md:text-3xl">{day.label}</p>
                  <div className="mt-3 w-full max-w-[6.5rem]">
                    <p className={`truncate text-[11px] font800 leading-none ${dayTasks.length > 0 ? "text-[#ffe7e9]" : "text-[#8f787b]"}`}>
                      {dayTasks.length === 1 ? `1 ${copy.task}` : `${dayTasks.length} ${copy.tasks}`}
                    </p>
                    {hours > 0 ? (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#fff7f7]/8">
                        <div
                          className="theme-progress-fill h-full rounded-full"
                          style={{ width: `${Math.min((hours / 10) * 100, 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="soft-card rounded-[1.35rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.dayPlan}</p>
            <h3 className="mt-1 text-2xl font-black text-[#fff7f7]">
              {isSelectedInMonth ? formatDate(selectedDate) : copy.selectDay}
            </h3>
            <p className="mt-1 text-sm font500 text-[#bfa4a7]">
              {selectedTasks.length} {copy.tasks}, {selectedHours} {copy.plannedHours}
            </p>
          </div>
          {selectedHours > 0 ? <RiskBadge level={getRiskLevel(selectedHours)} /> : null}
        </div>
        <div className="mt-5 space-y-2">
          {selectedTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ffb4bb]/20 bg-[#070506]/55 p-4 text-sm text-[#bfa4a7]">
              {copy.noWork}
            </p>
          ) : (
            selectedTasks.map((task) => (
              <TaskPill key={task.id} task={task} onToggleTask={onToggleTask} copy={copy} />
            ))
          )}
        </div>
      </aside>
    </section>
  );
}

function TaskPill({
  task,
  onToggleTask,
  copy,
  compact = false,
}: {
  task: StudyTask;
  onToggleTask: (taskId: string) => void;
  copy: typeof calendarCopy.en;
  compact?: boolean;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-lg border transition duration-200 ${taskColor[task.type]} ${
        compact ? "px-2 py-1.5 text-[11px] leading-snug" : "px-3 py-2 text-sm"
      } ${task.completed ? "opacity-45" : "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/24"}`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggleTask(task.id)}
          className="mt-0.5 accent-[#e11d2e]"
        />
        <span className="min-w-0">
          <span className={`block truncate font700 ${task.completed ? "line-through" : ""}`}>{task.title}</span>
          {!compact ? (
            <span className="mt-1 block text-xs opacity-75">
              {task.subject} - {copy.types[task.type]} - {task.estimatedHours}h
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function buildMonthDays(activeMonth: Date) {
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return {
      key: dateKey(date),
      label: String(date.getDate()),
    };
  });
}

function getMondayStartOffset(activeMonth: Date) {
  return (new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1).getDay() + 6) % 7;
}

function getMonthDateKey(activeMonth: Date, offset: number) {
  return dateKey(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + offset, 1));
}

function compareTasks(a: StudyTask, b: StudyTask) {
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}
