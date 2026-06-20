import { useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { createCourseId } from "@/lib/autoScheduler";
import { formatDate } from "@/lib/schedule";
import type { Course, CourseProgress, PlannerSettings, Priority, StudyMethod, StudyTask, TaskType } from "@/lib/types";
import { CourseCard } from "./CourseCard";

type CoursesManagerProps = {
  courses: CourseProgress[];
  baseCourses: Course[];
  tasks: StudyTask[];
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (courseId: string, patch: Partial<Course>) => void;
  onDeleteCourse: (courseId: string) => void;
  onAddTask: (task: StudyTask) => void;
  onUpdateTask: (taskId: string, patch: Partial<StudyTask>) => void;
  onDeleteTask: (taskId: string) => void;
  language: PlannerSettings["language"];
};

type View =
  | { kind: "list" }
  | { kind: "add" }
  | { kind: "edit"; courseId: string }
  | { kind: "remove"; courseId: string }
  | { kind: "dependencies"; mode: "add"; selectedIds: string[] }
  | { kind: "dependencies"; mode: "edit"; courseId: string; selectedIds: string[] };

const fieldClass = "field-dark h-10 w-full rounded-lg px-3 text-sm placeholder:text-[#8f787b]";

type CourseCopy = typeof courseCopy.en;

const halfHourStep = 0.5;

const courseCopy = {
  en: {
    dailyCap: "Daily cap",
    decreaseDailyCap: "Decrease daily cap",
    increaseDailyCap: "Increase daily cap",
    autoPlan: "Auto-plan",
    on: "on",
    off: "off",
    generatePlan: "Generate plan",
    todayOverCapacityPrefix: "Today is over capacity by",
    moveExcessQuestion: "Move the excess unfinished work to tomorrow?",
    moveTo: "Move to",
    applySuggestedCap: "Use suggested cap",
    courses: "Courses",
    coursesHelp: "Manage courses, deadlines, study methods, and dependencies.",
    searchCourses: "Search courses",
    addCourse: "Add course",
    editCourse: "Edit",
    noCourseMatches: "No courses match your search.",
    removeCourse: (name: string) => `Remove ${name}?`,
    removeCourseHelp: "This removes the course and every task attached to it. This change is saved locally.",
    yesRemove: "Yes, remove",
    cancel: "Cancel",
    back: "Back",
    courseSetup: "Course setup",
    methods: "methods",
    tasks: "tasks",
    courseName: "Course name",
    finishBy: "Finish by",
    noDeadline: "No deadline",
    customFinishDate: "Custom finish date",
    targetFinishDate: "Target finish date",
    deadlineOptional: "Target finish date (Optional)",
    examUsesFinishDate: "Exam uses deadline",
    customExamDate: "Custom exam date",
    examDate: "Exam date",
    priority: "Priority",
    priorityLabels: { high: "High", medium: "Medium", low: "Low" },
    priorityHints: {
      high: "Scheduled first with a 4-day buffer",
      medium: "Balanced scheduling with a 2-day buffer",
      low: "Flexible scheduling with no extra buffer",
    },
    planningOrder: "Planner order",
    planningOrderHelp: "Lower numbers are scheduled first when priority ties.",
    exam: "Exam",
    revision: "Revision",
    studyMethods: "Study methods",
    total: "total",
    courseTasks: "Course tasks",
    courseTasksHelp: "Search or edit task rows when you need to change details.",
    plannedDate: "Planned",
    customTaskDeadline: "Custom deadline",
    addCustomDeadline: "Add custom deadline",
    searchCourseTasks: "Search course tasks",
    addTask: "Add task",
    noTasksYet: "No tasks yet.",
    noTaskMatches: "No tasks match your search.",
    unsavedCourseChanges: "You have unsaved course changes.",
    discard: "Discard",
    confirmChanges: "Confirm changes",
    done: "Done",
    remove: "Remove",
    yes: "Yes",
    no: "No",
    dependencies: "Dependencies",
    addDependencies: "Add dependencies",
    noDependenciesSelected: "No dependencies selected",
    selected: "selected",
    confirmDependencies: "Confirm dependencies",
    selectDependencies: "Select course dependencies",
    dependencyHelp: "Choose every course that should be completed before this course starts.",
    noDependencies: "No dependencies",
    noDependenciesHelp: "Let this course start as soon as scheduling allows.",
    lectures: "items",
    finishByLower: "finish by",
    taskTypes: { lecture: "Lecture", summary: "Study", coding: "Practice", revision: "Revision", recap: "Assignment", mock: "Mock", exam: "Exam", rest: "Rest" },
    method: "Method",
    totalItems: "Total",
    doneItems: "Done",
    hours: "Hours",
    addMethod: "Add method",
    methodsHelp: "Add whatever you actually need to finish: lectures, flashcards, YouTube, readings, practice sets.",
    noMethods: "No study methods added. This course will only track its finish date or exam date.",
    addSeparateExamDate: "Add separate exam date",
    noExamTitle: "This course has no exam",
    noExamBody: "Razor will use the finish date as a personal deadline instead. You can add an exam date later from the course editor.",
    goBack: "Go back",
    addCourseWithoutExam: "Add course without exam",
  },
  de: {
    dailyCap: "Tageslimit",
    decreaseDailyCap: "Tageslimit verringern",
    increaseDailyCap: "Tageslimit erhöhen",
    autoPlan: "Auto-Plan",
    on: "an",
    off: "aus",
    generatePlan: "Plan erstellen",
    todayOverCapacityPrefix: "Heute liegt über dem Limit um",
    moveExcessQuestion: "Überschüssige offene Arbeit auf morgen verschieben?",
    moveTo: "Verschieben auf",
    applySuggestedCap: "Vorgeschlagenes Limit nutzen",
    courses: "Kurse",
    coursesHelp: "Verwalte Kurse, Fristen, Lernmethoden und Abhängigkeiten.",
    searchCourses: "Kurse suchen",
    addCourse: "Kurs hinzufügen",
    editCourse: "Bearbeiten",
    noCourseMatches: "Keine Kurse passen zur Suche.",
    removeCourse: (name: string) => `${name} entfernen?`,
    removeCourseHelp: "Dies entfernt den Kurs und alle zugehörigen Aufgaben. Die Änderung wird lokal gespeichert.",
    yesRemove: "Ja, entfernen",
    cancel: "Abbrechen",
    back: "Zurück",
    courseSetup: "Kurseinrichtung",
    methods: "Methoden",
    tasks: "Aufgaben",
    courseName: "Kursname",
    finishBy: "Fertig bis",
    noDeadline: "Keine Frist",
    customFinishDate: "Eigenes Fertigdatum",
    targetFinishDate: "Zielfertigstellung",
    deadlineOptional: "Zielfertigstellung (Optional)",
    examUsesFinishDate: "Prüfung nutzt Frist",
    customExamDate: "Eigenes Prüfungsdatum",
    examDate: "Prüfungsdatum",
    priority: "Priorität",
    priorityLabels: { high: "Hoch", medium: "Mittel", low: "Niedrig" },
    priorityHints: {
      high: "Wird zuerst geplant, mit 4 Tagen Puffer",
      medium: "Ausgewogene Planung mit 2 Tagen Puffer",
      low: "Flexible Planung ohne zusätzlichen Puffer",
    },
    planningOrder: "Planungsreihenfolge",
    planningOrderHelp: "Niedrigere Zahlen werden bei gleicher Priorität zuerst geplant.",
    exam: "Prüfung",
    revision: "Wiederholung",
    studyMethods: "Lernmethoden",
    total: "gesamt",
    courseTasks: "Kursaufgaben",
    courseTasksHelp: "Suche oder bearbeite Aufgabenzeilen, wenn Details geändert werden müssen.",
    plannedDate: "Geplant",
    customTaskDeadline: "Eigene Frist",
    addCustomDeadline: "Eigene Frist hinzufügen",
    searchCourseTasks: "Kursaufgaben suchen",
    addTask: "Aufgabe hinzufügen",
    noTasksYet: "Noch keine Aufgaben.",
    noTaskMatches: "Keine Aufgaben passen zur Suche.",
    unsavedCourseChanges: "Du hast ungespeicherte Kursänderungen.",
    discard: "Verwerfen",
    confirmChanges: "Änderungen bestätigen",
    done: "Erledigt",
    remove: "Entfernen",
    yes: "Ja",
    no: "Nein",
    dependencies: "Abhängigkeiten",
    addDependencies: "Abhängigkeiten hinzufügen",
    noDependenciesSelected: "Keine Abhängigkeiten ausgewählt",
    selected: "ausgewählt",
    confirmDependencies: "Abhängigkeiten bestätigen",
    selectDependencies: "Kursabhängigkeiten wählen",
    dependencyHelp: "Wähle alle Kurse, die vor diesem Kurs abgeschlossen sein sollen.",
    noDependencies: "Keine Abhängigkeiten",
    noDependenciesHelp: "Dieser Kurs kann starten, sobald die Planung es erlaubt.",
    lectures: "Einheiten",
    finishByLower: "fertig bis",
    taskTypes: { lecture: "Vorlesung", summary: "Lernen", coding: "Übung", revision: "Wiederholung", recap: "Aufgabe", mock: "Probe", exam: "Prüfung", rest: "Pause" },
    method: "Methode",
    totalItems: "Gesamt",
    doneItems: "Erledigt",
    hours: "Stunden",
    addMethod: "Methode hinzufügen",
    methodsHelp: "Füge alles hinzu, was du wirklich brauchst: Vorlesungen, Karteikarten, YouTube, Lektüre, Übungssets.",
    noMethods: "Keine Lernmethoden hinzugefügt. Dieser Kurs trackt nur Fertigstellungs- oder Prüfungsdatum.",
    addSeparateExamDate: "Separates Prüfungsdatum hinzufügen",
    noExamTitle: "Dieser Kurs hat keine Prüfung",
    noExamBody: "Razor nutzt das Fertigdatum stattdessen als persönliche Frist. Du kannst später im Kurseditor ein Prüfungsdatum hinzufügen.",
    goBack: "Zurück",
    addCourseWithoutExam: "Kurs ohne Prüfung hinzufügen",
  },
  pl: {
    dailyCap: "Limit dzienny",
    decreaseDailyCap: "Zmniejsz limit dzienny",
    increaseDailyCap: "Zwiększ limit dzienny",
    autoPlan: "Auto-plan",
    on: "wł.",
    off: "wył.",
    generatePlan: "Wygeneruj plan",
    todayOverCapacityPrefix: "Dzisiaj przekracza limit o",
    moveExcessQuestion: "Przenieść nadmiar otwartej pracy na jutro?",
    moveTo: "Przenieś na",
    applySuggestedCap: "Użyj sugerowanego limitu",
    courses: "Kursy",
    coursesHelp: "Zarządzaj kursami, terminami, metodami nauki i zależnościami.",
    searchCourses: "Szukaj kursów",
    addCourse: "Dodaj kurs",
    editCourse: "Edytuj",
    noCourseMatches: "Brak kursów pasujących do wyszukiwania.",
    removeCourse: (name: string) => `Usunąć ${name}?`,
    removeCourseHelp: "To usunie kurs i wszystkie przypisane zadania. Zmiana zostanie zapisana lokalnie.",
    yesRemove: "Tak, usuń",
    cancel: "Anuluj",
    back: "Wróć",
    courseSetup: "Konfiguracja kursu",
    methods: "metody",
    tasks: "zadania",
    courseName: "Nazwa kursu",
    finishBy: "Ukończ do",
    noDeadline: "Brak terminu",
    customFinishDate: "Własna data końca",
    targetFinishDate: "Docelowa data ukończenia",
    deadlineOptional: "Docelowa data ukończenia (Optional)",
    examUsesFinishDate: "Egzamin używa terminu",
    customExamDate: "Własna data egzaminu",
    examDate: "Data egzaminu",
    priority: "Priorytet",
    priorityLabels: { high: "Wysoki", medium: "Średni", low: "Niski" },
    priorityHints: {
      high: "Planowany jako pierwszy, z 4 dniami bufora",
      medium: "Zrównoważone planowanie z 2 dniami bufora",
      low: "Elastyczne planowanie bez dodatkowego bufora",
    },
    planningOrder: "Kolejność planowania",
    planningOrderHelp: "Niższe liczby są planowane pierwsze przy tym samym priorytecie.",
    exam: "Egzamin",
    revision: "Powtórka",
    studyMethods: "Metody nauki",
    total: "razem",
    courseTasks: "Zadania kursu",
    courseTasksHelp: "Szukaj lub edytuj wiersze zadań, gdy chcesz zmienić szczegóły.",
    plannedDate: "Zaplanowano",
    customTaskDeadline: "Własny termin",
    addCustomDeadline: "Dodaj własny termin",
    searchCourseTasks: "Szukaj zadań kursu",
    addTask: "Dodaj zadanie",
    noTasksYet: "Brak zadań.",
    noTaskMatches: "Brak zadań pasujących do wyszukiwania.",
    unsavedCourseChanges: "Masz niezapisane zmiany kursu.",
    discard: "Odrzuć",
    confirmChanges: "Potwierdź zmiany",
    done: "Gotowe",
    remove: "Usuń",
    yes: "Tak",
    no: "Nie",
    dependencies: "Zależności",
    addDependencies: "Dodaj zależności",
    noDependenciesSelected: "Nie wybrano zależności",
    selected: "wybrano",
    confirmDependencies: "Potwierdź zależności",
    selectDependencies: "Wybierz zależności kursu",
    dependencyHelp: "Wybierz kursy, które powinny być ukończone przed rozpoczęciem tego kursu.",
    noDependencies: "Brak zależności",
    noDependenciesHelp: "Ten kurs może zacząć się, gdy tylko pozwoli na to harmonogram.",
    lectures: "elementy",
    finishByLower: "ukończ do",
    taskTypes: { lecture: "Wykład", summary: "Nauka", coding: "Praktyka", revision: "Powtórka", recap: "Zadanie", mock: "Próbny", exam: "Egzamin", rest: "Odpoczynek" },
    method: "Metoda",
    totalItems: "Razem",
    doneItems: "Gotowe",
    hours: "Godziny",
    addMethod: "Dodaj metodę",
    methodsHelp: "Dodaj to, czego naprawdę potrzebujesz: wykłady, fiszki, YouTube, czytania, zestawy ćwiczeń.",
    noMethods: "Nie dodano metod nauki. Ten kurs będzie śledził tylko termin ukończenia lub egzaminu.",
    addSeparateExamDate: "Dodaj osobną datę egzaminu",
    noExamTitle: "Ten kurs nie ma egzaminu",
    noExamBody: "Razor użyje daty ukończenia jako osobistego terminu. Datę egzaminu można dodać później w edytorze kursu.",
    goBack: "Wróć",
    addCourseWithoutExam: "Dodaj kurs bez egzaminu",
  },
  it: {
    dailyCap: "Limite giornaliero",
    decreaseDailyCap: "Riduci limite giornaliero",
    increaseDailyCap: "Aumenta limite giornaliero",
    autoPlan: "Auto-plan",
    on: "attivo",
    off: "spento",
    generatePlan: "Genera piano",
    todayOverCapacityPrefix: "Oggi supera il limite di",
    moveExcessQuestion: "Spostare a domani il lavoro non completato in eccesso?",
    moveTo: "Sposta a",
    applySuggestedCap: "Usa limite suggerito",
    courses: "Corsi",
    coursesHelp: "Gestisci corsi, scadenze, metodi di studio e dipendenze.",
    searchCourses: "Cerca corsi",
    addCourse: "Aggiungi corso",
    editCourse: "Modifica",
    noCourseMatches: "Nessun corso corrisponde alla ricerca.",
    removeCourse: (name: string) => `Rimuovere ${name}?`,
    removeCourseHelp: "Rimuove il corso e tutte le attività collegate. La modifica viene salvata localmente.",
    yesRemove: "Sì, rimuovi",
    cancel: "Annulla",
    back: "Indietro",
    courseSetup: "Configurazione corso",
    methods: "metodi",
    tasks: "attività",
    courseName: "Nome corso",
    finishBy: "Finire entro",
    noDeadline: "Nessuna scadenza",
    customFinishDate: "Data fine personalizzata",
    targetFinishDate: "Data obiettivo",
    deadlineOptional: "Data obiettivo (Optional)",
    examUsesFinishDate: "L'esame usa la scadenza",
    customExamDate: "Data esame personalizzata",
    examDate: "Data esame",
    priority: "Priorita",
    priorityLabels: { high: "Alta", medium: "Media", low: "Bassa" },
    priorityHints: {
      high: "Pianificato per primo con 4 giorni di margine",
      medium: "Pianificazione bilanciata con 2 giorni di margine",
      low: "Pianificazione flessibile senza margine extra",
    },
    planningOrder: "Ordine di pianificazione",
    planningOrderHelp: "I numeri più bassi vengono pianificati prima a parità di priorità.",
    exam: "Esame",
    revision: "Ripasso",
    studyMethods: "Metodi di studio",
    total: "totale",
    courseTasks: "Attività del corso",
    courseTasksHelp: "Cerca o modifica le righe quando devi cambiare dettagli.",
    plannedDate: "Pianificato",
    customTaskDeadline: "Scadenza personalizzata",
    addCustomDeadline: "Aggiungi scadenza",
    searchCourseTasks: "Cerca attività del corso",
    addTask: "Aggiungi attività",
    noTasksYet: "Ancora nessuna attività.",
    noTaskMatches: "Nessuna attività corrisponde alla ricerca.",
    unsavedCourseChanges: "Hai modifiche del corso non salvate.",
    discard: "Scarta",
    confirmChanges: "Conferma modifiche",
    done: "Fatto",
    remove: "Rimuovi",
    yes: "Si",
    no: "No",
    dependencies: "Dipendenze",
    addDependencies: "Aggiungi dipendenze",
    noDependenciesSelected: "Nessuna dipendenza selezionata",
    selected: "selezionate",
    confirmDependencies: "Conferma dipendenze",
    selectDependencies: "Seleziona dipendenze del corso",
    dependencyHelp: "Scegli ogni corso che deve essere completato prima che questo corso inizi.",
    noDependencies: "Nessuna dipendenza",
    noDependenciesHelp: "Lascia iniziare questo corso appena la pianificazione lo consente.",
    lectures: "elementi",
    finishByLower: "finire entro",
    taskTypes: { lecture: "Lezione", summary: "Studio", coding: "Pratica", revision: "Ripasso", recap: "Compito", mock: "Simulazione", exam: "Esame", rest: "Riposo" },
    method: "Metodo",
    totalItems: "Totale",
    doneItems: "Fatti",
    hours: "Ore",
    addMethod: "Aggiungi metodo",
    methodsHelp: "Aggiungi ciò che ti serve davvero: lezioni, flashcard, YouTube, letture, set di pratica.",
    noMethods: "Nessun metodo di studio aggiunto. Questo corso terrà traccia solo della data fine o dell'esame.",
    addSeparateExamDate: "Aggiungi data esame separata",
    noExamTitle: "Questo corso non ha un esame",
    noExamBody: "Razor userà la data di fine come scadenza personale. Puoi aggiungere una data esame più tardi dall'editor del corso.",
    goBack: "Indietro",
    addCourseWithoutExam: "Aggiungi corso senza esame",
  },
};

export function CoursesManager({
  courses,
  baseCourses,
  tasks,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  language,
}: CoursesManagerProps) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");
  const [pendingAddDependencyIds, setPendingAddDependencyIds] = useState<string[]>([]);
  const selectedCourse = view.kind === "edit" || view.kind === "remove"
    ? courses.find((course) => course.id === view.courseId)
    : undefined;
  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const copy = (courseCopy as Record<string, CourseCopy>)[language] ?? courseCopy.en;

  if (view.kind === "dependencies") {
    const dependencyCourses = view.mode === "edit"
      ? baseCourses.filter((course) => course.id !== view.courseId)
      : baseCourses;

    return (
      <DependencyWorkspace
        copy={copy}
        courses={dependencyCourses}
        selectedIds={view.selectedIds}
        onChange={(selectedIds) => setView({ ...view, selectedIds })}
        onCancel={() =>
          setView(view.mode === "edit" ? { kind: "edit", courseId: view.courseId } : { kind: "add" })
        }
        onConfirm={() => {
          if (view.mode === "edit") {
            onUpdateCourse(view.courseId, {
              dependsOnIds: view.selectedIds,
              dependsOnId: view.selectedIds[0],
            });
            setView({ kind: "edit", courseId: view.courseId });
          } else {
            setPendingAddDependencyIds(view.selectedIds);
            setView({ kind: "add" });
          }
        }}
      />
    );
  }

  if (view.kind === "add") {
    return (
      <CourseWorkspace title={copy.addCourse} onBack={() => setView({ kind: "list" })}>
        <CourseForm
          copy={copy}
          courses={baseCourses}
          pendingDependencyIds={pendingAddDependencyIds}
          onOpenDependencies={(selectedIds) => setView({ kind: "dependencies", mode: "add", selectedIds })}
          onSubmit={(course) => {
            onAddCourse(course);
            setPendingAddDependencyIds([]);
            setView({ kind: "list" });
          }}
        />
      </CourseWorkspace>
    );
  }

  if (view.kind === "edit" && selectedCourse) {
    return (
      <CourseWorkspace title={`${copy.editCourse} ${selectedCourse.name}`} onBack={() => setView({ kind: "list" })}>
        <CourseEditor
          copy={copy}
          key={selectedCourse.id}
          course={selectedCourse}
          allCourses={baseCourses}
          tasks={tasks}
          onUpdateCourse={onUpdateCourse}
          onOpenDependencies={(selectedIds) =>
            setView({ kind: "dependencies", mode: "edit", courseId: selectedCourse.id, selectedIds })
          }
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      </CourseWorkspace>
    );
  }

  if (view.kind === "remove" && selectedCourse) {
    return (
      <CourseWorkspace title="Remove course" onBack={() => setView({ kind: "list" })}>
        <div className="soft-card max-w-2xl rounded-2xl p-6">
          <p className="text-xl font-black text-[#fff7f7]">{copy.removeCourse(selectedCourse.name)}</p>
          <p className="mt-2 text-sm leading-6 text-[#bfa4a7]">
            {copy.removeCourseHelp}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onDeleteCourse(selectedCourse.id);
                setView({ kind: "list" });
              }}
              className="ember-button rounded-lg px-4 py-2 text-sm font800"
            >
              {copy.yesRemove}
            </button>
            <button type="button" onClick={() => setView({ kind: "list" })} className="ghost-button rounded-lg px-4 py-2 text-sm font700">
              {copy.cancel}
            </button>
          </div>
        </div>
      </CourseWorkspace>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h3 className="text-3xl font-black text-[#fff7f7]">{copy.courses}</h3>
          <p className="mt-2 text-sm text-[#bfa4a7]">{copy.coursesHelp}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchCourses}
            className="field-dark h-12 min-w-0 rounded-xl px-4 text-sm placeholder:text-[#8f787b] sm:w-80"
          />
          <button
            type="button"
            onClick={() => setView({ kind: "add" })}
            aria-label={copy.addCourse}
            title={copy.addCourse}
            className="ember-button grid h-12 w-full place-items-center rounded-xl text-xl font-black sm:w-12"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            language={language}
            onEdit={() => setView({ kind: "edit", courseId: course.id })}
            onRemove={() => setView({ kind: "remove", courseId: course.id })}
            onUpdateFinishDate={
              course.expectedFinishDate
                ? () => onUpdateCourse(course.id, { targetFinishDate: course.expectedFinishDate })
                : undefined
            }
          />
        ))}
      </div>
      {filteredCourses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#070506]/45 p-4 text-sm text-[#bfa4a7]">
          {copy.noCourseMatches}
        </p>
      ) : null}
    </section>
  );
}

