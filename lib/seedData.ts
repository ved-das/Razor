import type { StudyState } from "./types";

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const seedData: StudyState = {
  courses: [],
  tasks: [],
  boardNotes: [],
  settings: {
    autoPlan: false,
    autoPlanIntervalHours: 24,
    maxDailyHours: 8,
    startDate: localToday(),
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
  profile: { name: "", birthday: "", institution: "" },
};
