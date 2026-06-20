import { useState } from "react";
import { formatDate } from "@/lib/schedule";
import type { CourseProgress, PlannerSettings } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";

type CourseCardProps = {
  course: CourseProgress;
  onEdit: () => void;
  onRemove: () => void;
  onUpdateFinishDate?: () => void;
  language?: PlannerSettings["language"];
};

const priorityStyles = {
  high: "priority-pill-high",
  medium: "priority-pill-medium",
  low: "priority-pill-low",
};

const courseCardCopy = {
  en: {
    edit: "Edit",
    remove: "Remove",
    priorityLabels: { high: "High", medium: "Medium", low: "Low" },
    finishBy: "Finish by",
    noDeadline: "No deadline",
    exam: "Exam",
    noExam: "No exam",
    progress: "Progress",
    remaining: "Remaining",
    hoursLeft: "Hours left",
    dailyPlan: "Daily plan",
    revision: "Revision",
    needed: "Needed",
    notNeeded: "Not needed",
    items: "items",
    startsAfter: "Starts after dependencies",
    planBy: "Plan by",
    expectedFinish: "Expected finish",
    onTrack: "On track for deadline",
    late: "After deadline",
    updateFinishDate: "Update finish date to actual finish date?",
    updateFinishHelp: "This will use the expected finish date as the new course deadline.",
    confirm: "Confirm",
    cancel: "Cancel",
    day: "day",
  },
  de: {
    edit: "Bearbeiten",
    remove: "Entfernen",
    priorityLabels: { high: "Hoch", medium: "Mittel", low: "Niedrig" },
    finishBy: "Fertig bis",
    noDeadline: "Keine Frist",
    exam: "Prüfung",
    noExam: "Keine Prüfung",
    progress: "Fortschritt",
    remaining: "Offen",
    hoursLeft: "Stunden offen",
    dailyPlan: "Tagesplan",
    revision: "Wiederholung",
    needed: "Nötig",
    notNeeded: "Nicht nötig",
    items: "Einheiten",
    startsAfter: "Startet nach Abhängigkeiten",
    planBy: "Plan bis",
    expectedFinish: "Voraussichtlich fertig",
    onTrack: "Im Zeitplan",
    late: "Nach der Frist",
    updateFinishDate: "Fertigdatum auf tatsächliches Datum aktualisieren?",
    updateFinishHelp: "Dies nutzt das erwartete Fertigdatum als neue Kursfrist.",
    confirm: "Bestätigen",
    cancel: "Abbrechen",
    day: "Tag",
  },
  pl: {
    edit: "Edytuj",
    remove: "Usuń",
    priorityLabels: { high: "Wysoki", medium: "Średni", low: "Niski" },
    finishBy: "Ukończ do",
    noDeadline: "Brak terminu",
    exam: "Egzamin",
    noExam: "Brak egzaminu",
    progress: "Postęp",
    remaining: "Pozostało",
    hoursLeft: "Godziny zostały",
    dailyPlan: "Plan dzienny",
    revision: "Powtórka",
    needed: "Potrzebna",
    notNeeded: "Niepotrzebna",
    items: "elementy",
    startsAfter: "Start po zależnościach",
    planBy: "Plan do",
    expectedFinish: "Przewidywany koniec",
    onTrack: "Zgodnie z terminem",
    late: "Po terminie",
    updateFinishDate: "Zaktualizować datę końca do faktycznej daty?",
    updateFinishHelp: "To ustawi przewidywaną datę końca jako nowy termin kursu.",
    confirm: "Potwierdź",
    cancel: "Anuluj",
    day: "dzień",
  },
  it: {
    edit: "Modifica",
    remove: "Rimuovi",
    priorityLabels: { high: "Alta", medium: "Media", low: "Bassa" },
    finishBy: "Finisci entro",
    noDeadline: "Nessuna scadenza",
    exam: "Esame",
    noExam: "Nessun esame",
    progress: "Progresso",
    remaining: "Rimanenti",
    hoursLeft: "Ore rimaste",
    dailyPlan: "Piano giornaliero",
    revision: "Ripasso",
    needed: "Necessario",
    notNeeded: "Non necessario",
    items: "elementi",
    startsAfter: "Inizia dopo le dipendenze",
    planBy: "Pianifica entro",
    expectedFinish: "Finè prevista",
    onTrack: "In linea con la scadenza",
    late: "Dopo la scadenza",
    updateFinishDate: "Aggiornare la data di fine a quella effettiva?",
    updateFinishHelp: "Usa la data di fine prevista come nuova scadenza del corso.",
    confirm: "Conferma",
    cancel: "Annulla",
    day: "giorno",
  },
};