function CourseWorkspace({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font800 uppercase tracking-wide text-[#ff6b76]">Courses</p>
          <h3 className="mt-1 text-2xl font-black text-[#fff7f7]">{title}</h3>
        </div>
        <button type="button" onClick={onBack} className="ghost-button rounded-lg px-4 py-2 text-sm font700">
          Back
        </button>
      </div>
      {children}
    </section>
  );
}

function CourseForm({
  copy,
  courses,
  pendingDependencyIds,
  onOpenDependencies,
  onSubmit,
}: {
  copy: CourseCopy;
  courses: Course[];
  pendingDependencyIds: string[];
  onOpenDependencies: (selectedIds: string[]) => void;
  onSubmit: (course: Course) => void;
}) {
  const [name, setName] = useState("");
  const [studyMethods, setStudyMethods] = useState<StudyMethod[]>([
    {
      id: "lectures",
      name: "Lecture",
      totalItems: 10,
      completedItems: 0,
      hoursPerItem: 2,
      taskType: "lecture",
    },
  ]);
  const [deadline, setDeadline] = useState("");
  const [hasExam, setHasExam] = useState(true);
  const [examUsesDeadline, setExamUsesDeadline] = useState(false);
  const [examDate, setExamDate] = useState("2026-07-31");
  const [requiresRevision, setRequiresRevision] = useState(true);
  const [priority, setPriority] = useState<Priority>("medium");
  const [confirmNoExam, setConfirmNoExam] = useState(false);

  const resolvedExamDate = examUsesDeadline ? deadline : examDate;
  const canSubmit =
    name.trim().length > 0 &&
    (!hasExam || resolvedExamDate.length > 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    if (!hasExam && !confirmNoExam) {
      setConfirmNoExam(true);
      return;
    }

    addCourse();
  }

  function addCourse() {
    const idBase = createCourseId(name);
    const duplicateCount = courses.filter((course) => course.id.startsWith(idBase)).length;
    const id = duplicateCount === 0 ? idBase : `${idBase}-${duplicateCount + 1}`;
    const cleanMethods = studyMethods
      .filter((method) => method.name.trim() && method.totalItems > 0)
      .map((method, index) => ({
        ...method,
        id: method.id || createMethodId(method.name, index),
        name: method.name.trim(),
        completedItems: Math.min(method.completedItems, method.totalItems),
      }));
    const lectureMethod = cleanMethods.find((method) => method.taskType === "lecture") ?? cleanMethods[0];
    const totalLectures = cleanMethods.reduce((total, method) => total + method.totalItems, 0);
    const completedLectures = cleanMethods.reduce((total, method) => total + Math.min(method.completedItems, method.totalItems), 0);

    onSubmit({
      id,
      name: name.trim(),
      totalLectures,
      baselineCompletedLectures: Math.min(completedLectures, totalLectures),
      completedLectures: Math.min(completedLectures, totalLectures),
      hoursPerLecture: lectureMethod?.hoursPerItem ?? 1,
      studyMethods: cleanMethods,
      targetFinishDate: deadline || undefined,
      examDate: hasExam ? resolvedExamDate : undefined,
      hasExam,
      requiresRevision,
      priority,
      planningOrder: courses.length + 1,
      dependsOnIds: pendingDependencyIds,
      dependsOnId: pendingDependencyIds[0],
    });
  }

  return (
    <form onSubmit={submit} className="soft-card mx-auto w-full max-w-5xl rounded-2xl p-5 sm:p-6">
      <div className="grid min-w-0 gap-5">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(260px,1fr)_150px] lg:items-end">
          <Field label={copy.courseName}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.courseName} className={fieldClass} />
          </Field>
          <button type="submit" disabled={!canSubmit} className="ember-button h-10 w-full rounded-lg px-4 text-sm font800 disabled:cursor-not-allowed disabled:opacity-40">
            {copy.addCourse}
          </button>
        </div>

        <StudyMethodsEditor methods={studyMethods} onChange={setStudyMethods} copy={copy} />

        <div className="grid min-w-0 gap-4 md:grid-cols-2 md:items-start">
          <Field label={copy.priority}>
            <PriorityPicker value={priority} onChange={setPriority} copy={copy} />
            <FieldHint>{copy.priorityHints[priority]}</FieldHint>
          </Field>
          <DependencyButton
            copy={copy}
            courses={courses}
            selectedIds={pendingDependencyIds}
            onClick={() => onOpenDependencies(pendingDependencyIds)}
          />
        </div>

        <div className="grid min-w-0 gap-3 rounded-xl border border-[#ffb4bb]/10 bg-[#070506]/32 p-3">
          <DeadlineControl value={deadline} onChange={setDeadline} copy={copy} />
          <div className="flex min-w-0 flex-wrap gap-2">
            <CompactToggle
              label={copy.exam}
              checked={hasExam}
              onChange={() => {
                const nextHasExam = !hasExam;
                setHasExam(nextHasExam);
                if (!nextHasExam) setExamUsesDeadline(false);
              }}
            />
            <CompactToggle label={copy.revision} checked={requiresRevision} onChange={() => setRequiresRevision((value) => !value)} />
          </div>

          {hasExam ? (
            <ExamDateControls
              copy={copy}
              hasDeadline={Boolean(deadline)}
              examUsesDeadline={examUsesDeadline}
              examDate={examDate}
              onUseDeadline={() => setExamUsesDeadline(true)}
              onUseCustom={() => setExamUsesDeadline(false)}
              onExamDateChange={setExamDate}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setHasExam(true);
                setExamUsesDeadline(false);
              }}
              className="ghost-button h-10 rounded-lg px-3 text-xs font800"
            >
              {copy.addSeparateExamDate}
            </button>
          )}
        </div>
      </div>
      {confirmNoExam ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="soft-card w-full max-w-md rounded-2xl p-5">
            <p className="text-lg font-black text-[#fff7f7]">{copy.noExamTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#bfa4a7]">
              {copy.noExamBody}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmNoExam(false)} className="ghost-button rounded-lg px-4 py-2 text-sm font800">
                {copy.goBack}
              </button>
              <button type="button" onClick={addCourse} className="ember-button rounded-lg px-4 py-2 text-sm font800">
                {copy.addCourseWithoutExam}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function CompactToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font800 transition ${
        checked ? "border-[#e11d2e]/45 bg-[#e11d2e]/16 text-[#fff7f7]" : "border-[#ffb4bb]/12 bg-[#090506]/50 text-[#d9c2c4]"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#e11d2e]" />
      {label}
    </label>
  );
}

