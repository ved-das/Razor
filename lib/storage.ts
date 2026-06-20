import { seedData } from "./seedData";
import { lectureNumbersFromTitle } from "./schedule";
import type { BoardNote, Course, PlannerSettings, StudyMethod, StudyState, StudyTask, TaskType, UserProfile } from "./types";

const STORAGE_KEY = "razor:v1";

export function loadStudyState(): StudyState {
  if (typeof window === "undefined") return cloneStudyState(seedData);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeStudyState(JSON.parse(stored)) : cloneStudyState(seedData);
  } catch {
    return cloneStudyState(seedData);
  }
}

export function saveStudyState(state: StudyState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStudyState(state)));
  } catch {
    // Persistence can be unavailable in restricted previews; the app should still remain interactive.
  }
}

export function resetStudyState() {
  const blankState = createBlankStudyState();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blankState));
  }

  return blankState;
}

export function createBlankStudyState(): StudyState {
  return {
    courses: [],
    tasks: [],
    boardNotes: [],
    settings: {
      autoPlan: false,
      autoPlanIntervalHours: 24,
      maxDailyHours: 8,
      startDate: "2026-06-14",
      planEndDate: undefined,
      holidays: [],
      customStudyHours: [],
      restrictedDays: [],
      defaultTaskHours: 1,
      warningThresholdHours: 8,
      showCompletedTasks: true,
      weekStartsOn: "monday",
      reminderTime: "00:00",
      lateNightPromptEnabled: true,
      lateNightPromptAfterHour: 23,
      lateNightMaxExtensionHour: 6,
      language: "en",
      theme: "razor",
    },
    profile: { name: "Ved", birthday: "", institution: "" },
  };
}

function normalizeStudyState(value: unknown): StudyState {
  if (!isRecord(value)) return cloneStudyState(seedData);

  const courses = Array.isArray(value.courses)
    ? dedupeById(value.courses.map(normalizeCourse).filter((course): course is Course => Boolean(course)))
    : cloneStudyState(seedData).courses;
  const courseIds = new Set(courses.map((course) => course.id));
  const tasks = Array.isArray(value.tasks)
    ? dedupeById(value.tasks.map((task) => normalizeTask(task, courseIds)).filter((task): task is StudyTask => Boolean(task)))
    : cloneStudyState(seedData).tasks;
  const settings = normalizeSettings(value.settings);
  const profile = normalizeProfile(value.profile);
  const boardNotes = Array.isArray(value.boardNotes)
    ? dedupeById(value.boardNotes.map(normalizeBoardNote).filter((note): note is BoardNote => Boolean(note)))
    : cloneStudyState(seedData).boardNotes ?? [];

  return {
    courses: recomputeCourseLectureProgress(courses, tasks),
    tasks: tasks.sort((a, b) => a.date.localeCompare(b.date)),
    boardNotes,
    settings,
    profile,
  };
}

function normalizeCourse(value: unknown): Course | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;

  const seedCourse = seedData.courses.find((course) => course.id === value.id);
  const totalLectures = positiveNumber(value.totalLectures, 0);
  const baselineCompletedLectures = Math.min(
    positiveNumber(
      value.baselineCompletedLectures,
      seedCourse?.baselineCompletedLectures ?? positiveNumber(value.completedLectures, 0),
    ),
    totalLectures,
  );
  const completedLectures = Math.min(positiveNumber(value.completedLectures, baselineCompletedLectures), totalLectures);
  const hasExam = Boolean(value.hasExam);
  const examDate = optionalIsoDate(value.examDate);

  return {
    id: value.id,
    name: value.name,
    examDate: hasExam ? examDate : undefined,
    totalLectures,
    baselineCompletedLectures,
    completedLectures,
    hoursPerLecture: positiveNumber(value.hoursPerLecture, 2),
    targetFinishDate: optionalIsoDate(value.targetFinishDate),
    priority: value.priority === "high" || value.priority === "medium" || value.priority === "low" ? value.priority : "medium",
    planningOrder: typeof value.planningOrder === "number" && Number.isFinite(value.planningOrder) ? value.planningOrder : undefined,
    hasExam,
    requiresRevision: Boolean(value.requiresRevision),
    dependsOnId: typeof value.dependsOnId === "string" && value.dependsOnId ? value.dependsOnId : undefined,
    dependsOnIds: Array.isArray(value.dependsOnIds)
      ? Array.from(new Set(value.dependsOnIds.filter((id): id is string => typeof id === "string" && id !== value.id)))
      : undefined,
    studyMethods: normalizeStudyMethods(value.studyMethods, {
      totalLectures,
      baselineCompletedLectures,
      hoursPerLecture: positiveNumber(value.hoursPerLecture, 2),
    }),
  };
}