export function CourseCard({ course, onEdit, onRemove, onUpdateFinishDate, language = "en" }: CourseCardProps) {
  const copy = courseCardCopy[language] ?? courseCardCopy.en;
  const [confirmingFinishUpdate, setConfirmingFinishUpdate] = useState(false);
  return (
    <article className="group relative soft-card rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-[#e11d2e]/35">
      <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconButton label={`${copy.edit} ${course.name}`} onClick={onEdit}>
          <path d="M4 20h4.3L18.9 9.4a2.1 2.1 0 0 0 0-3L17.6 5a2.1 2.1 0 0 0-3 0L4 15.7V20Z" />
          <path d="m13.5 6.1 4.4 4.4" />
        </IconButton>
        <IconButton label={`${copy.remove} ${course.name}`} onClick={onRemove}>
          <path d="M6 7h12" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M8 7l1 13h6l1-13" />
          <path d="M10 7V5h4v2" />
        </IconButton>
      </div>

      <div className="flex items-start justify-between gap-4 pr-20">
        <div>
          <h3 className="text-xl font800 text-[#fff7f7]">{course.name}</h3>
          <p className="mt-1 text-sm text-[#bfa4a7]">
            {course.targetFinishDate ? `${copy.finishBy} ${formatDate(course.targetFinishDate)}` : copy.noDeadline}
          </p>
        </div>
        <span className={`priority-pill rounded-full px-3 py-1 text-xs font800 ${priorityStyles[course.priority]}`}>
          {copy.priorityLabels[course.priority]}
        </span>
      </div>

      <div className="mt-5">
        <ProgressBar value={course.progressPercent} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label={copy.exam} value={course.hasExam && course.examDate ? formatDate(course.examDate) : copy.noExam} />
        <Metric label={copy.progress} value={`${course.completedLectures}/${course.totalLectures}`} />
        <Metric label={copy.remaining} value={`${course.remainingLectures} ${copy.items}`} />
        <Metric label={copy.hoursLeft} value={`${course.remainingHours}h`} />
        <Metric label={copy.dailyPlan} value={`${course.planningDailyHoursNeeded}h/${copy.day}`} />
        <Metric label={copy.revision} value={course.requiresRevision ? copy.needed : copy.notNeeded} />
      </dl>

      {course.dependsOnId || course.dependsOnIds?.length ? (
        <p className="course-card-row-text mt-4 flex min-h-9 w-full items-center rounded-xl border border-[#ffb4bb]/12 bg-[#fff7f7]/7 px-3 font700 text-[#ffb4bb]">
          {copy.startsAfter}
        </p>
      ) : null}

      <p className={`course-card-row-text mt-3 flex min-h-9 w-full items-center rounded-xl border px-3 font700 ${
        course.deadlineMissed
          ? "border-[#e11d2e]/35 bg-[#e11d2e]/12 text-[#ffd2d6]"
          : "border-[#ffb4bb]/10 bg-[#070506]/38 text-[#bfa4a7]"
      }`}>
        {copy.expectedFinish} {course.expectedFinishDate ? formatDate(course.expectedFinishDate) : copy.noDeadline}. {course.targetFinishDate ? (course.deadlineMissed ? copy.late : copy.onTrack) : copy.noDeadline}.
      </p>
      {course.deadlineMissed && course.expectedFinishDate && onUpdateFinishDate ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setConfirmingFinishUpdate(true)}
            className="course-card-row-text course-card-update-button flex min-h-9 w-full items-center rounded-xl border border-[#e11d2e]/45 bg-gradient-to-r from-[#8f111a] to-[#4a0710] px-3 text-left font700 text-[#fff7f7] shadow-sm shadow-[#e11d2e]/15 transition hover:border-[#ff6b76]/55 hover:from-[#a71320] hover:to-[#5a0810]"
          >
            {copy.updateFinishDate}
          </button>
          {confirmingFinishUpdate ? (
            <div className="mt-3 rounded-lg border border-[#ffb4bb]/10 bg-[#12090b]/82 p-3">
              <p className="text-xs font700 text-[#d9c2c4]">{copy.updateFinishHelp}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateFinishDate();
                    setConfirmingFinishUpdate(false);
                  }}
                  className="ember-button rounded-lg px-3 py-2 text-xs font800"
                >
                  {copy.confirm}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingFinishUpdate(false)}
                  className="ghost-button rounded-lg px-3 py-2 text-xs font700"
                >
                  {copy.cancel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffb4bb]/14 bg-[#070506]/72 text-[#ffe7e9] shadow-lg shadow-black/20 transition hover:border-[#ff6b76]/45 hover:bg-[#e11d2e]/18"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        {children}
      </svg>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#ffb4bb]/10 bg-[#070506]/38 p-3">
      <dt className="text-xs font700 uppercase tracking-wide text-[#8f787b]">{label}</dt>
      <dd className="mt-1 font700 text-[#fff7f7]">{value}</dd>
    </div>
  );
}