function parseLooseHoursInput(value: string, fallback: number) {
  const parsed = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(parsed, 0.1), 24);
}

type DateParts = { day: string; month: string; year: string };

function DateTextInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const displayParts = datePartsFromIso(value);
  const [draftState, setDraftState] = useState({ source: value, parts: displayParts, touched: false });
  const [error, setError] = useState("");
  const parts = draftState.source === value ? draftState.parts : displayParts;
  const partOrder: Array<keyof DateParts> = ["day", "month", "year"];
  const refs = {
    day: useRef<HTMLInputElement>(null),
    month: useRef<HTMLInputElement>(null),
    year: useRef<HTMLInputElement>(null),
  };

  function updatePart(part: keyof DateParts, rawValue: string) {
    setError("");
    const nextParts = { ...parts, [part]: rawValue.replace(/\D/g, "").slice(0, 2) };
    setDraftState({ source: value, parts: nextParts, touched: true });
    commitParts(nextParts, false);
  }

  function commitParts(nextParts: DateParts, showPartialError: boolean) {
    const empty = !nextParts.day && !nextParts.month && !nextParts.year;
    if (empty) {
      onChange("");
      setError("");
      return;
    }

    const complete = Boolean(nextParts.day.length === 2 && nextParts.month.length === 2 && nextParts.year.length === 2);
    if (!complete) {
      if (showPartialError) setError("Fill day, month, and year.");
      return;
    }

    const normalized = `20${nextParts.year}-${nextParts.month}-${nextParts.day}`;
    if (isValidIsoDate(normalized)) {
      onChange(normalized);
      setDraftState({ source: normalized, parts: datePartsFromIso(normalized), touched: false });
      setError("");
      return;
    }
    setError("Use a real date, for example 02.07.26.");
  }

  function updateDigit(part: keyof DateParts, event: ReactKeyboardEvent<HTMLInputElement>) {
    const valueLength = parts[part].length || 2;
    const rawIndex = event.currentTarget.selectionStart ?? valueLength - 1;
    const digitIndex = Math.min(Math.max(rawIndex, 0), valueLength - 1);
    const digits = (parts[part] || (part === "year" ? "26" : "01")).padStart(2, "0").split("");
    const currentDigit = Number(digits[digitIndex] ?? "0");
    const delta = event.key === "ArrowUp" ? 1 : -1;
    digits[digitIndex] = String((currentDigit + delta + 10) % 10);
    updatePart(part, digits.join(""));
    window.requestAnimationFrame(() => {
      event.currentTarget.setSelectionRange(digitIndex, digitIndex + 1);
    });
  }

  function onDateKeyDown(part: keyof DateParts, event: ReactKeyboardEvent<HTMLInputElement>) {
    const index = partOrder.indexOf(part);
    const caret = event.currentTarget.selectionStart ?? 0;
    const atEnd = caret >= event.currentTarget.value.length;
    const atStart = caret <= 0;
    if (event.key === "ArrowRight" && atEnd) {
      const nextPart = partOrder[index + 1];
      if (nextPart) refs[nextPart].current?.focus();
      return;
    }
    if (event.key === "ArrowLeft" && atStart) {
      const previousPart = partOrder[index - 1];
      if (previousPart) refs[previousPart].current?.focus();
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    updateDigit(part, event);
  }

  return (
    <div className="w-full min-w-0">
      <div className={`date-field grid grid-cols-[1fr_auto_1fr_auto_1.5fr_auto] items-center gap-1 px-3 text-sm font800 ${
        error ? "border-[#ff6b76]/75 bg-[#2a080d]/72" : "border-[#ffb4bb]/16 bg-[#070506]/74 focus-within:border-[#e11d2e]/75"
      } ${className ?? ""}`}>
        <input
          value={parts.day}
          onChange={(event) => updatePart("day", event.target.value)}
          onKeyDown={(event) => onDateKeyDown("day", event)}
          onBlur={() => commitParts(parts, draftState.touched)}
          placeholder="dd"
          inputMode="numeric"
          ref={refs.day}
          aria-label={`${ariaLabel} day`}
          className="min-w-0 bg-transparent text-center font800 tabular-nums outline-none placeholder:text-center placeholder:text-[#8f787b]"
        />
        <span className="text-[#8f787b]">.</span>
        <input
          value={parts.month}
          onChange={(event) => updatePart("month", event.target.value)}
          onKeyDown={(event) => onDateKeyDown("month", event)}
          onBlur={() => commitParts(parts, draftState.touched)}
          placeholder="mm"
          inputMode="numeric"
          ref={refs.month}
          aria-label={`${ariaLabel} month`}
          className="min-w-0 bg-transparent text-center font800 tabular-nums outline-none placeholder:text-center placeholder:text-[#8f787b]"
        />
        <span className="text-[#8f787b]">.</span>
        <input
          value={parts.year}
          onChange={(event) => updatePart("year", event.target.value)}
          onKeyDown={(event) => onDateKeyDown("year", event)}
          onBlur={() => commitParts(parts, draftState.touched)}
          placeholder="yy"
          inputMode="numeric"
          ref={refs.year}
          aria-label={`${ariaLabel} year`}
          className="min-w-0 bg-transparent text-center font800 tabular-nums outline-none placeholder:text-center placeholder:text-[#8f787b]"
        />
        {parts.day || parts.month || parts.year ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setDraftState({ source: "", parts: { day: "", month: "", year: "" }, touched: false });
              setError("");
            }}
            aria-label="Clear date"
            className="ml-2 grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs text-[#8f787b] transition hover:bg-[#e11d2e]/16 hover:text-white"
          >
            x
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs font700 text-[#ff9aa2]">{error}</p> : null}
    </div>
  );
}