function normalizeStudyMethods(
  value: unknown,
  fallback: { totalLectures: number; baselineCompletedLectures: number; hoursPerLecture: number },
): StudyMethod[] {
  if (!Array.isArray(value)) {
    return [
      {
        id: "lectures",
        name: "Lecture",
        totalItems: fallback.totalLectures,
        completedItems: fallback.baselineCompletedLectures,
        hoursPerItem: fallback.hoursPerLecture,
        taskType: "lecture",
      },
    ];
  }

  return dedupeById(value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const taskType = isTaskType(item.taskType) ? item.taskType : "summary";
      return {
        id: typeof item.id === "string" && item.id ? item.id : `method-${index + 1}`,
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : `Method ${index + 1}`,
        totalItems: positiveNumber(item.totalItems, 0),
        completedItems: positiveNumber(item.completedItems, 0),
        hoursPerItem: positiveNumber(item.hoursPerItem, 1),
        taskType,
      };
    })
    .filter((item): item is StudyMethod => Boolean(item)));
}

function normalizeTask(value: unknown, courseIds: Set<string>): StudyTask | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string" || typeof value.date !== "string") {
    return null;
  }
  if (!isIsoDate(value.date)) return null;

  const courseId = typeof value.courseId === "string" && courseIds.has(value.courseId) ? value.courseId : undefined;
  const type = ["lecture", "coding", "revision", "mock", "recap", "summary", "exam", "rest"].includes(String(value.type))
    ? (value.type as StudyTask["type"])
    : "lecture";

  return {
    id: value.id,
    date: value.date,
    deadline: optionalIsoDate(value.deadline),
    customDeadline: optionalIsoDate(value.customDeadline),
    title: value.title,
    subject: typeof value.subject === "string" ? value.subject : "General",
    courseId,
    type,
    phase: typeof value.phase === "string" ? value.phase : "Plan",
    estimatedHours: positiveNumber(value.estimatedHours, 0),
    completed: Boolean(value.completed),
    autoGenerated: Boolean(value.autoGenerated) || undefined,
    studyMethodId: typeof value.studyMethodId === "string" ? value.studyMethodId : undefined,
    studyMethodItem: positiveNumber(value.studyMethodItem, 0) || undefined,
    planningOrder: typeof value.planningOrder === "number" && Number.isFinite(value.planningOrder) ? value.planningOrder : undefined,
  };
}

function normalizeBoardNote(value: unknown): BoardNote | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const column = value.column === "todo" || value.column === "inProgress" || value.column === "done"
    ? value.column
    : "todo";

  return {
    id: value.id,
    title: typeof value.title === "string" ? value.title : "Untitled note",
    body: typeof value.body === "string" ? value.body : "",
    column,
    linkedCourseId: typeof value.linkedCourseId === "string" ? value.linkedCourseId : undefined,
    linkedTaskId: typeof value.linkedTaskId === "string" ? value.linkedTaskId : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeSettings(value: unknown): PlannerSettings {
  if (!isRecord(value)) {
    return cloneStudyState(seedData).settings ?? {
      autoPlan: false,
      autoPlanIntervalHours: 24,
      maxDailyHours: 8,
      startDate: "2026-06-14",
      defaultTaskHours: 1,
      warningThresholdHours: 8,
      showCompletedTasks: true,
      weekStartsOn: "monday",
      reminderTime: "00:00",
      lateNightPromptEnabled: true,
      lateNightPromptAfterHour: 23,
      lateNightMaxExtensionHour: 6,
      language: "en",
      theme: "razor",
    };
  }

  return {
    autoPlan: Boolean(value.autoPlan),
    autoPlanIntervalHours: Math.min(Math.max(positiveNumber(value.autoPlanIntervalHours, 24), 1), 24),
    maxDailyHours: Math.min(Math.max(positiveNumber(value.maxDailyHours, 8), 1), 24),
    startDate: optionalIsoDate(value.startDate) ?? "2026-06-14",
    planEndDate: optionalIsoDate(value.planEndDate),
    holidays: Array.isArray(value.holidays) ? Array.from(new Set(value.holidays.filter((date): date is string => typeof date === "string" && isIsoDate(date)))) : [],
    customStudyHours: normalizeCustomStudyHours(value.customStudyHours, value.restrictedDays),
    restrictedDays: normalizeCustomStudyHours(value.customStudyHours, value.restrictedDays)
      .map((item) => ({ date: item.date, maxHours: item.hours })),
    defaultTaskHours: Math.min(Math.max(positiveNumber(value.defaultTaskHours, 1), 0.25), 12),
    warningThresholdHours: Math.min(Math.max(positiveNumber(value.warningThresholdHours, 8), 1), 24),
    showCompletedTasks: typeof value.showCompletedTasks === "boolean" ? value.showCompletedTasks : true,
    weekStartsOn: value.weekStartsOn === "sunday" ? "sunday" : "monday",
    reminderTime: typeof value.reminderTime === "string" ? value.reminderTime : "00:00",
    lateNightPromptEnabled: typeof value.lateNightPromptEnabled === "boolean" ? value.lateNightPromptEnabled : true,
    lateNightPromptAfterHour: Math.min(Math.max(positiveNumber(value.lateNightPromptAfterHour, 23), 18), 23),
    lateNightMaxExtensionHour: Math.min(Math.max(positiveNumber(value.lateNightMaxExtensionHour, 6), 1), 6),
    studyDayOverride: normalizeStudyDayOverride(value.studyDayOverride),
    language: value.language === "de" || value.language === "pl" || value.language === "it" ? value.language : "en",
    theme: value.theme === "biaBee" || value.theme === "tofu" ? value.theme : "razor",
    lastAutoPlanDate: optionalIsoDate(value.lastAutoPlanDate),
    lastAutoPlanAt: typeof value.lastAutoPlanAt === "string" ? value.lastAutoPlanAt : undefined,
  };
}

function normalizeStudyDayOverride(value: unknown): PlannerSettings["studyDayOverride"] {
  if (!isRecord(value)) return undefined;
  const studyDate = optionalIsoDate(value.studyDate);
  if (!studyDate || typeof value.expiresAt !== "string" || Number.isNaN(new Date(value.expiresAt).getTime())) return undefined;
  return { studyDate, expiresAt: value.expiresAt };
}

function normalizeProfile(value: unknown): UserProfile {
  if (!isRecord(value)) return { name: "Ved", birthday: "", institution: "" };

  return {
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Ved",
    birthday: typeof value.birthday === "string" ? value.birthday : "",
    institution: typeof value.institution === "string" ? value.institution : "",
  };
}

function normalizeCustomStudyHours(value: unknown, legacyValue: unknown): Array<{ date: string; hours: number }> {
  const source = Array.isArray(value) ? value : legacyValue;
  if (!Array.isArray(source)) return [];

  const byDate = new Map<string, number>();
  for (const item of source) {
    if (!isRecord(item)) continue;
    const date = optionalIsoDate(item.date);
    if (!date) continue;
    const rawHours = "hours" in item ? item.hours : item.maxHours;
    const hours = Math.min(Math.max(positiveNumber(rawHours, 0), 0), 24);
    byDate.set(date, hours);
  }

  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, hours]) => ({ date, hours }));
}