function datePartsFromIso(value: string): DateParts {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? { day: match[3], month: match[2], year: match[1].slice(-2) } : { day: "", month: "", year: "" };
}

function isValidIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function uniqueLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function DeadlineControl({
  value,
  onChange,
  copy,
}: {
  value: string;
  onChange: (value: string) => void;
  copy: CourseCopy;
}) {
  const [showCustomDate, setShowCustomDate] = useState(Boolean(value));
  const usingCustomDate = showCustomDate || Boolean(value);
  return (
    <Field label={copy.targetFinishDate}>
      {usingCustomDate ? (
        <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
          <div>
            <div className="mb-1 h-4" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setShowCustomDate(false);
                onChange("");
              }}
              className="theme-segment-option h-11 w-full rounded-xl border px-3 text-center text-sm font800 transition"
            >
              {copy.noDeadline}
            </button>
          </div>
          <div>
            <p className="mb-1 h-4 text-center text-[10px] font800 uppercase leading-4 tracking-[0.18em] text-[#bfa4a7]">
              {copy.customFinishDate}
            </p>
            <DateTextInput value={value} onChange={onChange} ariaLabel={copy.finishBy} className="h-11 rounded-xl border px-3" />
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setShowCustomDate(false);
              onChange("");
            }}
            className="theme-segment-option theme-segment-selected h-11 w-full rounded-xl border px-3 text-center text-sm font800 transition"
          >
            {copy.noDeadline}
          </button>
          <button
            type="button"
            onClick={() => setShowCustomDate(true)}
            className="theme-segment-option h-11 w-full rounded-xl border px-3 text-center text-sm font800 transition"
          >
            {copy.customFinishDate}
          </button>
        </div>
      )}
    </Field>
  );
}

function PriorityPicker({ value, onChange, copy }: { value: Priority; onChange: (priority: Priority) => void; copy: CourseCopy }) {
  const options: Priority[] = ["high", "medium", "low"];

  return (
    <div className="theme-segment-shell grid h-10 grid-cols-3 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`theme-segment-option rounded-md text-xs font800 transition ${value === option ? "theme-segment-selected" : ""}`}
        >
          {copy.priorityLabels[option]}
        </button>
      ))}
    </div>
  );
}

const taskTypeOptions: TaskType[] = [
  "lecture",
  "summary",
  "coding",
  "revision",
  "recap",
  "mock",
];

function StudyMethodsEditor({
  methods,
  onChange,
  copy,
  compact = false,
}: {
  methods: StudyMethod[];
  onChange: (methods: StudyMethod[]) => void;
  copy: CourseCopy;
  compact?: boolean;
}) {
  function updateMethod(methodId: string, patch: Partial<StudyMethod>) {
    onChange(methods.map((method) => (method.id === methodId ? { ...method, ...patch } : method)));
  }

  function addMethod() {
    onChange([
      ...methods,
      {
        id: uniqueLocalId("method"),
        name: "Flashcards",
        totalItems: 10,
        completedItems: 0,
        hoursPerItem: 1,
        taskType: "summary",
      },
    ]);
  }

  function removeMethod(methodId: string) {
    onChange(methods.filter((method) => method.id !== methodId));
  }

  return (
    <div className={`${compact ? "" : "rounded-xl border border-[#ffb4bb]/10 bg-[#070506]/32 p-3"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font800 text-[#fff7f7]">{copy.studyMethods}</p>
          <p className="mt-1 text-xs font600 text-[#bfa4a7]">{copy.methodsHelp}</p>
        </div>
        <button type="button" onClick={addMethod} className="ghost-button rounded-lg px-3 py-2 text-xs font800">
          {copy.addMethod}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {methods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#090506]/45 p-4 text-sm font700 text-[#bfa4a7]">
            {copy.noMethods}
          </div>
        ) : null}
        {methods.map((method) => (
          <div key={method.id} className="rounded-xl border border-[#ffb4bb]/10 bg-[#090506]/60 p-3">
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_90px_90px_90px_auto] md:items-end">
              <Field label={copy.method}>
                <input
                  value={method.name}
                  onChange={(event) => updateMethod(method.id, { name: event.target.value })}
                  aria-label="Study method name"
                  className={fieldClass}
                  placeholder="Flashcards"
                />
              </Field>
              <Field label={copy.totalItems}>
                <input
                  type="number"
                  min={0}
                  value={method.totalItems}
                  onChange={(event) => updateMethod(method.id, { totalItems: Number(event.target.value) })}
                  aria-label="Total items"
                  className={fieldClass}
                />
              </Field>
              <Field label={copy.doneItems}>
                <input
                  type="number"
                  min={0}
                  value={method.completedItems}
                  onChange={(event) => updateMethod(method.id, { completedItems: Number(event.target.value) })}
                  aria-label="Completed items"
                  className={fieldClass}
                />
              </Field>
              <Field label={copy.hours}>
                <input
                  type="number"
                  min={0.1}
                  step={halfHourStep}
                  value={method.hoursPerItem}
                  onChange={(event) => updateMethod(method.id, { hoursPerItem: Number(event.target.value) })}
                  aria-label="Hours per item"
                  className={fieldClass}
                />
              </Field>
              <button
                type="button"
                onClick={() => removeMethod(method.id)}
                className="ghost-button h-10 rounded-lg px-3 text-xs font800"
              >
                {copy.remove}
              </button>
            </div>
            <div className="mt-3">
              <InlineTaskTypePicker
                value={method.taskType}
                onChange={(taskType) => updateMethod(method.id, { taskType })}
                copy={copy}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InlineTaskTypePicker({ value, onChange, copy }: { value: TaskType; onChange: (taskType: TaskType) => void; copy: CourseCopy }) {
  return (
    <div className="theme-segment-shell grid min-h-10 grid-cols-2 gap-1.5 rounded-lg p-1 sm:grid-cols-3">
      {taskTypeOptions.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`theme-segment-option min-h-9 rounded-md px-2.5 py-1.5 text-center text-[11px] font800 transition ${value === option ? "theme-segment-selected" : ""}`}
        >
          {copy.taskTypes[option]}
        </button>
      ))}
    </div>
  );
}

function ExamDateControls({
  copy,
  hasDeadline,
  examUsesDeadline,
  examDate,
  onUseDeadline,
  onUseCustom,
  onExamDateChange,
}: {
  copy: CourseCopy;
  hasDeadline: boolean;
  examUsesDeadline: boolean;
  examDate: string;
  onUseDeadline: () => void;
  onUseCustom: () => void;
  onExamDateChange: (date: string) => void;
}) {
  return (
    <Field label={copy.examDate}>
      {!examUsesDeadline ? (
        <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
          <div>
            <div className="mb-1 h-4" aria-hidden="true" />
            <button
              type="button"
              disabled={!hasDeadline}
              onClick={onUseDeadline}
              className="theme-segment-option h-11 w-full rounded-xl border px-3 text-center text-sm font800 transition disabled:cursor-not-allowed disabled:opacity-35"
            >
              {copy.examUsesFinishDate}
            </button>
          </div>
          <div>
            <p className="mb-1 h-4 text-center text-[10px] font800 uppercase leading-4 tracking-[0.18em] text-[#bfa4a7]">
              {copy.customExamDate}
            </p>
            <DateTextInput value={examDate} onChange={onExamDateChange} ariaLabel={copy.customExamDate} className="h-11 rounded-xl border px-3" />
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!hasDeadline}
            onClick={onUseDeadline}
            className="theme-segment-option theme-segment-selected h-11 w-full rounded-xl border px-3 text-center text-sm font800 transition disabled:cursor-not-allowed disabled:opacity-35"
          >
            {copy.examUsesFinishDate}
          </button>
          <button
            type="button"
            onClick={onUseCustom}
            className="theme-segment-option h-11 w-full rounded-xl border px-3 text-center text-sm font800 transition"
          >
            {copy.customExamDate}
          </button>
        </div>
      )}
    </Field>
  );
}

function normalizeEditorTask(task: StudyTask): StudyTask {
  const normalized: StudyTask = {
    ...task,
    title: task.title.trim() || "Untitled task",
    subject: task.subject.trim() || task.title.trim() || "Course task",
    phase: task.phase.trim() || "Manual edit",
    estimatedHours: Math.max(0, task.estimatedHours),
  };
  if (!normalized.deadline) delete normalized.deadline;
  if (!normalized.customDeadline) delete normalized.customDeadline;
  if (!normalized.courseId) delete normalized.courseId;
  return normalized;
}

function normalizeEditorTasks(tasks: StudyTask[]) {
  return tasks.map((task, index) => normalizeEditorTask({ ...task, planningOrder: index + 1 }));
}

function CourseEditor({
  copy,
  course,
  allCourses,
  tasks,
  onUpdateCourse,
  onOpenDependencies,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: {
  copy: CourseCopy;
  course: CourseProgress;
  allCourses: Course[];
  tasks: StudyTask[];
  onUpdateCourse: (courseId: string, patch: Partial<Course>) => void;
  onOpenDependencies: (selectedIds: string[]) => void;
  onAddTask: (task: StudyTask) => void;
  onUpdateTask: (taskId: string, patch: Partial<StudyTask>) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const [examUsesDeadline, setExamUsesDeadline] = useState(Boolean(course.targetFinishDate && course.examDate === course.targetFinishDate));
  const fallbackMethods = useMemo(
    () =>
      course.studyMethods ?? [
        {
          id: "lectures",
          name: "Lecture",
          totalItems: course.totalLectures,
          completedItems: course.baselineCompletedLectures ?? course.completedLectures,
          hoursPerItem: course.hoursPerLecture,
          taskType: "lecture" as const,
        },
      ],
    [course],
  );
  const [draftCourse, setDraftCourse] = useState({
    name: course.name,
    targetFinishDate: course.targetFinishDate ?? "",
    priority: course.priority,
    planningOrder: course.planningOrder ?? allCourses.findIndex((item) => item.id === course.id) + 1,
    hasExam: course.hasExam,
    requiresRevision: course.requiresRevision,
    examDate: course.examDate,
    studyMethods: fallbackMethods,
  });

  const courseTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.courseId === course.id)
        .sort(
          (a, b) =>
            (a.planningOrder ?? 10_000) - (b.planningOrder ?? 10_000) ||
            a.date.localeCompare(b.date) ||
            a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }),
        )
        .map((task, index) => ({ ...task, planningOrder: task.planningOrder ?? index + 1 })),
    [course.id, tasks],
  );
  const courseTaskKey = JSON.stringify(courseTasks);
  const [draftTaskState, setDraftTaskState] = useState<{ sourceKey: string; tasks: StudyTask[] }>({
    sourceKey: courseTaskKey,
    tasks: courseTasks,
  });
  const draftTasks = draftTaskState.sourceKey === courseTaskKey ? draftTaskState.tasks : courseTasks;
  const [savedTaskState, setSavedTaskState] = useState<{ sourceKey: string; tasks: StudyTask[] } | null>(null);
  const [deletedTaskState, setDeletedTaskState] = useState<{ sourceKey: string; ids: string[] }>({
    sourceKey: courseTaskKey,
    ids: [],
  });
  const deletedTaskIds = deletedTaskState.sourceKey === courseTaskKey ? deletedTaskState.ids : [];
  const [taskSearch, setTaskSearch] = useState("");
  const [taskDragState, setTaskDragState] = useState<{ id: string; x: number; y: number } | null>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  const taskDragOverRef = useRef<string | null>(null);
  const draggedTask = taskDragState ? draftTasks.find((task) => task.id === taskDragState.id) : undefined;
  const editableMethods = draftCourse.studyMethods;
  const filteredDraftTasks = draftTasks.filter((task) => {
    const query = taskSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      task.title,
      task.subject,
      task.phase,
      task.type,
      task.date,
      task.deadline ?? "",
      task.customDeadline ?? "",
      String(task.estimatedHours),
    ].some((value) => value.toLowerCase().includes(query));
  });
  const baselineTasks = savedTaskState?.sourceKey === courseTaskKey ? savedTaskState.tasks : courseTasks;
  const taskDraftChanged =
    JSON.stringify(normalizeEditorTasks(draftTasks)) !== JSON.stringify(normalizeEditorTasks(baselineTasks)) ||
    deletedTaskIds.length > 0;
  const courseChanged =
    draftCourse.name !== course.name ||
    draftCourse.targetFinishDate !== (course.targetFinishDate ?? "") ||
    draftCourse.priority !== course.priority ||
    draftCourse.planningOrder !== (course.planningOrder ?? allCourses.findIndex((item) => item.id === course.id) + 1) ||
    draftCourse.hasExam !== course.hasExam ||
    draftCourse.requiresRevision !== course.requiresRevision ||
    (draftCourse.examDate ?? "") !== (course.examDate ?? "") ||
    JSON.stringify(draftCourse.studyMethods) !== JSON.stringify(fallbackMethods);
  const hasEditorChanges = courseChanged || taskDraftChanged;

  function setDraftTasks(updater: StudyTask[] | ((current: StudyTask[]) => StudyTask[])) {
    setDraftTaskState((current) => {
      const baseTasks = current.sourceKey === courseTaskKey ? current.tasks : courseTasks;
      const nextTasks = typeof updater === "function" ? updater(baseTasks) : updater;
      return { sourceKey: courseTaskKey, tasks: nextTasks };
    });
  }

  function setDeletedTaskIds(updater: string[] | ((current: string[]) => string[])) {
    setDeletedTaskState((current) => {
      const baseIds = current.sourceKey === courseTaskKey ? current.ids : [];
      const nextIds = typeof updater === "function" ? updater(baseIds) : updater;
      return { sourceKey: courseTaskKey, ids: nextIds };
    });
  }

  function updateStudyMethods(methods: StudyMethod[]) {
    setDraftCourse((current) => ({ ...current, studyMethods: methods }));
  }

  function saveCourseChanges() {
    const cleanMethods = editableMethods
      .filter((method) => method.name.trim() && method.totalItems > 0)
      .map((method, index) => ({
        ...method,
        id: method.id || createMethodId(method.name, index),
        name: method.name.trim(),
        completedItems: Math.min(method.completedItems, method.totalItems),
      }));
    const lectureMethod = cleanMethods.find((method) => method.taskType === "lecture") ?? cleanMethods[0];
    const totalLectures = cleanMethods.reduce((total, method) => total + method.totalItems, 0);
    const completedLectures = cleanMethods.reduce((total, method) => total + Math.min(method.completedItems, method.totalItems), 0);

    if (courseChanged) {
      onUpdateCourse(course.id, {
        name: draftCourse.name,
        targetFinishDate: draftCourse.targetFinishDate || undefined,
        priority: draftCourse.priority,
        planningOrder: draftCourse.planningOrder,
        hasExam: draftCourse.hasExam,
        requiresRevision: draftCourse.requiresRevision,
        examDate: draftCourse.hasExam ? draftCourse.examDate || draftCourse.targetFinishDate || undefined : undefined,
        studyMethods: cleanMethods,
        totalLectures,
        baselineCompletedLectures: completedLectures,
        completedLectures,
        hoursPerLecture: lectureMethod?.hoursPerItem ?? course.hoursPerLecture,
      });
    }

    deletedTaskIds.forEach((taskId) => onDeleteTask(taskId));
    const originalTaskIds = new Set(courseTasks.map((task) => task.id));
    const cleanDraftTasks = normalizeEditorTasks(draftTasks);
    cleanDraftTasks.forEach((task) => {
      const taskPatch: Partial<StudyTask> = {
        ...task,
        deadline: task.deadline || undefined,
        customDeadline: task.customDeadline || undefined,
        courseId: task.courseId || undefined,
      };
      if (originalTaskIds.has(task.id)) {
        const originalTask = courseTasks.find((item) => item.id === task.id);
        if (originalTask && JSON.stringify(normalizeEditorTask(task)) !== JSON.stringify(normalizeEditorTask(originalTask))) {
          onUpdateTask(task.id, taskPatch);
        }
      } else {
        onAddTask(task);
      }
    });
    setDraftTasks(cleanDraftTasks);
    setSavedTaskState({ sourceKey: courseTaskKey, tasks: cleanDraftTasks });
    setDeletedTaskIds([]);
  }

  function addCourseTask() {
    const taskType = editableMethods[0]?.taskType ?? "summary";
    setDraftTasks((current) => [
      ...current,
      {
        id: uniqueLocalId(`manual-${course.id}`),
        date: draftCourse.targetFinishDate || course.examDate || "",
        title: `${draftCourse.name} task`,
        subject: draftCourse.name,
        courseId: course.id,
        type: taskType,
        phase: "Manual edit",
        estimatedHours: editableMethods[0]?.hoursPerItem ?? 1,
        completed: false,
        planningOrder: current.length + 1,
      },
    ]);
  }

  function resetDrafts() {
    setDraftCourse({
      name: course.name,
      targetFinishDate: course.targetFinishDate ?? "",
      priority: course.priority,
      planningOrder: course.planningOrder ?? allCourses.findIndex((item) => item.id === course.id) + 1,
      hasExam: course.hasExam,
      requiresRevision: course.requiresRevision,
      examDate: course.examDate,
      studyMethods: fallbackMethods,
    });
    setDraftTasks(courseTasks);
    setSavedTaskState(null);
    setDeletedTaskIds([]);
  }

  function updateDraftTask(taskId: string, patch: Partial<StudyTask>) {
    setDraftTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const next = { ...task, ...patch };
        for (const key of Object.keys(patch) as Array<keyof StudyTask>) {
          if ((key === "deadline" || key === "customDeadline" || key === "courseId") && (patch[key] === undefined || patch[key] === "")) {
            delete (next as Partial<StudyTask>)[key];
          }
        }
        return normalizeEditorTask(next);
      }),
    );
  }

  function removeDraftTask(taskId: string) {
    setDraftTasks((current) => current.filter((task) => task.id !== taskId).map((task, index) => ({ ...task, planningOrder: index + 1 })));
    if (courseTasks.some((task) => task.id === taskId)) {
      setDeletedTaskIds((current) => (current.includes(taskId) ? current : [...current, taskId]));
    }
  }

  function reorderDraftTask(activeId: string, overId: string, placement: "before" | "after") {
    if (activeId === overId || taskSearch.trim()) return;
    setDraftTasks((current) => {
      const from = current.findIndex((task) => task.id === activeId);
      const overIndex = current.findIndex((task) => task.id === overId);
      let to = placement === "after" ? overIndex + 1 : overIndex;
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (from < to) to -= 1;
      next.splice(to, 0, moved);
      return next.map((task, index) => ({ ...task, planningOrder: index + 1 }));
    });
  }

  function taskPlacementFromPoint(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    const directRow = element?.closest("[data-course-task-id]") as HTMLElement | null;
    if (directRow?.dataset.courseTaskId) {
      const rect = directRow.getBoundingClientRect();
      return { id: directRow.dataset.courseTaskId, placement: y > rect.top + rect.height / 2 ? "after" : "before" } as const;
    }
    const rows = Array.from(taskListRef.current?.querySelectorAll<HTMLElement>("[data-course-task-id]") ?? []);
    if (rows.length === 0) return undefined;
    let closest = rows[0];
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const distance = Math.abs(y - (rect.top + rect.height / 2));
      if (distance < closestDistance) {
        closest = row;
        closestDistance = distance;
      }
    }
    if (!closest.dataset.courseTaskId) return undefined;
    const rect = closest.getBoundingClientRect();
    return { id: closest.dataset.courseTaskId, placement: y > rect.top + rect.height / 2 ? "after" : "before" } as const;
  }

  function beginTaskDrag(event: ReactPointerEvent<HTMLElement>, taskId: string) {
    if (event.button !== 0 || taskSearch.trim()) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setTaskDragState({ id: taskId, x: event.clientX, y: event.clientY });
    taskDragOverRef.current = taskId;
  }

  function updateTaskDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!taskDragState || event.buttons !== 1) return;
    setTaskDragState({ id: taskDragState.id, x: event.clientX, y: event.clientY });
    const target = taskPlacementFromPoint(event.clientX, event.clientY);
    if (target?.id && target.id !== taskDragState.id) taskDragOverRef.current = `${target.id}:${target.placement}`;
  }

  function endTaskDrag(event: ReactPointerEvent<HTMLElement>) {
    const target = taskDragState ? taskPlacementFromPoint(event.clientX, event.clientY) : undefined;
    if (taskDragState && target?.id && target.id !== taskDragState.id) {
      reorderDraftTask(taskDragState.id, target.id, target.placement);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setTaskDragState(null);
    taskDragOverRef.current = null;
  }

  return (
    <div className={`mx-auto grid w-full max-w-5xl gap-4 ${hasEditorChanges ? "pb-28" : ""}`}>
      <div className="soft-card rounded-2xl p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font800 uppercase tracking-wide text-[#ff6b76]">{copy.courseSetup}</p>
            <h3 className="mt-1 text-2xl font-black text-[#fff7f7]">{course.name}</h3>
          </div>
          <p className="text-sm font700 text-[#bfa4a7]">{editableMethods.length} {copy.methods}, {draftTasks.length} {copy.tasks}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={copy.courseName}>
            <input
              value={draftCourse.name}
              onChange={(event) => setDraftCourse((current) => ({ ...current, name: event.target.value }))}
              className={fieldClass}
            />
          </Field>
          <Field label={copy.priority}>
            <PriorityPicker value={draftCourse.priority} onChange={(priority) => setDraftCourse((current) => ({ ...current, priority }))} copy={copy} />
            <FieldHint>{copy.priorityHints[draftCourse.priority]}</FieldHint>
          </Field>
          <div>
            <DependencyButton
              copy={copy}
              courses={allCourses.filter((item) => item.id !== course.id)}
              selectedIds={getDependencyIds(course)}
              onClick={() => onOpenDependencies(getDependencyIds(course))}
            />
          </div>

          <div className="md:col-span-2 rounded-xl border border-[#ffb4bb]/10 bg-[#070506]/32 p-3">
            <div className="mb-3">
              <DeadlineControl
                value={draftCourse.targetFinishDate}
                onChange={(nextDate) => {
                  setDraftCourse((current) => ({
                    ...current,
                    targetFinishDate: nextDate,
                    examDate: current.hasExam && examUsesDeadline ? nextDate : current.examDate,
                  }));
                }}
                copy={copy}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleBox
                label={copy.exam}
                checked={draftCourse.hasExam}
                onChange={() => {
                  const nextHasExam = !draftCourse.hasExam;
                  setDraftCourse((current) => ({
                    ...current,
                    hasExam: nextHasExam,
                    examDate: nextHasExam ? current.targetFinishDate || current.examDate : undefined,
                  }));
                  if (nextHasExam) setExamUsesDeadline(true);
                }}
              />
              <ToggleBox
                label={copy.revision}
                checked={draftCourse.requiresRevision}
                onChange={() => setDraftCourse((current) => ({ ...current, requiresRevision: !current.requiresRevision }))}
              />
            </div>
            {draftCourse.hasExam ? (
              <div className="mt-3">
                <ExamDateControls
                  copy={copy}
                  hasDeadline={Boolean(draftCourse.targetFinishDate)}
                  examUsesDeadline={examUsesDeadline}
                  examDate={draftCourse.examDate ?? draftCourse.targetFinishDate}
                  onUseDeadline={() => {
                    if (!draftCourse.targetFinishDate) return;
                    setExamUsesDeadline(true);
                    setDraftCourse((current) => ({ ...current, examDate: current.targetFinishDate }));
                  }}
                  onUseCustom={() => setExamUsesDeadline(false)}
                  onExamDateChange={(date) => setDraftCourse((current) => ({ ...current, examDate: date }))}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <details className="soft-card rounded-2xl p-5">
        <summary className="cursor-pointer select-none text-lg font-black text-[#fff7f7]">
          {copy.studyMethods}
          <span className="ml-3 text-sm font700 text-[#bfa4a7]">{editableMethods.length} {copy.total}</span>
        </summary>
        <div className="mt-4">
          <StudyMethodsEditor methods={editableMethods} onChange={updateStudyMethods} compact copy={copy} />
        </div>
      </details>

      <details className="soft-card rounded-2xl p-5">
        <summary className="cursor-pointer select-none text-lg font-black text-[#fff7f7]">
          {copy.courseTasks}
          <span className="ml-3 text-sm font700 text-[#bfa4a7]">{draftTasks.length} {copy.total}</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-[#bfa4a7]">{copy.courseTasksHelp}</p>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <input
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.target.value)}
              placeholder={copy.searchCourseTasks}
              className="field-dark h-10 min-w-0 rounded-lg px-3 text-sm placeholder:text-[#8f787b] sm:w-72"
            />
          <button type="button" onClick={addCourseTask} className="ember-button rounded-lg px-3 py-2 text-sm font800">
            {copy.addTask}
          </button>
          </div>
        </div>
        <div ref={taskListRef} className="app-scroll mt-4 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
          {draftTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#070506]/45 p-4 text-sm text-[#bfa4a7]">
              {copy.noTasksYet}
            </p>
          ) : filteredDraftTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#070506]/45 p-4 text-sm text-[#bfa4a7]">
              {copy.noTaskMatches}
            </p>
          ) : (
            filteredDraftTasks.map((task) => (
              <CourseTaskRow
                key={task.id}
                task={task}
                copy={copy}
                dragging={taskDragState?.id === task.id}
                dragDisabled={Boolean(taskSearch.trim())}
                onDragStart={(event) => beginTaskDrag(event, task.id)}
                onDragMove={updateTaskDrag}
                onDragEnd={endTaskDrag}
                onChange={(patch) => updateDraftTask(task.id, patch)}
                onDelete={() => removeDraftTask(task.id)}
              />
            ))
          )}
        </div>
      </details>
      {taskDragState && draggedTask
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[80] max-w-[min(22rem,calc(100vw-2rem))] -translate-x-4 -translate-y-4 rounded-lg border border-[#ff6b76]/35 bg-[#12090b]/92 px-3 py-2 shadow-xl shadow-black/45 backdrop-blur-md"
              style={{ left: taskDragState.x, top: taskDragState.y }}
            >
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-md border border-[#ffb4bb]/12 bg-[#fff7f7]/7 text-xs font-black text-[#ffb4bb]">
                  {draggedTask.planningOrder ?? "-"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#fff7f7]">{draggedTask.title}</p>
                  <p className="text-[10px] font800 uppercase tracking-[0.16em] text-[#ffb4bb]">{copy.planningOrder}</p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {hasEditorChanges ? (
        <div className="fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-[#ffb4bb]/14 bg-[#12090b]/92 p-3 shadow-2xl shadow-black/45 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font700 text-[#bfa4a7]">{copy.unsavedCourseChanges}</p>
            <div className="flex gap-2">
              <button type="button" onClick={resetDrafts} className="ghost-button h-10 rounded-lg px-4 text-sm font800">
                {copy.discard}
              </button>
              <button type="button" onClick={saveCourseChanges} className="ember-button h-10 rounded-lg px-4 text-sm font800">
                {copy.confirmChanges}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CourseTaskRow({
  task,
  copy,
  dragging,
  dragDisabled,
  onDragStart,
  onDragMove,
  onDragEnd,
  onChange,
  onDelete,
}: {
  task: StudyTask;
  copy: CourseCopy;
  dragging: boolean;
  dragDisabled: boolean;
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onChange: (patch: Partial<StudyTask>) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-course-task-id={task.id}
      className={`rounded-xl border border-[#ffb4bb]/10 bg-[#090506]/70 p-3 transition ${
        dragging ? "scale-[0.99] border-[#ff6b76]/50 opacity-70" : ""
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#ffb4bb]/10 bg-[#fff7f7]/6 text-sm font-black text-[#ffb4bb]">
            {task.planningOrder ?? "-"}
          </div>
          <button
            type="button"
            disabled={dragDisabled}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            onLostPointerCapture={onDragEnd}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#ffb4bb]/10 bg-[#070506]/70 text-[#8f787b] transition hover:border-[#ff6b76]/35 hover:text-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={copy.planningOrder}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <circle cx="9" cy="7" r="1.4" />
              <circle cx="15" cy="7" r="1.4" />
              <circle cx="9" cy="12" r="1.4" />
              <circle cx="15" cy="12" r="1.4" />
              <circle cx="9" cy="17" r="1.4" />
              <circle cx="15" cy="17" r="1.4" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="min-w-0 text-left"
        >
          <span className="block truncate text-base font-black text-[#fff7f7]">{task.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font800 text-[#bfa4a7]">
            <span>{copy.plannedDate}: <span className="theme-fixed-date-inline">{formatDate(task.date)}</span></span>
            <span>{copy.taskTypes[task.type]}</span>
            <span>{task.estimatedHours}h</span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-[#ffb4bb]/12 bg-[#070506]/55 px-3 text-sm font700 text-[#d9c2c4]">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={(event) => onChange({ completed: event.target.checked })}
              className="accent-[#e11d2e]"
            />
            {copy.done}
          </label>
          {confirmDelete ? (
            <div className="flex gap-2">
              <button type="button" onClick={onDelete} className="ember-button h-10 rounded-lg px-3 text-xs font800">
                {copy.yes}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="ghost-button h-10 rounded-lg px-3 text-xs font700">
                {copy.no}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="ghost-button h-10 rounded-lg px-3 text-xs font800">
              {copy.remove}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#ffb4bb]/12 bg-[#070506]/55 text-sm font900 text-[#ffb4bb] transition hover:border-[#ff6b76]/45 hover:text-[#fff7f7]"
            aria-label={expanded ? "Collapse task" : "Expand task"}
          >
            {expanded ? "-" : "+"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 rounded-xl border border-[#ffb4bb]/10 bg-[#070506]/40 p-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_8rem_11rem_minmax(12rem,16rem)] lg:items-end">
            <Field label={copy.courseTasks}>
              <input
                value={task.title}
                onChange={(event) => onChange({ title: event.target.value })}
                className={fieldClass}
                aria-label="Task title"
              />
            </Field>
            <Field label={copy.hours}>
              <input
                type="number"
                min={0}
                step={halfHourStep}
                value={task.estimatedHours}
                onChange={(event) => onChange({ estimatedHours: parseLooseHoursInput(event.target.value, task.estimatedHours) })}
                className={fieldClass}
                aria-label="Task hours"
              />
            </Field>
            <Field label={copy.plannedDate}>
              <div className="theme-fixed-date grid h-10 place-items-center rounded-lg border px-3 text-center text-sm font800">
                {formatDate(task.date)}
              </div>
            </Field>
            <Field label={copy.customTaskDeadline}>
              {task.customDeadline ? (
                <div className="flex gap-2">
                  <DateTextInput
                    value={task.customDeadline}
                    onChange={(customDeadline) => onChange({ customDeadline: customDeadline || undefined })}
                    ariaLabel={copy.customTaskDeadline}
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ customDeadline: undefined })}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#ffb4bb]/12 bg-[#070506]/55 text-sm font900 text-[#bfa4a7] transition hover:border-[#ff6b76]/45 hover:text-[#fff7f7]"
                    aria-label="Clear task deadline"
                  >
                    x
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => onChange({ customDeadline: task.date })} className="ghost-button h-10 w-full rounded-lg px-3 text-xs font800">
                  + {copy.addCustomDeadline}
                </button>
              )}
            </Field>
          </div>
          <InlineTaskTypePicker value={task.type} onChange={(type) => onChange({ type })} copy={copy} />
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`block min-w-0 text-sm font700 text-[#d9c2c4] ${className ?? ""}`}>
      <div>{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-2 min-h-5 truncate text-xs font600 text-[#bfa4a7]">{children}</p>;
}

function DependencyButton({
  copy,
  courses,
  selectedIds,
  onClick,
}: {
  copy: CourseCopy;
  courses: Course[];
  selectedIds: string[];
  onClick: () => void;
}) {
  const selectedNames = courses
    .filter((course) => selectedIds.includes(course.id))
    .map((course) => course.name);

  return (
    <div className="min-w-0">
      <p className="text-sm font700 text-[#d9c2c4]">{copy.dependencies}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-1 flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-[#ffb4bb]/12 bg-[#070506]/55 px-3 text-left text-sm font800 text-[#fff7f7] transition hover:border-[#ff6b76]/45 hover:bg-[#e11d2e]/12"
      >
        <span className="min-w-0 truncate">{selectedIds.length === 0 ? copy.addDependencies : `${selectedIds.length} ${copy.dependencies.toLowerCase()}`}</span>
        <span aria-hidden="true" className="text-lg leading-none text-[#ff6b76]">+</span>
      </button>
      <FieldHint>
        {selectedNames.length === 0 ? copy.noDependenciesSelected : selectedNames.join(", ")}
      </FieldHint>
    </div>
  );
}

function DependencyWorkspace({
  copy,
  courses,
  selectedIds,
  onChange,
  onConfirm,
  onCancel,
}: {
  copy: CourseCopy;
  courses: Course[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const filteredCourses = courses.filter((course) => course.name.toLowerCase().includes(query.trim().toLowerCase()));

  function toggleCourse(courseId: string) {
    onChange(selectedIds.includes(courseId)
      ? selectedIds.filter((id) => id !== courseId)
      : [...selectedIds, courseId]);
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font800 uppercase tracking-wide text-[#ff6b76]">{copy.dependencies}</p>
          <h3 className="mt-1 text-3xl font-black text-[#fff7f7]">{copy.selectDependencies}</h3>
          <p className="mt-2 max-w-2xl text-sm text-[#bfa4a7]">
            {copy.dependencyHelp}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="ghost-button rounded-xl px-4 py-3 text-sm font800">
          {copy.back}
        </button>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={copy.searchCourses}
        className="field-dark h-12 w-full rounded-xl px-4 text-sm placeholder:text-[#8f787b]"
      />

      <div className="soft-card flex-1 rounded-3xl p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`min-h-28 rounded-2xl border p-4 text-left transition ${
              selectedIds.length === 0
                ? "border-[#e11d2e]/60 bg-[#e11d2e]/22 shadow-lg shadow-red-950/25"
                : "border-[#ffb4bb]/12 bg-[#070506]/55 hover:-translate-y-0.5 hover:border-[#ff6b76]/40"
            }`}
          >
            <span className="block text-lg font-black text-[#fff7f7]">{copy.noDependencies}</span>
            <span className="mt-2 block text-sm text-[#bfa4a7]">{copy.noDependenciesHelp}</span>
          </button>

          {filteredCourses.map((course) => {
            const selected = selectedIds.includes(course.id);
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => toggleCourse(course.id)}
                className={`min-h-28 rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[#e11d2e]/60 bg-[#e11d2e]/22 shadow-lg shadow-red-950/25"
                    : "border-[#ffb4bb]/12 bg-[#070506]/55 hover:-translate-y-0.5 hover:border-[#ff6b76]/40"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-lg font-black text-[#fff7f7]">{course.name}</span>
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-md border text-xs font-black ${
                      selected ? "border-[#ff6b76] bg-[#e11d2e] text-white" : "border-[#ffb4bb]/24 text-[#8f787b]"
                    }`}
                  >
                    {selected ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    ) : null}
                  </span>
                </span>
                <span className="mt-2 block text-sm text-[#bfa4a7]">
                  {course.totalLectures} {copy.lectures} - {course.targetFinishDate ? `${copy.finishByLower} ${course.targetFinishDate}` : copy.noDeadline}
                </span>
              </button>
            );
          })}
        </div>

        {filteredCourses.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#070506]/45 p-4 text-sm text-[#bfa4a7]">
            {copy.noCourseMatches}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-[#ffb4bb]/12 bg-[#12090b]/92 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font700 text-[#d9c2c4]">
            {selectedIds.length === 0 ? copy.noDependenciesSelected : `${selectedIds.length} ${copy.selected}`}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onCancel} className="ghost-button rounded-xl px-4 py-3 text-sm font800">
              {copy.cancel}
            </button>
            <button type="button" onClick={onConfirm} className="ember-button rounded-xl px-5 py-3 text-sm font-black">
              {copy.confirmDependencies}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font700 transition ${
        checked ? "border-[#e11d2e]/40 bg-[#e11d2e]/13 text-[#fff7f7]" : "border-[#ffb4bb]/14 bg-[#070506]/55 text-[#d9c2c4]"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-[#e11d2e]" />
      {label}
    </label>
  );
}

function getDependencyIds(course: Course) {
  return course.dependsOnIds?.length ? course.dependsOnIds : course.dependsOnId ? [course.dependsOnId] : [];
}

function createMethodId(name: string, index: number) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `method-${index + 1}`;
}