function cloneStudyState(state: StudyState): StudyState {
  return {
    courses: state.courses.map((course) => ({ ...course })),
    tasks: state.tasks.map((task) => ({ ...task })),
    boardNotes: state.boardNotes?.map((note) => ({ ...note })) ?? [],
    settings: state.settings ? { ...state.settings } : undefined,
    profile: state.profile ? { ...state.profile } : { name: "Ved", birthday: "", institution: "" },
  };
}

function positiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function optionalIsoDate(value: unknown) {
  return typeof value === "string" && isIsoDate(value) ? value : undefined;
}

function isIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskType(value: unknown): value is TaskType {
  return ["lecture", "coding", "revision", "mock", "recap", "summary", "exam", "rest"].includes(String(value));
}

function recomputeCourseLectureProgress(courses: Course[], tasks: StudyTask[]) {
  return courses.map((course) => {
    const completedNumbers = new Set<number>();
    const baseline = Math.min(course.baselineCompletedLectures ?? course.completedLectures, course.totalLectures);
    const completedByMethod = new Map<string, Set<number>>();

    for (const method of course.studyMethods ?? []) {
      const completedItems = new Set<number>();
      for (let item = 1; item <= Math.min(method.completedItems, method.totalItems); item += 1) {
        completedItems.add(item);
      }
      completedByMethod.set(method.id, completedItems);
    }

    for (let lecture = 1; lecture <= baseline; lecture += 1) {
      completedNumbers.add(lecture);
    }

    for (const task of tasks) {
      if (task.courseId !== course.id || !task.completed) continue;
      if (task.studyMethodId && task.studyMethodItem) {
        const completedItems = completedByMethod.get(task.studyMethodId) ?? new Set<number>();
        completedItems.add(task.studyMethodItem);
        const titleItem = task.title.match(/(\d+)\s*$/)?.[1];
        if (titleItem) completedItems.add(Number(titleItem));
        completedByMethod.set(task.studyMethodId, completedItems);
      }
      if (task.type !== "lecture") continue;
      const lectures = task.lectureNumbers?.length ? task.lectureNumbers : lectureNumbersFromTitle(task.title);
      for (const lecture of lectures) {
        if (lecture >= 1 && lecture <= course.totalLectures) {
          completedNumbers.add(lecture);
        }
      }
    }

    return {
      ...course,
      studyMethods: course.studyMethods?.map((method) => ({
        ...method,
        completedItems: Math.min(completedByMethod.get(method.id)?.size ?? method.completedItems, method.totalItems),
      })),
      completedLectures: course.studyMethods?.length
        ? course.studyMethods.reduce((total, method) => total + Math.min(completedByMethod.get(method.id)?.size ?? method.completedItems, method.totalItems), 0)
        : completedNumbers.size,
    };
  });
}
