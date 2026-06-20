"use client";

import Image from "next/image";
import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarScheduler } from "@/components/CalendarScheduler";
import { CoursesManager } from "@/components/CoursesManager";
import { ProgressBar } from "@/components/ProgressBar";
import { TaskList } from "@/components/TaskList";
import { TodayPlan } from "@/components/TodayPlan";
import {
  autoPlanSchedule,
  plannerCapacityWarning,
} from "@/lib/autoScheduler";
import {
  calculateCourseProgress,
  addDays,
  formatDate,
  getRiskLevel,
  lectureNumbersForTask,
  projectedCourseFinishDate,
  roundToOne,
  sumHours,
  todayKey,
} from "@/lib/schedule";
import { loadStudyState, resetStudyState, saveStudyState } from "@/lib/storage";
import type { BoardColumn, BoardNote, Course, PlannerSettings, StudyState, StudyTask, TaskType, UserProfile } from "@/lib/types";

type PageKey = "overview" | "planner" | "courses" | "calendar" | "tasks" | "board" | "settings";

const navItems: Array<{ key: PageKey; label: string; description: string }> = [
  { key: "overview", label: "Cockpit", description: "Today and progress" },
  { key: "planner", label: "Planner", description: "Generate study plans" },
  { key: "courses", label: "Courses", description: "Course management" },
  { key: "calendar", label: "Calendar", description: "Monthly workload" },
  { key: "tasks", label: "Tasks", description: "Task ledger" },
  { key: "board", label: "Board", description: "Sticky notes" },
  { key: "settings", label: "Settings", description: "App settings" },
];

const navIcons: Record<PageKey, string> = {
  overview: "M12 5v5M7 7.5a7 7 0 0 0-2.5 5.2c0 3.1 2.4 5.8 5.5 6.3v-5l-4.5 1.6M17 7.5a7 7 0 0 1 2.5 5.2c0 3.1-2.4 5.8-5.5 6.3v-5l4.5 1.6M8 11h8",
  planner: "M4 6h10M4 12h16M4 18h10M17 4v4M15 6h4M11 16v4M9 18h4",
  courses: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3-3V4Zm3 4h7M8 12h6",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14v15H5V5Zm4 7h2M13 12h2M9 16h2M13 16h2",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  board: "M4 5h7v7H4V5Zm9 0h7v7h-7V5ZM4 14h7v5H4v-5Zm9 0h7v5h-7v-5Z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-12v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3",
};

const localeText: Record<PlannerSettings["language"], {
  nav: Record<PageKey, string>;
  descriptions: Record<PageKey, string>;
  app: {
    cockpitSprint: string;
    workload: string;
    activeCourses: string;
    dailyLimitAttention: string;
    dailyProgress: string;
    doneOfPlanned: (done: number, planned: number) => string;
    left: string;
    planned: string;
    completed: string;
    remaining: string;
    portfolio: string;
    studyLoad: string;
    lectureCompletion: string;
    upcomingWork: string;
    tasks: string;
    activities: string;
    taskTypeLabels: Record<TaskType, string>;
    noUpcomingWork: string;
    done: string;
    week: string;
    settingsProfile: string;
    personalDetails: string;
    name: string;
    birthday: string;
    institution: string;
    automation: string;
    automaticReplanning: string;
    automaticReplanningHelp: string;
    autoPlanInterval: string;
    autoPlanIntervalHelp: string;
    showCompletedTasks: string;
    showCompletedTasksHelp: string;
    plannerDefaults: string;
    dailyStudyCap: string;
    defaultTaskHours: string;
    heavyDayWarning: string;
    preferredStudyTime: string;
    reminderHelp: string;
    lateNightStudy: string;
    lateNightStudyHelp: string;
    lateNightPrompt: string;
    lateNightPromptAfter: string;
    lateNightMaxExtension: string;
    lateNightTitle: string;
    lateNightBody: (hours: number, date: string) => string;
    extendTo: (time: string) => string;
    notTonight: string;
    calendar: string;
    weekStartsMonday: string;
    weekStartsMondayHelp: string;
    weekStartsSunday: string;
    weekStartsSundayHelp: string;
    language: string;
    displayLanguage: string;
    languageHelp: string;
    appearance: string;
    theme: string;
    themeHelp: string;
    data: string;
    resetRazor: string;
    resetHelp: string;
    resetSchedule: string;
    resetQuestion: string;
    resetWarning: string;
    yesReset: string;
    cancel: string;
    unsavedSettings: string;
    discard: string;
    confirmChanges: string;
    plannerEngine: string;
    generateStudyPlan: string;
    plannerIntro: string;
    autoPlanOn: string;
    autoPlanOff: string;
    generatePlan: string;
    dailyCap: string;
    startDate: string;
    rangeEndOptional: string;
    holidays: string;
    customHours: string;
    dates: string;
    days: string;
    useSuggestedCap: (hours: number) => string;
    holidaysTitle: string;
    customHoursTitle: string;
    holidaysHelp: string;
    customHoursHelp: string;
    close: string;
    add: string;
    coursePriorityList: string;
    dragCoursesPlanningOrder: string;
    plannerOrderHelp: string;
    suggestedTarget: string;
    targetLabel: string;
    priorityLabels: Record<Course["priority"], string>;
    addCoursesFirst: string;
    finishes: string;
    noScheduledFinishYet: string;
    birthdayTitle: (captain: string) => string;
    birthdayBody: string;
  };
}> = {
  en: {
    nav: {
      overview: "Cockpit",
      planner: "Planner",
      courses: "Courses",
      calendar: "Calendar",
      tasks: "Tasks",
      board: "Board",
      settings: "Settings",
    },
    descriptions: {
      overview: "Today and progress",
      planner: "Generate study plans",
      courses: "Course management",
      calendar: "Monthly workload",
      tasks: "Task ledger",
      board: "Sticky notes",
      settings: "App settings",
    },
    app: {
      cockpitSprint: "June exam sprint",
      workload: "workload",
      activeCourses: "active courses",
      dailyLimitAttention: "Daily limit needs attention",
      dailyProgress: "Daily progress",
      doneOfPlanned: (done, planned) => `${done}h done of ${planned}h planned`,
      left: "left",
      planned: "Planned",
      completed: "Completed",
      remaining: "Remaining",
      portfolio: "Portfolio",
      studyLoad: "Study load",
      lectureCompletion: "Lecture completion",
      upcomingWork: "Upcoming work",
      tasks: "tasks",
      activities: "activities",
      taskTypeLabels: { lecture: "lecture", coding: "practice", revision: "revision", mock: "mock", recap: "assignment", summary: "study", exam: "exam", rest: "rest" },
      noUpcomingWork: "No upcoming work.",
      done: "Done",
      week: "Week",
      settingsProfile: "Profile",
      personalDetails: "Personal details",
      name: "Name",
      birthday: "Birthday",
      institution: "Institution",
      automation: "Automation",
      automaticReplanning: "Automatic replanning",
      automaticReplanningHelp: "Regenerate unfinished work when progress changes.",
      autoPlanInterval: "Auto-plan interval (Hours)",
      autoPlanIntervalHelp: "How often Razor may regenerate the plan, from 1 to 24 hours.",
      showCompletedTasks: "Show completed tasks",
      showCompletedTasksHelp: "Keep finished work visible in planning views.",
      plannerDefaults: "Planner defaults",
      dailyStudyCap: "Daily study cap",
      defaultTaskHours: "Default task hours",
      heavyDayWarning: "Heavy day warning",
      preferredStudyTime: "Preferred study time",
      reminderHelp: "Saved for future schedule timing. It is not an OS notification yet.",
      lateNightStudy: "Late-night study",
      lateNightStudyHelp: "Ask to extend the current study day when unfinished work is still open late at night.",
      lateNightPrompt: "Late-night prompt",
      lateNightPromptAfter: "Prompt after",
      lateNightMaxExtension: "Latest extension",
      lateNightTitle: "Late night study sesh?",
      lateNightBody: (hours, date) => `${hours}h of work is still open for ${date}. Extend the current study day so Razor does not reshuffle it yet.`,
      extendTo: (time) => `Extend to ${time}`,
      notTonight: "Not tonight",
      calendar: "Calendar",
      weekStartsMonday: "Week starts Monday",
      weekStartsMondayHelp: "Best for university timetables.",
      weekStartsSunday: "Week starts Sunday",
      weekStartsSundayHelp: "Useful if your week resets earlier.",
      language: "Language",
      displayLanguage: "Display language",
      languageHelp: "This saves the language preference. Full interfacè translations can be expanded from this menu.",
      appearance: "Appearance",
      theme: "Theme",
      themeHelp: "Choose the visual palette for Razor.",
      data: "Data",
      resetRazor: "Reset Razor",
      resetHelp: "Clear all courses, tasks, notes, profile details, and planner changes on this device.",
      resetSchedule: "Full reset",
      resetQuestion: "Reset Razor to a blank fresh state?",
      resetWarning: "This removes your courses, tasks, board notes, profile details, and saved planner settings from this device.",
      yesReset: "Yes, reset",
      cancel: "Cancel",
      unsavedSettings: "You have unsaved settings changes.",
      discard: "Discard",
      confirmChanges: "Confirm changes",
      plannerEngine: "Planner engine",
      generateStudyPlan: "Generate a study plan",
      plannerIntro: "Set the daily cap, range, holidays, and custom study hours before building the plan.",
      autoPlanOn: "Auto-plan on",
      autoPlanOff: "Auto-plan off",
      generatePlan: "Generate plan",
      dailyCap: "Daily cap",
      startDate: "Start date",
      rangeEndOptional: "Range end (Optional)",
      holidays: "Holidays",
      customHours: "Custom hours",
      dates: "dates",
      days: "days",
      useSuggestedCap: (hours) => `Use ${hours}h/day`,
      holidaysTitle: "Holidays",
      customHoursTitle: "Custom study hours",
      holidaysHelp: "No work will be scheduled on these dates.",
      customHoursHelp: "Override the daily cap on specific dates. Use 0h for a no-study day.",
      close: "Close",
      add: "Add",
      coursePriorityList: "Course priority list",
      dragCoursesPlanningOrder: "Drag courses into planning order",
      plannerOrderHelp: "Drag a row. Confirm below to save.",
      suggestedTarget: "Suggested target",
      targetLabel: "Target",
      priorityLabels: { high: "High", medium: "Medium", low: "Low" },
      addCoursesFirst: "Add courses first, then arrange them here.",
      finishes: "Finishes",
      noScheduledFinishYet: "No scheduled finish yet",
      birthdayTitle: (captain) => `Happy birthday, ${captain}.`,
      birthdayBody: "The cabin lights are up for you today. Razor has the flight plan ready when you are.",
    },
  },
  de: {
    nav: {
      overview: "Cockpit",
      planner: "Planer",
      courses: "Kurse",
      calendar: "Kalender",
      tasks: "Aufgaben",
      board: "Board",
      settings: "Einstellungen",
    },
    descriptions: {
      overview: "Heute und Fortschritt",
      planner: "Lernpläne erstellen",
      courses: "Kursverwaltung",
      calendar: "Monatslast",
      tasks: "Aufgabenliste",
      board: "Notizen",
      settings: "App-Einstellungen",
    },
    app: {
      cockpitSprint: "Prüfungs-Sprint im Juni",
      workload: "Arbeitslast",
      activeCourses: "aktive Kurse",
      dailyLimitAttention: "Tageslimit braucht Aufmerksamkeit",
      dailyProgress: "Tagesfortschritt",
      doneOfPlanned: (done, planned) => `${done}h erledigt von ${planned}h geplant`,
      left: "offen",
      planned: "Geplant",
      completed: "Erledigt",
      remaining: "Offen",
      portfolio: "Portfolio",
      studyLoad: "Lernlast",
      lectureCompletion: "Kursfortschritt",
      upcomingWork: "Anstehende Arbeit",
      tasks: "Aufgaben",
      activities: "Aktivitäten",
      taskTypeLabels: { lecture: "Vorlesung", coding: "Übung", revision: "Wiederholung", mock: "Probe", recap: "Aufgabe", summary: "Lernen", exam: "Prüfung", rest: "Pause" },
      noUpcomingWork: "Keine anstehende Arbeit.",
      done: "Erledigt",
      week: "Woche",
      settingsProfile: "Profil",
      personalDetails: "Persönliche Daten",
      name: "Name",
      birthday: "Geburtstag",
      institution: "Institution",
      automation: "Automatisierung",
      automaticReplanning: "Automatische Neuplanung",
      automaticReplanningHelp: "Offene Arbeit neu planen, wenn sich der Fortschritt ändert.",
      autoPlanInterval: "Auto-Plan-Intervall (Stunden)",
      autoPlanIntervalHelp: "Wie oft Razor den Plan neu erstellen darf, von 1 bis 24 Stunden.",
      showCompletedTasks: "Erledigte Aufgaben anzeigen",
      showCompletedTasksHelp: "Fertige Arbeit in Planungsansichten sichtbar halten.",
      plannerDefaults: "Planungsstandards",
      dailyStudyCap: "Tägliches Lernlimit",
      defaultTaskHours: "Standardstunden pro Aufgabe",
      heavyDayWarning: "Warnung für schwere Tage",
      preferredStudyTime: "Bevorzugte Lernzeit",
      reminderHelp: "Gespeichert für zukünftige Zeitplanung. Noch keine OS-Benachrichtigung.",
      lateNightStudy: "Spätes Lernen",
      lateNightStudyHelp: "Fragt, ob der aktuelle Lerntag verlängert werden soll, wenn spät noch Aufgaben offen sind.",
      lateNightPrompt: "Spätlern-Hinweis",
      lateNightPromptAfter: "Hinweis nach",
      lateNightMaxExtension: "Späteste Verlängerung",
      lateNightTitle: "Späte Lerneinheit?",
      lateNightBody: (hours, date) => `${hours}h Arbeit sind für ${date} noch offen. Verlängere den aktuellen Lerntag, damit Razor noch nichts neu verteilt.`,
      extendTo: (time) => `Bis ${time} verlängern`,
      notTonight: "Heute nicht",
      calendar: "Kalender",
      weekStartsMonday: "Woche startet Montag",
      weekStartsMondayHelp: "Am besten für Uni-Stundenpläne.",
      weekStartsSunday: "Woche startet Sonntag",
      weekStartsSundayHelp: "Nützlich, wenn deine Woche früher beginnt.",
      language: "Sprache",
      displayLanguage: "Anzeigesprache",
      languageHelp: "Speichert die Sprachpräferenz. Weitere Übersetzungen können hier erweitert werden.",
      appearance: "Darstellung",
      theme: "Theme",
      themeHelp: "Wähle die Farbpalette für Razor.",
      data: "Daten",
      resetRazor: "Razor zurücksetzen",
      resetHelp: "Alle Kurse, Aufgaben, Notizen, Profildaten und Planungsänderungen auf diesem Gerät löschen.",
      resetSchedule: "Vollständig zurücksetzen",
      resetQuestion: "Razor auf einen leeren neuen Zustand zurücksetzen?",
      resetWarning: "Dies entfernt deine Kurse, Aufgaben, Board-Notizen, Profildaten und gespeicherten Planungseinstellungen von diesem Gerät.",
      yesReset: "Ja, zurücksetzen",
      cancel: "Abbrechen",
      unsavedSettings: "Du hast ungespeicherte Einstellungen.",
      discard: "Verwerfen",
      confirmChanges: "Änderungen bestätigen",
      plannerEngine: "Planungsmodul",
      generateStudyPlan: "Lernplan erstellen",
      plannerIntro: "Lege Tageslimit, Zeitraum, freie Tage und eigene Lernstunden fest, bevor der Plan erstellt wird.",
      autoPlanOn: "Auto-Plan an",
      autoPlanOff: "Auto-Plan aus",
      generatePlan: "Plan erstellen",
      dailyCap: "Tageslimit",
      startDate: "Startdatum",
      rangeEndOptional: "Enddatum (Optional)",
      holidays: "Freie Tage",
      customHours: "Eigene Stunden",
      dates: "Daten",
      days: "Tage",
      useSuggestedCap: (hours) => `${hours}h/Tag nutzen`,
      holidaysTitle: "Freie Tage",
      customHoursTitle: "Eigene Lernstunden",
      holidaysHelp: "An diesen Tagen wird keine Arbeit eingeplant.",
      customHoursHelp: "Überschreibe das Tageslimit für einzelne Daten. Nutze 0h für einen lernfreien Tag.",
      close: "Schließen",
      add: "Hinzufügen",
      coursePriorityList: "Kursprioritäten",
      dragCoursesPlanningOrder: "Kurse in Planungsreihenfolge ziehen",
      plannerOrderHelp: "Ziehe eine Zeile. Bestätige unten, um zu speichern.",
      suggestedTarget: "Vorgeschlagenes Ziel",
      targetLabel: "Ziel",
      priorityLabels: { high: "Hoch", medium: "Mittel", low: "Niedrig" },
      addCoursesFirst: "Füge zuerst Kurse hinzu und ordne sie dann hier an.",
      finishes: "Fertig am",
      noScheduledFinishYet: "Noch kein geplantes Fertigdatum",
      birthdayTitle: (captain) => `Alles Gute zum Geburtstag, ${captain}.`,
      birthdayBody: "Die Kabinenlichter sind heute für dich an. Razor hält den Flugplan bereit, sobald du startklar bist.",
    },
  },
  pl: {
    nav: {
      overview: "Kokpit",
      planner: "Planer",
      courses: "Kursy",
      calendar: "Kalendarz",
      tasks: "Zadania",
      board: "Tablica",
      settings: "Ustawienia",
    },
    descriptions: {
      overview: "Dzisiaj i postęp",
      planner: "Generowanie planów",
      courses: "Zarządzanie kursami",
      calendar: "Obciążenie miesięczne",
      tasks: "Lista zadań",
      board: "Notatki",
      settings: "Ustawienia aplikacji",
    },
    app: {
      cockpitSprint: "Czerwcowy sprint egzaminacyjny",
      workload: "obciazenie",
      activeCourses: "aktywne kursy",
      dailyLimitAttention: "Limit dzienny wymaga uwagi",
      dailyProgress: "Postep dnia",
      doneOfPlanned: (done, planned) => `${done}h zrobione z ${planned}h planu`,
      left: "pozostało",
      planned: "Plan",
      completed: "Ukończone",
      remaining: "Pozostało",
      portfolio: "Portfolio",
      studyLoad: "Obciążenie nauką",
      lectureCompletion: "Postep kursów",
      upcomingWork: "Nadchodzaca praca",
      tasks: "zadania",
      activities: "aktywnosci",
      taskTypeLabels: { lecture: "wykład", coding: "praktyka", revision: "powtórka", mock: "próbny", recap: "zadanie", summary: "nauka", exam: "egzamin", rest: "odpoczynek" },
      noUpcomingWork: "Brak nadchodzacej pracy.",
      done: "Gotowe",
      week: "Tydzień",
      settingsProfile: "Profil",
      personalDetails: "Dane osobiste",
      name: "Imie",
      birthday: "Urodziny",
      institution: "Instytucja",
      automation: "Automatyzacja",
      automaticReplanning: "Automatyczne przeplanowanie",
      automaticReplanningHelp: "Przebuduj niedokończoną pracę po zmianie postępu.",
      autoPlanInterval: "Interwał auto-planu (godziny)",
      autoPlanIntervalHelp: "Jak często Razor może odświeżać plan, od 1 do 24 godzin.",
      showCompletedTasks: "Pokaż ukończone zadania",
      showCompletedTasksHelp: "Zostaw ukonczona prace widoczna w planowaniu.",
      plannerDefaults: "Domyslne planowanie",
      dailyStudyCap: "Dzienny limit nauki",
      defaultTaskHours: "Domyślne godziny zadania",
      heavyDayWarning: "Ostrzeżenie o ciężkim dniu",
      preferredStudyTime: "Preferowana godzina nauki",
      reminderHelp: "Zapisane do przyszlego planowania czasu. To jeszcze nie jest powiadomienie systemowe.",
      lateNightStudy: "Nocna nauka",
      lateNightStudyHelp: "Pyta o przedłużenie bieżącego dnia nauki, gdy późno nadal zostały zadania.",
      lateNightPrompt: "Powiadomienie nocne",
      lateNightPromptAfter: "Pytaj po",
      lateNightMaxExtension: "Najpóźniejsze przedłużenie",
      lateNightTitle: "Nocna sesja nauki?",
      lateNightBody: (hours, date) => `${hours}h pracy nadal zostało na ${date}. Przedłuż bieżący dzień nauki, aby Razor jeszcze go nie przebudował.`,
      extendTo: (time) => `Przedłuż do ${time}`,
      notTonight: "Nie dzisiaj",
      calendar: "Kalendarz",
      weekStartsMonday: "Tydzień zaczyna się w poniedziałek",
      weekStartsMondayHelp: "Najlepsze dla planów uniwersyteckich.",
      weekStartsSunday: "Tydzień zaczyna się w niedzielę",
      weekStartsSundayHelp: "Przydatne, gdy tydzień resetuje się wcześniej.",
      language: "Język",
      displayLanguage: "Język wyświetlania",
      languageHelp: "Zapisuje preferencje języka. Ten wybór można później rozszerzyć o kolejne tłumaczenia.",
      appearance: "Wygląd",
      theme: "Motyw",
      themeHelp: "Wybierz paletę kolorów Razor.",
      data: "Dane",
      resetRazor: "Zresetuj Razor",
      resetHelp: "Wyczyść wszystkie kursy, zadania, notatki, profil i ustawienia planowania na tym urządzeniu.",
      resetSchedule: "Pełny reset",
      resetQuestion: "Zresetować Razor do pustego nowego stanu?",
      resetWarning: "To usunie kursy, zadania, notatki, dane profilu i zapisane ustawienia planowania z tego urządzenia.",
      yesReset: "Tak, zresetuj",
      cancel: "Anuluj",
      unsavedSettings: "Masz niezapisane ustawienia.",
      discard: "Odrzuć",
      confirmChanges: "Potwierdź zmiany",
      plannerEngine: "Silnik planowania",
      generateStudyPlan: "Wygeneruj plan nauki",
      plannerIntro: "Ustaw limit dzienny, zakres, dni wolne i własne godziny nauki przed utworzeniem planu.",
      autoPlanOn: "Auto-plan włączony",
      autoPlanOff: "Auto-plan wylaczony",
      generatePlan: "Wygeneruj plan",
      dailyCap: "Limit dzienny",
      startDate: "Data startu",
      rangeEndOptional: "Koniec zakresu (Optional)",
      holidays: "Dni wolne",
      customHours: "Własne godziny",
      dates: "daty",
      days: "dni",
      useSuggestedCap: (hours) => `Użyj ${hours}h/dzień`,
      holidaysTitle: "Dni wolne",
      customHoursTitle: "Własne godziny nauki",
      holidaysHelp: "W tych dniach praca nie bedzie planowana.",
      customHoursHelp: "Nadpisz limit dzienny dla konkretnych dat. Ustaw 0h, aby zrobić dzień bez nauki.",
      close: "Zamknij",
      add: "Dodaj",
      coursePriorityList: "Priorytety kursów",
      dragCoursesPlanningOrder: "Przeciagnij kursy w kolejnosci planowania",
      plannerOrderHelp: "Przeciągnij wiersz. Potwierdź na dole, aby zapisać.",
      suggestedTarget: "Sugerowany termin",
      targetLabel: "Cel",
      priorityLabels: { high: "Wysoki", medium: "Średni", low: "Niski" },
      addCoursesFirst: "Najpierw dodaj kursy, potem ustaw je tutaj w kolejnosci.",
      finishes: "Koniec",
      noScheduledFinishYet: "Brak zaplanowanego końca",
      birthdayTitle: (captain) => `Wszystkiego najlepszego, ${captain}.`,
      birthdayBody: "Światła w kabinie są dziś dla Ciebie. Razor ma plan lotu gotowy, gdy tylko będziesz startować.",
    },
  },
  it: {
    nav: {
      overview: "Cockpit",
      planner: "Pianificatore",
      courses: "Corsi",
      calendar: "Calendario",
      tasks: "Attività",
      board: "Bacheca",
      settings: "Impostazioni",
    },
    descriptions: {
      overview: "Oggi e progresso",
      planner: "Genera piani di studio",
      courses: "Gestione corsi",
      calendar: "Carico mensile",
      tasks: "Registro attività",
      board: "Note adesive",
      settings: "Impostazioni app",
    },
    app: {
      cockpitSprint: "Sprint esami di giugno",
      workload: "carico",
      activeCourses: "corsi attivi",
      dailyLimitAttention: "Il limite giornaliero richiede attenzione",
      dailyProgress: "Progresso giornaliero",
      doneOfPlanned: (done, planned) => `${done}h completate su ${planned}h pianificate`,
      left: "rimaste",
      planned: "Pianificate",
      completed: "Completate",
      remaining: "Rimaste",
      portfolio: "Portfolio",
      studyLoad: "Carico di studio",
      lectureCompletion: "Completamento corsi",
      upcomingWork: "Prossime attività",
      tasks: "attività",
      activities: "attività",
      taskTypeLabels: { lecture: "lezione", coding: "pratica", revision: "ripasso", mock: "simulazione", recap: "compito", summary: "studio", exam: "esame", rest: "riposo" },
      noUpcomingWork: "Nessuna attività in arrivo.",
      done: "Fatto",
      week: "Settimana",
      settingsProfile: "Profilo",
      personalDetails: "Dati personali",
      name: "Nome",
      birthday: "Compleanno",
      institution: "Istituzione",
      automation: "Automazione",
      automaticReplanning: "Ripianificazione automatica",
      automaticReplanningHelp: "Rigenera il lavoro non completato quando cambia il progresso.",
      autoPlanInterval: "Intervallo auto-plan (ore)",
      autoPlanIntervalHelp: "Ogni quante ore Razor può rigenerare il piano, da 1 a 24.",
      showCompletedTasks: "Mostra attività completate",
      showCompletedTasksHelp: "Mantieni visibile il lavoro concluso nelle viste di pianificazione.",
      plannerDefaults: "Valori predefiniti",
      dailyStudyCap: "Limite giornaliero di studio",
      defaultTaskHours: "Ore predefinite per attività",
      heavyDayWarning: "Avviso giornata intensa",
      preferredStudyTime: "Orario di studio preferito",
      reminderHelp: "Salvato per la pianificazione futura. Non è ancora una notifica di sistema.",
      lateNightStudy: "Studio notturno",
      lateNightStudyHelp: "Chiede se estendere il giorno di studio quando resta lavoro aperto a tarda notte.",
      lateNightPrompt: "Avviso notturno",
      lateNightPromptAfter: "Avvisa dopo",
      lateNightMaxExtension: "Ultima estensione",
      lateNightTitle: "Sessione di studio notturna?",
      lateNightBody: (hours, date) => `${hours}h di lavoro sono ancora aperte per ${date}. Estendi il giorno di studio così Razor non lo riorganizza ancora.`,
      extendTo: (time) => `Estendi fino alle ${time}`,
      notTonight: "Non stanotte",
      calendar: "Calendario",
      weekStartsMonday: "La settimana inizia lunedì",
      weekStartsMondayHelp: "Ideale per orari universitari.",
      weekStartsSunday: "La settimana inizia domenica",
      weekStartsSundayHelp: "Utile se la tua settimana si resetta prima.",
      language: "Lingua",
      displayLanguage: "Lingua dell'interfaccia",
      languageHelp: "Salva la lingua scelta per l'interfaccia.",
      appearance: "Aspetto",
      theme: "Tema",
      themeHelp: "Scegli la palette visiva di Razor.",
      data: "Dati",
      resetRazor: "Reimposta Razor",
      resetHelp: "Cancella corsi, attività, note, profilo e modifiche di pianificazione su questo dispositivo.",
      resetSchedule: "Reset completo",
      resetQuestion: "Reimpostare Razor a uno stato vuoto?",
      resetWarning: "Rimuove corsi, attività, note, dati profilo e impostazioni salvate da questo dispositivo.",
      yesReset: "Sì, reimposta",
      cancel: "Annulla",
      unsavedSettings: "Hai modifiche non salvate.",
      discard: "Scarta",
      confirmChanges: "Conferma modifiche",
      plannerEngine: "Motore di pianificazione",
      generateStudyPlan: "Genera un piano di studio",
      plannerIntro: "Imposta limite giornaliero, intervallo, vacanze e ore di studio personalizzate prima di creare il piano.",
      autoPlanOn: "Auto-plan attivo",
      autoPlanOff: "Auto-plan spento",
      generatePlan: "Genera piano",
      dailyCap: "Limite giornaliero",
      startDate: "Data inizio",
      rangeEndOptional: "Fine intervallo (Optional)",
      holidays: "Vacanze",
      customHours: "Ore personali",
      dates: "date",
      days: "giorni",
      useSuggestedCap: (hours) => `Usa ${hours}h/giorno`,
      holidaysTitle: "Vacanze",
      customHoursTitle: "Ore di studio personalizzate",
      holidaysHelp: "In queste date non verrà pianificato lavoro.",
      customHoursHelp: "Sostituisci il limite giornaliero in date specifiche. Usa 0h per un giorno senza studio.",
      close: "Chiudi",
      add: "Aggiungi",
      coursePriorityList: "Lista priorità corsi",
      dragCoursesPlanningOrder: "Trascina i corsi nell'ordine di pianificazione",
      plannerOrderHelp: "Trascina una riga. Conferma in basso per salvare.",
      suggestedTarget: "Obiettivo suggerito",
      targetLabel: "Obiettivo",
      priorityLabels: { high: "Alta", medium: "Media", low: "Bassa" },
      addCoursesFirst: "Aggiungi prima i corsi, poi ordinali qui.",
      finishes: "Finisce",
      noScheduledFinishYet: "Nessuna fine pianificata",
      birthdayTitle: (captain) => `Buon compleanno, ${captain}.`,
      birthdayBody: "Le luci della cabina oggi sono per te. Razor tiene pronto il piano di volo quando vuoi partire.",
    },
  },
};

function normalizedSettings(settings?: Partial<PlannerSettings>): PlannerSettings {
  const rawOverride = settings?.studyDayOverride;
  const studyDayOverride =
    rawOverride && rawOverride.studyDate && rawOverride.expiresAt && Number.isFinite(new Date(rawOverride.expiresAt).getTime())
      ? rawOverride
      : undefined;

  return {
    autoPlan: settings?.autoPlan ?? false,
    autoPlanIntervalHours: Math.min(Math.max(settings?.autoPlanIntervalHours ?? 24, 1), 24),
    maxDailyHours: settings?.maxDailyHours ?? 8,
    startDate: settings?.startDate ?? "2026-06-14",
    planEndDate: settings?.planEndDate,
    holidays: settings?.holidays ?? [],
    customStudyHours: settings?.customStudyHours ?? (settings?.restrictedDays ?? []).map((day) => ({ date: day.date, hours: day.maxHours })),
    restrictedDays: settings?.restrictedDays ?? [],
    defaultTaskHours: settings?.defaultTaskHours ?? 1,
    warningThresholdHours: settings?.warningThresholdHours ?? 8,
    showCompletedTasks: settings?.showCompletedTasks ?? true,
    weekStartsOn: settings?.weekStartsOn ?? "monday",
    reminderTime: settings?.reminderTime ?? "00:00",
    lateNightPromptEnabled: settings?.lateNightPromptEnabled ?? true,
    lateNightPromptAfterHour: Math.min(Math.max(settings?.lateNightPromptAfterHour ?? 23, 18), 23),
    lateNightMaxExtensionHour: Math.min(Math.max(settings?.lateNightMaxExtensionHour ?? 6, 1), 6),
    studyDayOverride,
    language: settings?.language ?? "en",
    theme: settings?.theme ?? "razor",
    lastAutoPlanDate: settings?.lastAutoPlanDate,
    lastAutoPlanAt: settings?.lastAutoPlanAt,
  };
}

function plannerOptions(settings: PlannerSettings, today: string, now: Date, maxDailyHours = settings.maxDailyHours) {
  return {
    today,
    now,
    maxDailyHours,
    endDate: settings.planEndDate,
    holidays: settings.holidays,
    customStudyHours: settings.customStudyHours,
    restrictedDays: settings.restrictedDays,
  };
}

function activeStudyDate(now: Date, settings: PlannerSettings) {
  const override = settings.studyDayOverride;
  if (!override) return todayKey(now);
  const expiresAt = new Date(override.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return todayKey(now);
  return override.studyDate;
}

function pageFromHash(): PageKey {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace("#", "");
  return navItems.some((item) => item.key === hash) ? (hash as PageKey) : "overview";
}

export default function Home() {
  const [activePage, setActivePage] = useState<PageKey>(() => pageFromHash());
  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<StudyState>(() => rolloverStudyState(loadStudyState(), new Date()));
  const settings = normalizedSettings(state.settings);
  const today = activeStudyDate(now, settings);
  const profile = state.profile ?? { name: "Ved", birthday: "", institution: "" };
  const [dismissedLateNightKey, setDismissedLateNightKey] = useState<string | null>(null);

  useEffect(() => {
    saveStudyState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextNow = new Date();
      setNow(nextNow);
      setState((current) => rolloverStudyState(current, nextNow));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function syncPageFromHash() {
      setActivePage(pageFromHash());
    }

    syncPageFromHash();
    window.addEventListener("hashchange", syncPageFromHash);
    return () => window.removeEventListener("hashchange", syncPageFromHash);
  }, []);

  const todayTasks = useMemo(
    () => state.tasks.filter((task) => task.date === today),
    [state.tasks, today],
  );
  const upcomingTasks = useMemo(
    () =>
      state.tasks
        .filter((task) => !task.completed && task.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 60),
    [state.tasks, today],
  );
  const missedTaskCount = useMemo(
    () => state.tasks.filter((task) => !task.completed && task.date < today).length,
    [state.tasks, today],
  );
  const courses = useMemo(() => calculateCourseProgress(state, today), [state, today]);
  const totalRemainingCourseHours = roundToOne(courses.reduce((total, course) => total + course.remainingHours, 0));
  const overallProgress =
    courses.length === 0
      ? 0
      : Math.round(courses.reduce((total, course) => total + course.progressPercent, 0) / courses.length);
  const totalTodayHours = roundToOne(sumHours(todayTasks));
  const completedTodayHours = roundToOne(sumHours(todayTasks.filter((task) => task.completed)));
  const remainingTodayHours = roundToOne(totalTodayHours - completedTodayHours);
  const riskLevel = getRiskLevel(totalTodayHours);
  const capacityWarning = useMemo(
    () => plannerCapacityWarning(state, plannerOptions(settings, today, now)),
    [state, today, now, settings],
  );

  function toggleTask(taskId: string) {
    setState((current) => {
      const selectedTask = current.tasks.find((task) => task.id === taskId);
      if (!selectedTask) return current;

      const nextCompleted = !selectedTask.completed;
      const nextTasks = current.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: nextCompleted } : task,
      );

      const nextState = {
        ...current,
        courses: recomputeCourseLectureProgress(current.courses, nextTasks),
        tasks: nextTasks,
      };

      return nextState;
    });
  }

  function addCourse(course: Course) {
    setState((current) => {
      const nextState = { ...current, courses: [...current.courses, course] };
      return nextState.settings?.autoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now))
        : nextState;
    });
  }

  function updateCourse(courseId: string, patch: Partial<Course>) {
    setState((current) => {
      const existing = current.courses.find((course) => course.id === courseId);
      if (!existing) return current;

      const nextCourses = current.courses.map((course) => {
        if (course.id !== courseId) return course;
        const totalLectures = patch.totalLectures ?? course.totalLectures;
        const completedLectures = Math.min(patch.completedLectures ?? course.completedLectures, totalLectures);
        const hasExam = patch.hasExam ?? course.hasExam;

        return {
          ...course,
          ...patch,
          totalLectures,
          completedLectures,
          baselineCompletedLectures: Math.min(
            patch.baselineCompletedLectures ?? course.baselineCompletedLectures ?? completedLectures,
            totalLectures,
          ),
          examDate: hasExam ? patch.examDate ?? course.examDate ?? patch.targetFinishDate ?? course.targetFinishDate : undefined,
        };
      });

      const nextTasks = current.tasks.map((task) => {
        if (task.courseId !== courseId) return task;
        const nextSubject = patch.name ?? existing.name;
        return {
          ...task,
          subject: nextSubject,
          title:
            patch.name && task.title.startsWith(existing.name)
              ? task.title.replace(existing.name, patch.name)
              : task.title,
          estimatedHours:
            task.type === "lecture" && patch.hoursPerLecture !== undefined ? patch.hoursPerLecture : task.estimatedHours,
        };
      });

      const nextState = {
        ...current,
        courses: recomputeCourseLectureProgress(nextCourses, nextTasks),
        tasks: nextTasks,
      };
      return nextState.settings?.autoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now))
        : nextState;
    });
  }

  function deleteCourse(courseId: string) {
    setState((current) => {
      const nextState = {
        ...current,
        courses: current.courses
        .filter((course) => course.id !== courseId)
        .map((course) =>
          course.dependsOnId === courseId || course.dependsOnIds?.includes(courseId)
            ? {
                ...course,
                dependsOnId: course.dependsOnId === courseId ? undefined : course.dependsOnId,
                dependsOnIds: course.dependsOnIds?.filter((id) => id !== courseId),
              }
            : course,
        ),
        tasks: current.tasks.filter((task) => task.courseId !== courseId),
      };
      return nextState.settings?.autoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now))
        : nextState;
    });
  }

  function addTask(task: StudyTask) {
    setState((current) => {
      const nextTasks = [...current.tasks, task].sort((a, b) => a.date.localeCompare(b.date));
      const nextState = {
        ...current,
        courses: recomputeCourseLectureProgress(current.courses, nextTasks),
        tasks: nextTasks,
      };
      return nextState.settings?.autoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now))
        : nextState;
    });
  }

  function updateTask(taskId: string, patch: Partial<StudyTask>) {
    setState((current) => {
      const nextTasks = current.tasks.map((task) => (task.id === taskId ? applyTaskPatch(task, patch) : task));
      const nextState = {
        ...current,
        courses: recomputeCourseLectureProgress(current.courses, nextTasks),
        tasks: nextTasks,
      };
      return nextState.settings?.autoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now))
        : nextState;
    });
  }

  function deleteTask(taskId: string) {
    setState((current) => {
      const nextTasks = current.tasks.filter((task) => task.id !== taskId);
      const nextState = {
        ...current,
        courses: recomputeCourseLectureProgress(current.courses, nextTasks),
        tasks: nextTasks,
      };
      return nextState.settings?.autoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now))
        : nextState;
    });
  }

  function addBoardNote(note: Omit<BoardNote, "createdAt">) {
    setState((current) => ({
      ...current,
      boardNotes: [
        ...(current.boardNotes ?? []),
        {
          ...note,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function updateBoardNote(noteId: string, patch: Partial<BoardNote>) {
    setState((current) => ({
      ...current,
      boardNotes: (current.boardNotes ?? []).map((note) => (note.id === noteId ? applyBoardNotePatch(note, patch) : note)),
    }));
  }

  function deleteBoardNote(noteId: string) {
    setState((current) => ({
      ...current,
      boardNotes: (current.boardNotes ?? []).filter((note) => note.id !== noteId),
    }));
  }

  function generatePlan() {
    setState((current) =>
      autoPlanSchedule(
        {
          ...current,
          settings: {
            ...normalizedSettings(current.settings),
            autoPlan: true,
            maxDailyHours: settings.maxDailyHours,
            startDate: settings.startDate,
            planEndDate: settings.planEndDate,
            holidays: settings.holidays,
            customStudyHours: settings.customStudyHours,
            restrictedDays: settings.restrictedDays,
            lastAutoPlanDate: today,
            lastAutoPlanAt: now.toISOString(),
          },
        },
        plannerOptions(settings, today, now),
      ),
    );
    navigateToPage("calendar");
  }

  function toggleAutoPlan() {
    setState((current) => {
      const nextAutoPlan = !(current.settings?.autoPlan ?? false);
      const nextState = {
        ...current,
        settings: {
          ...normalizedSettings(current.settings),
          autoPlan: nextAutoPlan,
        },
      };
      return nextAutoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now))
        : nextState;
    });
  }

  function changeMaxDailyHours(hours: number) {
    const safeHours = Math.min(Math.max(hours || 0.5, 0.1), 24);
    setState((current) => {
      const nextState = {
        ...current,
        settings: {
          ...normalizedSettings(current.settings),
          autoPlan: current.settings?.autoPlan ?? false,
          maxDailyHours: safeHours,
        },
      };
      return nextState.settings.autoPlan
        ? autoPlanSchedule(nextState, plannerOptions(nextState.settings, today, now, safeHours))
        : nextState;
    });
  }

  function updateProfile(patch: Partial<UserProfile>) {
    setState((current) => ({
      ...current,
      profile: {
        name: current.profile?.name ?? "Ved",
        birthday: current.profile?.birthday ?? "",
        institution: current.profile?.institution ?? "",
        ...patch,
      },
    }));
  }

  function updateSettings(patch: Partial<PlannerSettings>) {
    setState((current) => ({
      ...current,
      settings: {
        ...normalizedSettings(current.settings),
        ...patch,
      },
    }));
  }

  function handleReset() {
    setState(resetStudyState());
    navigateToPage("overview");
  }

  function navigateToPage(page: PageKey) {
    setActivePage(page);
    if (typeof window === "undefined") return;
    const nextHash = `#${page}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  const locale = localeText[settings.language] ?? localeText.en;
  const copy = locale.app;
  const lateNightContext = useMemo(
    () => getLateNightPromptContext(state.tasks, settings, now),
    [state.tasks, settings, now],
  );
  const pageTitle = locale.nav[activePage] ?? navItems.find((item) => item.key === activePage)?.label ?? "Overview";
  const pageDescription = locale.descriptions[activePage] ?? navItems.find((item) => item.key === activePage)?.description ?? "";

  return (
    <main className="app-shell min-h-screen text-[#fff7f7]" data-theme={settings.theme}>
      <div className="ambient-aura" />
      <div className="relative min-h-screen">
        <header className="sticky top-0 z-20 border-b border-[#ffb4bb]/10 bg-[#090506]/82 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(150px,0.65fr)_minmax(0,2.8fr)_minmax(108px,0.65fr)] xl:items-center">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0">
                  <Image
                    src="/razor-icon-transparent.png"
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="relative h-11 w-44 overflow-hidden sm:w-56" aria-label="Razor">
                  <Image
                    src="/razor-text-transparent.png"
                    alt="Razor"
                    fill
                    sizes="176px"
                    className="object-contain object-left [filter:invert(1)_hue-rotate(180deg)_saturate(1.35)]"
                    priority
                  />
                </div>
              </div>

              <nav className="grid w-full min-w-0 grid-cols-4 gap-1 rounded-2xl border border-[#ffb4bb]/10 bg-[#070506]/54 p-1 sm:grid-cols-7">
                {navItems.map((item) => (
                  <TopNavItem
                    key={item.key}
                    item={{
                      ...item,
                      label: locale.nav[item.key],
                      description: locale.descriptions[item.key],
                    }}
                    active={activePage === item.key}
                    onNavigate={() => navigateToPage(item.key)}
                  />
                ))}
              </nav>

              <ClockBadge now={now} language={settings.language} />
            </div>

            <div className="flex flex-col gap-1 border-t border-[#ffb4bb]/8 pt-3">
              <div>
                <p className="text-sm font-medium text-[#bfa4a7]">{pageDescription}</p>
                <h2 className="text-3xl font-black text-[#fff7f7]">{pageTitle}</h2>
              </div>
            </div>
          </div>
        </header>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="relative mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
            {activePage === "overview" ? (
              <OverviewPage
                today={today}
                todayTasks={todayTasks}
                upcomingTasks={upcomingTasks}
                totalRemainingCourseHours={totalRemainingCourseHours}
                overallProgress={overallProgress}
                totalTodayHours={totalTodayHours}
                completedTodayHours={completedTodayHours}
                remainingTodayHours={remainingTodayHours}
                riskLevel={riskLevel}
                courses={courses}
                profile={profile}
                copy={copy}
                capacityWarning={capacityWarning}
                missedTaskCount={missedTaskCount}
                onToggleTask={toggleTask}
                language={settings.language}
              />
            ) : null}

            {activePage === "calendar" ? (
              <CalendarScheduler tasks={state.tasks} today={today} onToggleTask={toggleTask} language={settings.language} />
            ) : null}

            {activePage === "planner" ? (
              <PlannerPage
                settings={settings}
                courses={state.courses}
                today={today}
                capacityWarning={capacityWarning}
                copy={copy}
                language={settings.language}
                onSettingsChange={updateSettings}
                onUpdateCourse={updateCourse}
                onGeneratePlan={generatePlan}
                onToggleAutoPlan={toggleAutoPlan}
                onMaxDailyHoursChange={changeMaxDailyHours}
              />
            ) : null}

            {activePage === "courses" ? (
              <CoursesManager
                courses={courses}
                baseCourses={state.courses}
                tasks={state.tasks}
                onAddCourse={addCourse}
                onUpdateCourse={updateCourse}
                onDeleteCourse={deleteCourse}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                language={settings.language}
              />
            ) : null}

            {activePage === "tasks" ? (
              <section className="soft-card rounded-2xl p-5">
                <TaskList tasks={state.tasks} today={today} onToggleTask={toggleTask} grouped language={settings.language} />
              </section>
            ) : null}

            {activePage === "board" ? (
              <BoardPage
                notes={state.boardNotes ?? []}
                courses={state.courses}
                tasks={state.tasks}
                language={settings.language}
                onAddNote={addBoardNote}
                onUpdateNote={updateBoardNote}
                onDeleteNote={deleteBoardNote}
              />
            ) : null}

            {activePage === "settings" ? (
              <SettingsPage
                key={`${settings.language}-${settings.theme}-${settings.maxDailyHours}-${settings.defaultTaskHours}-${settings.warningThresholdHours}-${settings.reminderTime}-${settings.weekStartsOn}-${settings.autoPlan}-${settings.autoPlanIntervalHours}-${settings.showCompletedTasks}-${settings.lateNightPromptEnabled}-${settings.lateNightPromptAfterHour}-${settings.lateNightMaxExtensionHour}-${profile.name}-${profile.birthday}-${profile.institution}`}
                settings={settings}
                profile={profile}
                onSettingsChange={updateSettings}
                onProfileChange={updateProfile}
                onReset={handleReset}
                copy={copy}
              />
            ) : null}
          </div>
        </section>
        {lateNightContext && dismissedLateNightKey !== lateNightContext.key ? (
          <LateNightStudyPrompt
            context={lateNightContext}
            copy={copy}
            onDismiss={() => setDismissedLateNightKey(lateNightContext.key)}
            onExtend={(expiresAt) => {
              updateSettings({ studyDayOverride: { studyDate: lateNightContext.studyDate, expiresAt } });
              setDismissedLateNightKey(lateNightContext.key);
            }}
          />
        ) : null}
      </div>
    </main>
  );
}

function rolloverStudyState(state: StudyState, now: Date) {
  const settings = normalizedSettings(state.settings);
  const today = activeStudyDate(now, settings);
  const planningDay = today;
  const overrideExpiresAt = settings.studyDayOverride ? new Date(settings.studyDayOverride.expiresAt).getTime() : 0;
  const cleanSettings =
    settings.studyDayOverride && (!Number.isFinite(overrideExpiresAt) || overrideExpiresAt <= now.getTime())
      ? { ...settings, studyDayOverride: undefined }
      : settings;

  if (cleanSettings.lastAutoPlanDate === planningDay) {
    return cleanSettings === settings ? state : { ...state, settings: cleanSettings };
  }

  if (!cleanSettings.autoPlan) {
    return {
      ...state,
      settings: { ...cleanSettings, lastAutoPlanDate: planningDay, lastAutoPlanAt: now.toISOString() },
    };
  }

  if (!cleanSettings.lastAutoPlanDate || !cleanSettings.lastAutoPlanAt) {
    return {
      ...state,
      settings: { ...cleanSettings, lastAutoPlanDate: planningDay, lastAutoPlanAt: now.toISOString() },
    };
  }

  const lastRunAt = new Date(cleanSettings.lastAutoPlanAt).getTime();
  const intervalMs = cleanSettings.autoPlanIntervalHours * 60 * 60 * 1000;
  const intervalDue = Number.isFinite(lastRunAt) && now.getTime() - lastRunAt >= intervalMs;

  if (cleanSettings.lastAutoPlanDate < planningDay || intervalDue) {
    return autoPlanSchedule(
      {
        ...state,
        settings: { ...cleanSettings, lastAutoPlanDate: planningDay, lastAutoPlanAt: now.toISOString() },
      },
      plannerOptions(cleanSettings, today, now),
    );
  }

  return state;
}

function recomputeCourseLectureProgress(courses: Course[], tasks: StudyState["tasks"]) {
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
      for (const lecture of lectureNumbersForTask(task)) {
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

function displayDateInput(value?: string) {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1].slice(-2)}` : value;
}

function applyTaskPatch(task: StudyTask, patch: Partial<StudyTask>) {
  const next: StudyTask = { ...task, ...patch };
  for (const key of Object.keys(patch) as Array<keyof StudyTask>) {
    if (patch[key] === undefined) {
      delete next[key];
    }
  }
  return next;
}

function applyBoardNotePatch(note: BoardNote, patch: Partial<BoardNote>) {
  const next: BoardNote = { ...note, ...patch };
  for (const key of Object.keys(patch) as Array<keyof BoardNote>) {
    if (patch[key] === undefined) {
      delete next[key];
    }
  }
  return next;
}

function uniqueId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

type DateInputParts = { day: string; month: string; year: string };

function datePartsFromKey(value?: string): DateInputParts {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? { day: match[3], month: match[2], year: match[1].slice(-2) } : { day: "", month: "", year: "" };
}

function DateDraftInput({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const displayParts = datePartsFromKey(value);
  const [draftState, setDraftState] = useState({ source: value ?? "", parts: displayParts, touched: false });
  const [error, setError] = useState("");
  const parts = draftState.source === (value ?? "") ? draftState.parts : displayParts;
  const partOrder: Array<keyof DateInputParts> = ["day", "month", "year"];
  const refs = {
    day: useRef<HTMLInputElement>(null),
    month: useRef<HTMLInputElement>(null),
    year: useRef<HTMLInputElement>(null),
  };

  function updatePart(part: keyof DateInputParts, rawValue: string) {
    setError("");
    const nextValue = rawValue.replace(/\D/g, "").slice(0, 2);
    const nextParts = { ...parts, [part]: nextValue };
    setDraftState({ source: value ?? "", parts: nextParts, touched: true });
    commitParts(nextParts, false);
    if (nextValue.length === 2) {
      const nextPart = partOrder[partOrder.indexOf(part) + 1];
      if (nextPart) refs[nextPart].current?.focus();
    }
  }

  function commitParts(nextParts: DateInputParts, showPartialError: boolean) {
    const empty = !nextParts.day && !nextParts.month && !nextParts.year;
    if (empty) {
      setError("");
      onChange(undefined);
      return;
    }

    const complete = Boolean(nextParts.day.length === 2 && nextParts.month.length === 2 && nextParts.year.length === 2);
    if (!complete) {
      if (showPartialError) setError("Fill day, month, and year.");
      return;
    }

    const parsed = `20${nextParts.year}-${nextParts.month}-${nextParts.day}`;
    if (isValidDateKey(parsed)) {
      setError("");
      onChange(parsed);
      setDraftState({ source: parsed, parts: datePartsFromKey(parsed), touched: false });
      return;
    }
    setError("Use a real date, for example 02.07.26.");
  }

  function updateDigit(part: keyof DateInputParts, event: ReactKeyboardEvent<HTMLInputElement>) {
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

  function onDateKeyDown(part: keyof DateInputParts, event: ReactKeyboardEvent<HTMLInputElement>) {
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
    <div>
      <div className={`date-field grid grid-cols-[1fr_auto_1fr_auto_1.5fr_auto] items-center gap-1 px-3 text-sm font800 ${
        error ? "border-[#ff6b76]/70 bg-[#2a080d]/72" : ""
      }`}>
        <input
          value={parts.day}
          onChange={(event) => updatePart("day", event.target.value)}
          onKeyDown={(event) => onDateKeyDown("day", event)}
          onBlur={() => commitParts(parts, draftState.touched)}
          placeholder="dd"
          ref={refs.day}
          inputMode="numeric"
          aria-label="Day"
          className="min-w-0 bg-transparent text-center font800 tabular-nums outline-none placeholder:text-[#8f787b]"
        />
        <span className="text-[#8f787b]">.</span>
        <input
          value={parts.month}
          onChange={(event) => updatePart("month", event.target.value)}
          onKeyDown={(event) => onDateKeyDown("month", event)}
          onBlur={() => commitParts(parts, draftState.touched)}
          placeholder="mm"
          ref={refs.month}
          inputMode="numeric"
          aria-label="Month"
          className="min-w-0 bg-transparent text-center font800 tabular-nums outline-none placeholder:text-[#8f787b]"
        />
        <span className="text-[#8f787b]">.</span>
        <input
          value={parts.year}
          onChange={(event) => updatePart("year", event.target.value)}
          onKeyDown={(event) => onDateKeyDown("year", event)}
          onBlur={() => commitParts(parts, draftState.touched)}
          placeholder="yy"
          ref={refs.year}
          inputMode="numeric"
          aria-label="Year"
          className="min-w-0 bg-transparent text-center font800 tabular-nums outline-none placeholder:text-[#8f787b]"
        />
        {parts.day || parts.month || parts.year ? (
          <button
            type="button"
            onClick={() => {
              setDraftState({ source: "", parts: { day: "", month: "", year: "" }, touched: false });
              setError("");
              onChange(undefined);
            }}
            aria-label="Clear date"
            className="ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs text-[#8f787b] transition hover:bg-[#e11d2e]/16 hover:text-white"
          >
            x
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs font700 text-[#ff9aa2]">{error}</p> : null}
    </div>
  );
}

function PlannerPage({
  settings,
  courses,
  today,
  capacityWarning,
  copy,
  language,
  onSettingsChange,
  onUpdateCourse,
  onGeneratePlan,
  onToggleAutoPlan,
  onMaxDailyHoursChange,
}: {
  settings: PlannerSettings;
  courses: Course[];
  today: string;
  capacityWarning: ReturnType<typeof plannerCapacityWarning>;
  copy: typeof localeText.en.app;
  language: PlannerSettings["language"];
  onSettingsChange: (patch: Partial<PlannerSettings>) => void;
  onUpdateCourse: (courseId: string, patch: Partial<Course>) => void;
  onGeneratePlan: () => void;
  onToggleAutoPlan: () => void;
  onMaxDailyHoursChange: (hours: number) => void;
}) {
  const [holidayDraft, setHolidayDraft] = useState("");
  const [customHoursDate, setCustomHoursDate] = useState("");
  const [customHoursValue, setCustomHoursValue] = useState("2");
  const [plannerModal, setPlannerModal] = useState<"holidays" | "customHours" | null>(null);
  const holidays = settings.holidays ?? [];
  const customStudyHours = settings.customStudyHours ?? (settings.restrictedDays ?? []).map((day) => ({ date: day.date, hours: day.maxHours }));
  const orderedCourses = useMemo(
    () => [...courses].sort((a, b) => (a.planningOrder ?? 9999) - (b.planningOrder ?? 9999) || a.name.localeCompare(b.name)),
    [courses],
  );
  const targetSuggestions = useMemo(
    () => suggestCourseTargets(courses, settings, today),
    [courses, settings, today],
  );

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <div className="soft-card rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <div>
            <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.plannerEngine}</p>
            <h3 className="mt-1 text-3xl font-black text-[#fff7f7]">{copy.generateStudyPlan}</h3>
            <p className="mt-2 text-sm text-[#bfa4a7]">{copy.plannerIntro}</p>
          </div>
          <button type="button" onClick={onToggleAutoPlan} className={settings.autoPlan ? "ember-button min-h-12 rounded-xl px-5 text-sm font800" : "ghost-button min-h-12 rounded-xl px-5 text-sm font800"}>
            {settings.autoPlan ? copy.autoPlanOn : copy.autoPlanOff}
          </button>
          <button type="button" onClick={onGeneratePlan} className="ember-button min-h-12 rounded-xl px-5 text-sm font800">
            {copy.generatePlan}
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_0.8fr_0.9fr]">
          <PlannerField label={copy.dailyCap}>
            <NumberStepper key={settings.maxDailyHours} value={settings.maxDailyHours} min={0.5} max={24} step={0.5} onChange={onMaxDailyHoursChange} />
          </PlannerField>
          <PlannerField label={copy.startDate}>
            <DateDraftInput value={settings.startDate} onChange={(date) => onSettingsChange({ startDate: date || today })} />
          </PlannerField>
          <PlannerField label={copy.rangeEndOptional}>
            <DateDraftInput value={settings.planEndDate} onChange={(date) => onSettingsChange({ planEndDate: date })} />
          </PlannerField>
          <PlannerField label={copy.holidays}>
            <button type="button" onClick={() => setPlannerModal("holidays")} className="ghost-button h-11 w-full rounded-xl px-3 text-sm font800">
              {holidays.length} {copy.dates}
            </button>
          </PlannerField>
          <PlannerField label={copy.customHours}>
            <button type="button" onClick={() => setPlannerModal("customHours")} className="ghost-button h-11 w-full rounded-xl px-3 text-sm font800">
              {customStudyHours.length} {copy.days}
            </button>
          </PlannerField>
        </div>

        {capacityWarning ? (
          <div className="mt-5 rounded-2xl border border-[#e11d2e]/35 bg-[#e11d2e]/12 p-4 text-sm text-[#ffd2d6]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{formatCapacityWarning(capacityWarning, language)}</p>
              {capacityWarning.suggestedDailyLimit ? (
                <button type="button" onClick={() => onMaxDailyHoursChange(capacityWarning.suggestedDailyLimit ?? settings.maxDailyHours)} className="ghost-button rounded-lg px-3 py-2 text-xs font800">
                  {copy.useSuggestedCap(capacityWarning.suggestedDailyLimit)}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <PlannerCourseOrder
        courses={orderedCourses}
        suggestions={targetSuggestions}
        copy={copy}
        onConfirmOrder={(courseIds) => {
          courseIds.forEach((courseId, index) => onUpdateCourse(courseId, { planningOrder: index + 1 }));
        }}
      />

      {plannerModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPlannerModal(null)}>
          <section className="soft-card w-full max-w-2xl rounded-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[#fff7f7]">{plannerModal === "holidays" ? copy.holidaysTitle : copy.customHoursTitle}</h3>
                <p className="mt-1 text-sm text-[#bfa4a7]">
                  {plannerModal === "holidays" ? copy.holidaysHelp : copy.customHoursHelp}
                </p>
              </div>
              <button type="button" onClick={() => setPlannerModal(null)} className="ghost-button rounded-lg px-3 py-2 text-xs font800">
                {copy.close}
              </button>
            </div>
            {plannerModal === "holidays" ? (
              <>
                <div className="mt-4 flex gap-2">
                  <div className="min-w-0 flex-1">
                    <DateDraftInput value={holidayDraft || undefined} onChange={(date) => setHolidayDraft(date ?? "")} />
                  </div>
                  <button type="button" onClick={() => {
                    if (isValidDateKey(holidayDraft)) onSettingsChange({ holidays: Array.from(new Set([...holidays, holidayDraft])) });
                    setHolidayDraft("");
                  }} className="ember-button rounded-xl px-4 text-sm font800">{copy.add}</button>
                </div>
                <ChipList items={holidays} onRemove={(date) => onSettingsChange({ holidays: holidays.filter((item) => item !== date) })} />
              </>
            ) : (
              <>
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                  <DateDraftInput value={customHoursDate || undefined} onChange={(date) => setCustomHoursDate(date ?? "")} />
                  <input value={customHoursValue} onChange={(event) => setCustomHoursValue(event.target.value)} className="field-dark h-11 rounded-xl px-3 text-center" />
                  <button type="button" onClick={() => {
                    const hours = Number(customHoursValue.replace(",", "."));
                    if (isValidDateKey(customHoursDate) && Number.isFinite(hours) && hours >= 0) {
                      const next = [...customStudyHours.filter((day) => day.date !== customHoursDate), { date: customHoursDate, hours: Math.min(hours, 24) }];
                      onSettingsChange({
                        customStudyHours: next,
                        restrictedDays: next.map((day) => ({ date: day.date, maxHours: day.hours })),
                      });
                    }
                    setCustomHoursDate("");
                  }} className="ember-button rounded-xl px-4 text-sm font800">{copy.add}</button>
                </div>
                <ChipList
                  items={customStudyHours.map((day) => `${formatDate(day.date)}:${day.hours}h`)}
                  onRemove={(value) => {
                    const next = customStudyHours.filter((day) => `${formatDate(day.date)}:${day.hours}h` !== value);
                    onSettingsChange({
                      customStudyHours: next,
                      restrictedDays: next.map((day) => ({ date: day.date, maxHours: day.hours })),
                    });
                  }}
                />
              </>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function PlannerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm font700 text-[#d9c2c4]">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function PlannerCourseOrder({
  courses,
  suggestions,
  copy,
  onConfirmOrder,
}: {
  courses: Course[];
  suggestions: Map<string, { date?: string; status: string }>;
  copy: typeof localeText.en.app;
  onConfirmOrder: (courseIds: string[]) => void;
}) {
  const [dragState, setDragState] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragOverRef = useRef<string | null>(null);
  const courseListRef = useRef<HTMLDivElement>(null);
  const sourceKey = courses.map((course) => course.id).join("|");
  const [draftState, setDraftState] = useState({ sourceKey, ids: courses.map((course) => course.id) });
  const draftIds = draftState.sourceKey === sourceKey ? draftState.ids : courses.map((course) => course.id);
  const draftCourses = draftIds.map((id) => courses.find((course) => course.id === id)).filter((course): course is Course => Boolean(course));
  const hasChanges = draftIds.join("|") !== sourceKey;
  const draggedCourse = dragState ? draftCourses.find((course) => course.id === dragState.id) : undefined;

  function reorder(sourceId: string, targetId: string, placement: "before" | "after") {
    if (sourceId === targetId) return;
    const sourceIndex = draftIds.indexOf(sourceId);
    const targetIndex = draftIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextIds = [...draftIds];
    const [selectedId] = nextIds.splice(sourceIndex, 1);
    let insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
    if (sourceIndex < insertIndex) insertIndex -= 1;
    nextIds.splice(insertIndex, 0, selectedId);
    setDraftState({ sourceKey, ids: nextIds });
  }

  function coursePlacementFromPoint(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    const directRow = element?.closest("[data-planner-course-id]") as HTMLElement | null;
    if (directRow?.dataset.plannerCourseId) {
      const rect = directRow.getBoundingClientRect();
      return { id: directRow.dataset.plannerCourseId, placement: y > rect.top + rect.height / 2 ? "after" : "before" } as const;
    }
    const rows = Array.from(courseListRef.current?.querySelectorAll<HTMLElement>("[data-planner-course-id]") ?? []);
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
    if (!closest.dataset.plannerCourseId) return undefined;
    const rect = closest.getBoundingClientRect();
    return { id: closest.dataset.plannerCourseId, placement: y > rect.top + rect.height / 2 ? "after" : "before" } as const;
  }

  function beginDrag(event: React.PointerEvent<HTMLElement>, courseId: string) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, select, a")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ id: courseId, x: event.clientX, y: event.clientY });
    dragOverRef.current = courseId;
  }

  function updateDrag(event: React.PointerEvent<HTMLElement>) {
    if (!dragState || event.buttons !== 1) return;
    setDragState({ id: dragState.id, x: event.clientX, y: event.clientY });
    const target = coursePlacementFromPoint(event.clientX, event.clientY);
    if (target?.id && target.id !== dragState.id) dragOverRef.current = `${target.id}:${target.placement}`;
  }

  function endDrag(event: React.PointerEvent<HTMLElement>) {
    const target = dragState ? coursePlacementFromPoint(event.clientX, event.clientY) : undefined;
    if (dragState && target?.id && target.id !== dragState.id) {
      reorder(dragState.id, target.id, target.placement);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
    dragOverRef.current = null;
  }

  function confirm() {
    onConfirmOrder(draftIds);
    setDraftState({ sourceKey: draftIds.join("|"), ids: draftIds });
  }

  return (
    <section className={`soft-card rounded-2xl p-5 ${hasChanges ? "pb-28" : ""}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.coursePriorityList}</p>
          <h3 className="mt-1 text-2xl font-black text-[#fff7f7]">{copy.dragCoursesPlanningOrder}</h3>
        </div>
        <p className="text-sm text-[#bfa4a7]">{copy.plannerOrderHelp}</p>
      </div>

      <div ref={courseListRef} className="mt-4 space-y-2">
        {draftCourses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#070506]/45 p-4 text-sm text-[#bfa4a7]">
            {copy.addCoursesFirst}
          </p>
        ) : null}
        {draftCourses.map((course, index) => {
          const suggestion = suggestions.get(course.id);
          return (
            <article
              key={course.id}
              data-planner-course-id={course.id}
              onPointerDown={(event) => beginDrag(event, course.id)}
              onPointerMove={updateDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
              className={`grid cursor-grab gap-3 rounded-xl border bg-[#070506]/54 p-3 transition duration-200 active:cursor-grabbing sm:grid-cols-[auto_1fr] sm:items-center ${
                dragState?.id === course.id
                  ? "scale-[0.99] border-[#ff6b76]/60 bg-[#e11d2e]/10 opacity-70 shadow-2xl shadow-black/35"
                  : "border-[#ffb4bb]/12 hover:-translate-y-0.5 hover:border-[#ff6b76]/35 hover:bg-[#fff7f7]/7"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#ffb4bb]/12 bg-[#fff7f7]/7 text-sm font-black text-[#ffb4bb]">
                  {index + 1}
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#ffb4bb]/10 bg-[#090506]/70 text-[#8f787b]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <circle cx="9" cy="7" r="1.4" />
                    <circle cx="15" cy="7" r="1.4" />
                    <circle cx="9" cy="12" r="1.4" />
                    <circle cx="15" cy="12" r="1.4" />
                    <circle cx="9" cy="17" r="1.4" />
                    <circle cx="15" cy="17" r="1.4" />
                  </svg>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-base font-black text-[#fff7f7]">{course.name}</h4>
                  <span className="rounded-full border border-[#ffb4bb]/12 bg-[#fff7f7]/6 px-2.5 py-1 text-xs font800 capitalize text-[#d9c2c4]">
                    {copy.priorityLabels[course.priority]}
                  </span>
                  {course.targetFinishDate ? (
                    <span className="rounded-full border border-[#ffb4bb]/12 bg-[#070506]/70 px-2.5 py-1 text-xs font800 text-[#ffb4bb]">
                      {copy.targetLabel} {formatDate(course.targetFinishDate)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#bfa4a7]">
                  {copy.suggestedTarget}:{" "}
                  {suggestion?.date ? (
                    <span className="font800 text-[#ffe7e9]">{formatDate(suggestion.date)}</span>
                  ) : (
                    <span>{suggestion?.status ?? "No study work to schedule"}</span>
                  )}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      {dragState && draggedCourse
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[80] max-w-[min(22rem,calc(100vw-2rem))] -translate-x-4 -translate-y-4 rounded-lg border border-[#ff6b76]/35 bg-[#12090b]/92 px-3 py-2 shadow-xl shadow-black/45 backdrop-blur-md"
              style={{ left: dragState.x, top: dragState.y }}
            >
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-md border border-[#ffb4bb]/12 bg-[#fff7f7]/7 text-xs font-black text-[#ffb4bb]">
                  {draftIds.indexOf(draggedCourse.id) + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#fff7f7]">{draggedCourse.name}</p>
                  <p className="text-[10px] font800 uppercase tracking-[0.16em] text-[#ffb4bb]">{copy.coursePriorityList}</p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {hasChanges ? (
        <div className="fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-[#ffb4bb]/14 bg-[#12090b]/92 p-3 shadow-2xl shadow-black/45 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font700 text-[#bfa4a7]">You have unsaved planner order changes.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraftState({ sourceKey, ids: courses.map((course) => course.id) })} className="ghost-button h-10 rounded-lg px-4 text-sm font800">
                {copy.discard}
              </button>
              <button type="button" onClick={confirm} className="ember-button h-10 rounded-lg px-4 text-sm font800">
                {copy.confirmChanges}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function suggestCourseTargets(courses: Course[], settings: PlannerSettings, today: string) {
  const suggestionState: StudyState = {
    courses: courses.map((course) => ({ ...course, targetFinishDate: undefined, requiresRevision: false })),
    tasks: [],
    settings: {
      ...settings,
      autoPlan: true,
      planEndDate: undefined,
    },
  };
  const projected = autoPlanSchedule(suggestionState, {
    today,
    maxDailyHours: settings.maxDailyHours,
    endDate: undefined,
    holidays: settings.holidays,
    customStudyHours: settings.customStudyHours,
    restrictedDays: settings.restrictedDays,
    ignoreTodayClock: true,
  });
  const result = new Map<string, { date?: string; status: string }>();

  for (const course of courses) {
    const finishDate = projectedCourseFinishDate(projected.tasks, course.id);
    if (!finishDate) {
      result.set(course.id, { status: "No remaining study work" });
      continue;
    }
    if (course.examDate && finishDate >= course.examDate) {
      result.set(course.id, {
        date: course.examDate > today ? addDays(course.examDate, -1) : finishDate,
        status: "Tight before exam",
      });
      continue;
    }
    result.set(course.id, { date: finishDate, status: "Earliest doable date" });
  }

  return result;
}

function ChipList({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <button key={item} type="button" onClick={() => onRemove(item)} className="rounded-full border border-[#ffb4bb]/14 bg-[#070506]/55 px-3 py-1.5 text-xs font800 text-[#ffe7e9]">
          {displayDateInput(item.split(":")[0])}{item.includes(":") ? ` ${item.split(":")[1]}` : ""} x
        </button>
      ))}
    </div>
  );
}

function TopNavItem({
  item,
  active,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      aria-label={item.label}
      title={item.label}
      className={`group relative flex h-10 min-w-0 items-center justify-center rounded-xl px-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[#ffb4bb]/45 ${
        active
          ? "nav-item-active"
          : "text-[#d9c2c4] hover:bg-[#fff7f7]/8 hover:text-white"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={navIcons[item.key]} />
      </svg>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.35rem)] z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#ffb4bb]/12 bg-[#090506]/95 px-2.5 py-1 text-[11px] font800 text-[#ffe7e9] opacity-0 shadow-xl shadow-black/40 transition group-hover:opacity-100">
        {item.label}
      </span>
    </button>
  );
}

function ClockBadge({ now, language }: { now: Date; language: PlannerSettings["language"] }) {
  const locale = language === "de" ? "de-DE" : language === "pl" ? "pl-PL" : language === "it" ? "it-IT" : "en";
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const weekdayLabel = new Intl.DateTimeFormat(locale, { weekday: "short" })
    .format(now)
    .replace(/\.$/, "")
    .toUpperCase();
  const dateLabel = `${weekdayLabel}, ${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;

  return (
    <div className="grid h-14 min-w-36 place-items-center rounded-xl border border-[#ffb4bb]/12 bg-[#fff7f7]/6 px-3 py-2 text-center lg:justify-self-end">
      <div>
        <p className="whitespace-nowrap text-xs font800 tabular-nums tracking-wide text-[#8f787b]">{dateLabel}</p>
        <p className="mt-0.5 whitespace-nowrap text-sm font800 tabular-nums text-[#ffb4bb]">{timeLabel}</p>
      </div>
    </div>
  );
}

type LateNightPromptContext = {
  key: string;
  studyDate: string;
  remainingHours: number;
  choices: Array<{ label: string; expiresAt: string; recommended: boolean }>;
};

function getLateNightPromptContext(tasks: StudyTask[], settings: PlannerSettings, now: Date): LateNightPromptContext | null {
  if (!settings.lateNightPromptEnabled) return null;
  if (settings.studyDayOverride && new Date(settings.studyDayOverride.expiresAt).getTime() > now.getTime()) return null;

  const hour = now.getHours();
  const realToday = todayKey(now);
  const isLateNight = hour >= settings.lateNightPromptAfterHour;
  const isEarlyMorning = hour < settings.lateNightMaxExtensionHour;
  if (!isLateNight && !isEarlyMorning) return null;

  const studyDate = isEarlyMorning ? addDays(realToday, -1) : realToday;
  const openTasks = tasks.filter((task) => task.date === studyDate && !task.completed);
  const remainingHours = roundToOne(sumHours(openTasks));
  if (remainingHours <= 0) return null;

  if (isLateNight) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const usableBeforeMidnight = Math.max(0, (midnight.getTime() - now.getTime()) / 3_600_000);
    if (remainingHours <= usableBeforeMidnight) return null;
  }

  const expiryDate = isEarlyMorning
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const neededUntil = now.getTime() + remainingHours * 3_600_000;
  const choices = Array.from({ length: settings.lateNightMaxExtensionHour }, (_, index) => index + 1)
    .map((choiceHour) => new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate(), choiceHour, 0, 0))
    .filter((expiresAt) => expiresAt.getTime() > now.getTime())
    .map((expiresAt) => ({
      label: new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(expiresAt),
      expiresAt: expiresAt.toISOString(),
      recommended: expiresAt.getTime() >= neededUntil,
    }));

  if (!choices.length) return null;
  return {
    key: `${studyDate}-${openTasks.length}-${remainingHours}`,
    studyDate,
    remainingHours,
    choices,
  };
}

function LateNightStudyPrompt({
  context,
  copy,
  onDismiss,
  onExtend,
}: {
  context: LateNightPromptContext;
  copy: typeof localeText.en.app;
  onDismiss: () => void;
  onExtend: (expiresAt: string) => void;
}) {
  if (typeof document === "undefined") return null;
  const recommended = context.choices.find((choice) => choice.recommended) ?? context.choices.at(-1);
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/62 p-4 backdrop-blur-md">
      <section className="soft-card w-full max-w-lg rounded-2xl p-5 shadow-2xl shadow-black/50">
        <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.lateNightStudy}</p>
        <h3 className="mt-2 text-2xl font-black text-[#fff7f7]">{copy.lateNightTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-[#d9c2c4]">
          {copy.lateNightBody(context.remainingHours, formatDate(context.studyDate))}
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {context.choices.map((choice) => (
            <button
              key={choice.expiresAt}
              type="button"
              onClick={() => onExtend(choice.expiresAt)}
              className={`${choice.expiresAt === recommended?.expiresAt ? "ember-button" : "ghost-button"} h-11 rounded-xl px-3 text-sm font800`}
            >
              {copy.extendTo(choice.label)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onDismiss} className="ghost-button h-10 rounded-xl px-4 text-sm font800">
            {copy.notTonight}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function OverviewPage({
  today,
  todayTasks,
  upcomingTasks,
  totalRemainingCourseHours,
  overallProgress,
  totalTodayHours,
  completedTodayHours,
  remainingTodayHours,
  riskLevel,
  courses,
  profile,
  copy,
  capacityWarning,
  missedTaskCount,
  onToggleTask,
  language,
}: {
  today: string;
  todayTasks: StudyState["tasks"];
  upcomingTasks: StudyState["tasks"];
  totalRemainingCourseHours: number;
  overallProgress: number;
  totalTodayHours: number;
  completedTodayHours: number;
  remainingTodayHours: number;
  riskLevel: ReturnType<typeof getRiskLevel>;
  courses: ReturnType<typeof calculateCourseProgress>;
  profile: UserProfile;
  copy: typeof localeText.en.app;
  capacityWarning: ReturnType<typeof plannerCapacityWarning>;
  missedTaskCount: number;
  onToggleTask: (taskId: string) => void;
  language: PlannerSettings["language"];
}) {
  const captainName = profile.name?.trim() ? `Captain ${profile.name.trim()}` : "Captain";
  const briefing = isBirthdayToday(today, profile.birthday)
    ? { title: copy.birthdayTitle(captainName), body: copy.birthdayBody }
    : createCockpitBriefing({
    name: profile.name,
    today,
    todayTasks,
    totalTodayHours,
    completedTodayHours,
    remainingTodayHours,
    overallProgress,
    riskLevel,
    courses,
    missedTaskCount,
    capacityWarning: Boolean(capacityWarning),
    language,
  });

  return (
    <>
      <section className="glass-panel overflow-hidden rounded-2xl p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font800 uppercase tracking-[0.24em] text-[#ff6b76]">{copy.cockpitSprint}</p>
            <h3 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[#fff7f7]">
              {briefing.title}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d9c2c4]">
              {briefing.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full border border-[#ffb4bb]/14 bg-[#fff7f7]/8 px-4 py-2 text-sm font700 text-[#ffe7e9]">
                {formatDate(today)}
              </span>
              <span className="rounded-full border border-[#e11d2e]/28 bg-[#e11d2e]/14 px-4 py-2 text-sm font700 text-[#ffd2d6]">
                {riskLevel} {copy.workload}
              </span>
              <span className="rounded-full border border-[#ffb4bb]/14 bg-[#070506]/55 px-4 py-2 text-sm font700 text-[#d9c2c4]">
                {courses.length} {copy.activeCourses}
              </span>
            </div>
            {capacityWarning ? (
              <div className="mt-4 rounded-2xl border border-[#e11d2e]/30 bg-[#e11d2e]/12 p-4">
                <p className="text-sm font800 text-[#fff7f7]">{copy.dailyLimitAttention}</p>
                <p className="mt-1 text-sm leading-6 text-[#d9c2c4]">{formatCapacityWarning(capacityWarning, language)}</p>
              </div>
            ) : null}
          </div>
          <div className="relative min-h-56 overflow-hidden rounded-2xl border border-[#ffb4bb]/12 bg-[#070506]/58 p-5">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#e11d2e]/24 blur-2xl" />
            <div className="absolute -bottom-20 left-4 h-48 w-48 rounded-full bg-[#8f111a]/30 blur-3xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.dailyProgress}</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black leading-none text-[#fff7f7]">
                      {totalTodayHours === 0 ? 0 : Math.round((completedTodayHours / totalTodayHours) * 100)}%
                    </p>
                    <p className="mt-2 text-sm font700 text-[#bfa4a7]">
                      {copy.doneOfPlanned(completedTodayHours, totalTodayHours)}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#e11d2e]/28 bg-[#e11d2e]/14 px-3 py-1 text-sm font800 text-[#ffd2d6]">
                    {remainingTodayHours}h {copy.left}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <div className="h-4 overflow-hidden rounded-full border border-[#ffb4bb]/12 bg-[#fff7f7]/8 shadow-inner shadow-black/40">
                  <div
                    className="theme-progress-fill h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalTodayHours === 0 ? 0 : Math.min((completedTodayHours / totalTodayHours) * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    [copy.planned, `${totalTodayHours}h`],
                    [copy.completed, `${completedTodayHours}h`],
                    [copy.remaining, `${remainingTodayHours}h`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[#ffb4bb]/10 bg-[#fff7f7]/7 p-3">
                      <p className="text-lg font-black text-[#fff7f7]">{value}</p>
                      <p className="mt-1 text-[10px] font800 uppercase tracking-[0.16em] text-[#9f8588]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <TodayPlan today={today} tasks={todayTasks} onToggleTask={onToggleTask} language={language} />
        <aside className="soft-card rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#ff6b76]">{copy.portfolio}</p>
              <h3 className="mt-1 text-2xl font-bold text-[#fff7f7]">{copy.studyLoad}</h3>
            </div>
            <span className="rounded-full border border-[#ffb4bb]/14 bg-[#fff7f7]/8 px-3 py-1 text-sm font-bold text-[#ffe7e9]">
              {totalRemainingCourseHours}h {copy.left}
            </span>
          </div>
          <div className="mt-5">
            <ProgressBar value={overallProgress} label={copy.lectureCompletion} />
          </div>
          <div className="mt-6 space-y-3">
            {courses.slice(0, 5).map((course) => (
              <div key={course.id} className="rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/50 p-4 transition hover:border-[#e11d2e]/35">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#fff7f7]">{course.name}</p>
                    <p className="mt-1 text-sm text-[#bfa4a7]">
                      {course.expectedFinishDate ? `${copy.finishes} ${formatDate(course.expectedFinishDate)}` : copy.noScheduledFinishYet}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#ff6b76]">{course.progressPercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
      <section className="soft-card rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#fff7f7]">{copy.upcomingWork}</h3>
          <span className="text-sm text-[#bfa4a7]">{upcomingTasks.length} {copy.tasks}</span>
        </div>
        <WeeklyUpcomingWork tasks={upcomingTasks} onToggleTask={onToggleTask} copy={copy} />
      </section>
    </>
  );
}

function WeeklyUpcomingWork({
  tasks,
  onToggleTask,
  copy,
}: {
  tasks: StudyTask[];
  onToggleTask: (taskId: string) => void;
  copy: typeof localeText.en.app;
}) {
  if (tasks.length === 0) {
    return <p className="rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#070506]/45 p-4 text-sm text-[#bfa4a7]">{copy.noUpcomingWork}</p>;
  }

  const weeks = groupTasksByWeek(tasks, copy.week).slice(0, 2);

  return (
    <div className="space-y-3">
      {weeks.map((week) => (
        <details key={week.key} className="rounded-2xl border border-[#ffb4bb]/12 bg-[#070506]/42">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font800 text-[#fff7f7]">{week.label}</p>
              <p className="mt-1 text-xs text-[#bfa4a7]">{week.tasks.length} {copy.activities}</p>
            </div>
            <span className="rounded-full border border-[#ffb4bb]/12 bg-[#fff7f7]/7 px-3 py-1 text-xs font800 text-[#ffb4bb]">
              {roundToOne(sumHours(week.tasks))}h
            </span>
          </summary>
          <div className="border-t border-[#ffb4bb]/10">
            {week.days.map((day) => (
              <div key={day.date} className="border-b border-[#ffb4bb]/8 px-4 py-4 last:border-b-0">
                <p className="mb-3 text-sm font800 text-[#fff7f7]">{formatDate(day.date)}</p>
                <div className="space-y-3">
                  {day.tasks.map((task) => (
                    <label key={task.id} className="grid cursor-pointer gap-3 rounded-xl border border-[#ffb4bb]/10 bg-[#090506]/55 p-3 transition hover:border-[#ff6b76]/35 md:grid-cols-[72px_1fr_auto] md:items-center">
                      <span className="text-sm font700 text-[#d9c2c4]">{task.estimatedHours}h</span>
                      <span>
                        <span className="block font800 text-[#ffd2d6]">{task.title}</span>
                        <span className="mt-1 block text-sm text-[#bfa4a7]">{task.subject} - {copy.taskTypeLabels[task.type]}</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm font700 text-[#d9c2c4]">
                        <input type="checkbox" checked={task.completed} onChange={() => onToggleTask(task.id)} className="h-4 w-4 accent-[#e11d2e]" />
                        {copy.done}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function createCockpitBriefing({
  name,
  today,
  todayTasks,
  totalTodayHours,
  completedTodayHours,
  remainingTodayHours,
  overallProgress,
  riskLevel,
  courses,
  missedTaskCount,
  capacityWarning,
  language,
}: {
  name?: string;
  today: string;
  todayTasks: StudyTask[];
  totalTodayHours: number;
  completedTodayHours: number;
  remainingTodayHours: number;
  overallProgress: number;
  riskLevel: ReturnType<typeof getRiskLevel>;
  courses: ReturnType<typeof calculateCourseProgress>;
  missedTaskCount: number;
  capacityWarning: boolean;
  language: PlannerSettings["language"];
}) {
  if (language !== "en") {
    return createLocalizedCockpitBriefing({
      name,
      today,
      todayTasks,
      totalTodayHours,
      completedTodayHours,
      remainingTodayHours,
      overallProgress,
      riskLevel,
      courses,
      missedTaskCount,
      capacityWarning,
      language,
    });
  }

  const captain = name?.trim() ? `Captain ${name.trim()}` : "Captain";
  const subjects = uniqueSubjects(todayTasks).slice(0, 2);
  const subjectText = subjects.length ? `, with ${subjects.join(" and ")} on the flight plan` : "";
  const nextExam = courses
    .filter((course) => course.hasExam && course.examDate && course.examDate >= today)
    .sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)))[0];
  const daysToExam = nextExam?.examDate ? daysBetween(today, nextExam.examDate) : Number.POSITIVE_INFINITY;
  const revisionToday = todayTasks.some((task) => task.type === "revision" || task.type === "mock");
  const seed = hashBriefingSeed(`${today}-${totalTodayHours}-${completedTodayHours}-${remainingTodayHours}-${missedTaskCount}-${overallProgress}`);

  const pick = (items: Array<{ title: string; body: string }>) => items[seed % items.length];

  if (totalTodayHours === 0) {
    return pick([
      {
        title: `Holding pattern, ${captain}.`,
        body: `No study blocks are scheduled today. Active courses are ${overallProgress}% complete.`,
      },
      {
        title: `Quiet airspace today, ${captain}.`,
        body: `There is no flight plan for today. Course progress is holding at ${overallProgress}%.`,
      },
      {
        title: `Standby mode, ${captain}.`,
        body: `No planned study is on the radar today. Razor is holding the current route.`,
      },
    ]);
  }

  if (remainingTodayHours <= 0 && totalTodayHours > 0) {
    return pick([
      {
        title: "Touchdown for today.",
        body: `All planned study blocks are complete. Nice landing.`,
      },
      {
        title: `Flight complete, ${captain}.`,
        body: `${completedTodayHours} planned hours are logged. Today's route is closed.`,
      },
      {
        title: "Clean landing.",
        body: `Today's flight plan is complete, and active courses are ${overallProgress}% complete.`,
      },
    ]);
  }

  if (missedTaskCount > 0 || capacityWarning) {
    const pressureMessages = [
      {
        title: `Turbulence ahead, ${captain}.`,
        body: `The workload is under pressure. ${remainingTodayHours} planned hours remain today${subjectText}.`,
      },
      {
        title: "Holding pattern detected.",
        body: `Some unfinished work is still in the queue. Today has ${remainingTodayHours} planned hours remaining.`,
      },
    ];
    if (missedTaskCount > 0) {
      pressureMessages.unshift(
        {
          title: `Course correction needed, ${captain}.`,
          body: `There ${missedTaskCount === 1 ? "is 1 missed task" : `are ${missedTaskCount} missed tasks`} in the holding pattern. Today's plan has been adjusted.`,
        },
      );
    }
    return pick(pressureMessages);
  }

  if (daysToExam <= 7) {
    return pick([
      {
        title: `Final approach, ${captain}.`,
        body: `${nextExam?.name ?? "Your next exam"} is ${daysToExam} ${daysToExam === 1 ? "day" : "days"} away. Today's flight plan is locked in.`,
      },
      {
        title: "Final approach window.",
        body: `${nextExam?.name ?? "The next exam"} is close. ${remainingTodayHours} planned hours remain today.`,
      },
      {
        title: `Landing sequence active, ${captain}.`,
        body: `${nextExam?.name ?? "Your next exam"} is on short final. Today's study blocks are queued.`,
      },
    ]);
  }

  if (revisionToday) {
    return pick([
      {
        title: `Final checks, ${captain}.`,
        body: `Revision is on today's flight plan. ${remainingTodayHours} planned hours remain.`,
      },
      {
        title: "Systems review underway.",
        body: `Today includes revision work${subjectText}. Active courses are ${overallProgress}% complete.`,
      },
    ]);
  }

  if (completedTodayHours > 0) {
    return pick([
      {
        title: `On course, ${captain}.`,
        body: `${completedTodayHours}h are logged, ${remainingTodayHours}h remain, and active courses are ${overallProgress}% complete.`,
      },
      {
        title: "Autopilot engaged.",
        body: `The session is in motion. ${remainingTodayHours} planned hours remain today${subjectText}.`,
      },
      {
        title: "Steady altitude.",
        body: `Progress is moving. ${completedTodayHours}h done, ${remainingTodayHours}h still on today's route.`,
      },
    ]);
  }

  if (riskLevel === "High" || riskLevel === "Critical") {
    return pick([
      {
        title: `Turbulence ahead, ${captain}.`,
        body: `Today's workload is heavy. You have ${remainingTodayHours} planned hours remaining${subjectText}.`,
      },
      {
        title: "High-density airspace.",
        body: `${totalTodayHours} planned hours are on today's flight plan. Active courses are ${overallProgress}% complete.`,
      },
    ]);
  }

  if (totalTodayHours <= 3) {
    return pick([
      {
        title: `Cleared for study, ${captain}.`,
        body: `A light flight plan is loaded: ${totalTodayHours} planned hours today${subjectText}.`,
      },
      {
        title: "Smooth runway today.",
        body: `${remainingTodayHours} planned hours remain, with active courses at ${overallProgress}% completion.`,
      },
    ]);
  }

  if (overallProgress >= 70) {
    return pick([
      {
        title: `On course, ${captain}.`,
        body: `Active courses are ${overallProgress}% complete. ${remainingTodayHours} planned hours remain today.`,
      },
      {
        title: "Cruising altitude.",
        body: `Progress is strong, and today's flight plan has ${remainingTodayHours} hours remaining.`,
      },
    ]);
  }

  if (overallProgress < 25) {
    return pick([
      {
        title: `Ready for takeoff, ${captain}.`,
        body: `You have ${totalTodayHours} planned hours today, ${remainingTodayHours} hours remaining, and active courses are ${overallProgress}% complete.`,
      },
      {
        title: `Mission briefing ready, ${captain}.`,
        body: `Today has ${totalTodayHours} planned hours${subjectText}. Active courses are ${overallProgress}% complete.`,
      },
    ]);
  }

  return pick([
    {
      title: `Today's flight plan is ready, ${captain}.`,
      body: `You have ${totalTodayHours} planned hours today, ${remainingTodayHours} hours remaining, and active courses are ${overallProgress}% complete.`,
    },
    {
      title: `Mission briefing ready, ${captain}.`,
      body: `${remainingTodayHours} planned hours remain today${subjectText}. Active courses are ${overallProgress}% complete.`,
    },
    {
      title: `Cleared for study, ${captain}.`,
      body: `Today's route is loaded with ${totalTodayHours} planned hours. ${remainingTodayHours}h remain.`,
    },
  ]);
}

function createLocalizedCockpitBriefing({
  name,
  today,
  todayTasks,
  totalTodayHours,
  completedTodayHours,
  remainingTodayHours,
  overallProgress,
  riskLevel,
  courses,
  missedTaskCount,
  capacityWarning,
  language,
}: {
  name?: string;
  today: string;
  todayTasks: StudyTask[];
  totalTodayHours: number;
  completedTodayHours: number;
  remainingTodayHours: number;
  overallProgress: number;
  riskLevel: ReturnType<typeof getRiskLevel>;
  courses: ReturnType<typeof calculateCourseProgress>;
  missedTaskCount: number;
  capacityWarning: boolean;
  language: Exclude<PlannerSettings["language"], "en">;
}) {
  const captain = name?.trim() ? `Captain ${name.trim()}` : "Captain";
  const subjects = uniqueSubjects(todayTasks).slice(0, 2);
  const nextExam = courses
    .filter((course) => course.hasExam && course.examDate && course.examDate >= today)
    .sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)))[0];
  const daysToExam = nextExam?.examDate ? daysBetween(today, nextExam.examDate) : Number.POSITIVE_INFINITY;
  const revisionToday = todayTasks.some((task) => task.type === "revision" || task.type === "mock");
  const seed = hashBriefingSeed(`${language}-${today}-${totalTodayHours}-${completedTodayHours}-${remainingTodayHours}-${missedTaskCount}-${overallProgress}`);
  const subjectList = subjects.join(language === "de" ? " und " : language === "pl" ? " i " : " e ");
  const pick = (items: Array<{ title: string; body: string }>) => items[seed % items.length];

  const text = {
    de: {
      idle: [
        { title: `Warteschleife, ${captain}.`, body: `Heute sind keine Lernblöcke geplant. Der Kursfortschritt liegt bei ${overallProgress}%.` },
        { title: `Ruhiger Luftraum, ${captain}.`, body: "Heute gibt es keinen Flugplan. Razor hält die Route stabil." },
      ],
      complete: [
        { title: "Landung für heute.", body: "Alle geplanten Lernblöcke sind erledigt. Sauber gelandet." },
        { title: `Flug abgeschlossen, ${captain}.`, body: `${completedTodayHours} geplante Stunden sind verbucht.` },
      ],
      pressure: [
        { title: `Kurskorrektur nötig, ${captain}.`, body: `${missedTaskCount} offene Aufgaben liegen in der Warteschleife. Der heutige Plan ist angepasst.` },
        { title: `Turbulenzen voraus, ${captain}.`, body: `Die Arbeitslast steht unter Druck. Heute bleiben ${remainingTodayHours} geplante Stunden${subjectList ? ` mit ${subjectList} im Flugplan` : ""}.` },
      ],
      exam: [
        { title: `Finaler Anflug, ${captain}.`, body: `${nextExam?.name ?? "Die nächste Prüfung"} ist in ${daysToExam} Tagen. Der heutige Flugplan steht.` },
        { title: "Landeanflug aktiv.", body: `${remainingTodayHours} geplante Stunden sind für heute bereit.` },
      ],
      revision: [
        { title: `Systemcheck, ${captain}.`, body: `Revision steht heute im Flugplan. ${remainingTodayHours} geplante Stunden bleiben.` },
        { title: "Kontrollrunde läuft.", body: `Heute ist Wiederholung eingeplant. Aktive Kurse sind ${overallProgress}% komplett.` },
      ],
      progress: [
        { title: `Auf Kurs, ${captain}.`, body: `${completedTodayHours}h sind erledigt, ${remainingTodayHours}h bleiben. Aktive Kurse sind ${overallProgress}% komplett.` },
        { title: "Autopilot aktiv.", body: `Die Sitzung läuft. Heute bleiben ${remainingTodayHours} geplante Stunden.` },
      ],
      heavy: [
        { title: `Turbulenzen voraus, ${captain}.`, body: `Heute ist ein schwerer Flugplan: ${remainingTodayHours} geplante Stunden bleiben${subjectList ? ` mit ${subjectList}` : ""}.` },
        { title: "Dichter Luftraum.", body: `${totalTodayHours} geplante Stunden stehen heute im Flugplan.` },
      ],
      light: [
        { title: `Freigabe zum Lernen, ${captain}.`, body: `Ein leichter Flugplan ist geladen: ${totalTodayHours} geplante Stunden heute.` },
        { title: "Ruhige Startbahn.", body: `${remainingTodayHours} geplante Stunden bleiben. Der Kursfortschritt liegt bei ${overallProgress}%.` },
      ],
      normal: [
        { title: `Missionsbriefing bereit, ${captain}.`, body: `Heute sind ${totalTodayHours} Stunden geplant, ${remainingTodayHours} Stunden bleiben.` },
        { title: `Flugplan bereit, ${captain}.`, body: `Aktive Kurse sind ${overallProgress}% komplett.` },
      ],
    },
    pl: {
      idle: [
        { title: `Tryb oczekiwania, ${captain}.`, body: `Na dzisiaj nie ma bloków nauki. Postęp kursów wynosi ${overallProgress}%.` },
        { title: `Spokojna przestrzeń, ${captain}.`, body: "Brak planu lotu na dzisiaj. Razor utrzymuje kurs." },
      ],
      complete: [
        { title: "Lądowanie na dziś zakończone.", body: "Wszystkie zaplanowane bloki nauki są gotowe." },
        { title: `Lot zakończony, ${captain}.`, body: `${completedTodayHours} zaplanowanych godzin zostało zapisanych.` },
      ],
      pressure: [
        { title: `Potrzebna korekta kursu, ${captain}.`, body: `${missedTaskCount} zaległych zadań czeka w kolejce. Dzisiejszy plan został dostosowany.` },
        { title: `Turbulencje przed nami, ${captain}.`, body: `Obciążenie jest pod presją. Na dzisiaj zostało ${remainingTodayHours} godzin${subjectList ? ` z ${subjectList} w planie lotu` : ""}.` },
      ],
      exam: [
        { title: `Podejście końcowe, ${captain}.`, body: `${nextExam?.name ?? "Następny egzamin"} jest za ${daysToExam} dni. Dzisiejszy plan lotu jest gotowy.` },
        { title: "Sekwencja lądowania aktywna.", body: `${remainingTodayHours} godzin pozostało w dzisiejszym planie.` },
      ],
      revision: [
        { title: `Kontrola systemów, ${captain}.`, body: `Powtórka jest dzisiaj w planie. Zostało ${remainingTodayHours} godzin.` },
        { title: "Przegląd trwa.", body: `Aktywne kursy są ukończone w ${overallProgress}%.` },
      ],
      progress: [
        { title: `Na kursie, ${captain}.`, body: `${completedTodayHours}h zapisane, ${remainingTodayHours}h pozostało. Kursy są ukończone w ${overallProgress}%.` },
        { title: "Autopilot włączony.", body: `Sesja trwa. Na dzisiaj zostało ${remainingTodayHours} godzin.` },
      ],
      heavy: [
        { title: `Turbulencje przed nami, ${captain}.`, body: `Dzisiejszy plan jest ciężki: ${remainingTodayHours} godzin pozostało${subjectList ? ` z ${subjectList}` : ""}.` },
        { title: "Gęsty ruch.", body: `${totalTodayHours} godzin jest w dzisiejszym planie lotu.` },
      ],
      light: [
        { title: `Zgoda na start, ${captain}.`, body: `Lekki plan lotu załadowany: ${totalTodayHours} godzin dzisiaj.` },
        { title: "Spokojny pas startowy.", body: `${remainingTodayHours} godzin pozostało, a kursy są ukończone w ${overallProgress}%.` },
      ],
      normal: [
        { title: `Odprawa gotowa, ${captain}.`, body: `Dzisiaj zaplanowano ${totalTodayHours} godzin, pozostało ${remainingTodayHours}.` },
        { title: `Plan lotu gotowy, ${captain}.`, body: `Dzisiaj zaplanowano ${totalTodayHours} godzin, pozostało ${remainingTodayHours}. Aktywne kursy są ukończone w ${overallProgress}%.` },
      ],
    },
    it: {
      idle: [
        { title: `In attesa, ${captain}.`, body: `Oggi non ci sono blocchi di studio. I corsi attivi sono al ${overallProgress}%.` },
        { title: `Spazio aereo tranquillo, ${captain}.`, body: "Nessun piano di volo oggi. Razor mantiene la rotta." },
      ],
      complete: [
        { title: "Atterraggio completato.", body: "Tutti i blocchi di studio pianificati sono conclusi." },
        { title: `Volo chiuso, ${captain}.`, body: `${completedTodayHours} ore pianificate sono state registrate.` },
      ],
      pressure: [
        { title: `Serve una correzione di rotta, ${captain}.`, body: `${missedTaskCount} attività arretrate sono in coda. Il piano di oggi e stato regolato.` },
        { title: `Turbolenza in arrivo, ${captain}.`, body: `Il carico è sotto pressione. Restano ${remainingTodayHours} ore pianificate${subjectList ? ` con ${subjectList} nel piano di volo` : ""}.` },
      ],
      exam: [
        { title: `Avvicinamento finale, ${captain}.`, body: `${nextExam?.name ?? "Il prossimo esame"} è tra ${daysToExam} giorni. Il piano di oggi è pronto.` },
        { title: "Sequenza di atterraggio attiva.", body: `Restano ${remainingTodayHours} ore pianificate per oggi.` },
      ],
      revision: [
        { title: `Controlli finali, ${captain}.`, body: `Oggi è prevista revisione. Restano ${remainingTodayHours} ore.` },
        { title: "Revisione sistemi in corso.", body: `I corsi attivi sono al ${overallProgress}%.` },
      ],
      progress: [
        { title: `In rotta, ${captain}.`, body: `${completedTodayHours}h registrate, ${remainingTodayHours}h restanti. Corsi attivi al ${overallProgress}%.` },
        { title: "Autopilota inserito.", body: `La sessione è in movimento. Restano ${remainingTodayHours} ore pianificate.` },
      ],
      heavy: [
        { title: `Turbolenza in arrivo, ${captain}.`, body: `Oggi il carico è pesante: restano ${remainingTodayHours} ore${subjectList ? ` con ${subjectList}` : ""}.` },
        { title: "Spazio aereo intenso.", body: `${totalTodayHours} ore sono nel piano di volo di oggi.` },
      ],
      light: [
        { title: `Autorizzato allo studio, ${captain}.`, body: `Piano leggero caricato: ${totalTodayHours} ore pianificate oggi.` },
        { title: "Pista libera.", body: `Restano ${remainingTodayHours} ore e i corsi attivi sono al ${overallProgress}%.` },
      ],
      normal: [
        { title: `Briefing missione pronto, ${captain}.`, body: `Oggi ci sono ${totalTodayHours} ore pianificate, ${remainingTodayHours} restanti.` },
        { title: `Piano di volo pronto, ${captain}.`, body: `I corsi attivi sono al ${overallProgress}%.` },
      ],
    },
  }[language];

  if (totalTodayHours === 0) return pick(text.idle);
  if (remainingTodayHours <= 0 && totalTodayHours > 0) return pick(text.complete);
  if (missedTaskCount > 0 || capacityWarning) return pick(missedTaskCount > 0 ? text.pressure : text.pressure.slice(1));
  if (daysToExam <= 7) return pick(text.exam);
  if (revisionToday) return pick(text.revision);
  if (completedTodayHours > 0) return pick(text.progress);
  if (riskLevel === "High" || riskLevel === "Critical") return pick(text.heavy);
  if (totalTodayHours <= 3) return pick(text.light);
  return pick(text.normal);
}

function formatCapacityWarning(
  warning: ReturnType<typeof plannerCapacityWarning>,
  language: PlannerSettings["language"],
) {
  if (!warning) return "";
  if (language === "en") return warning.message;
  const hours = warning.suggestedDailyLimit;
  if (language === "de") {
    return hours
      ? `Dieser Plan überschreitet die aktuelle Kapazität. Erhöhe das Tageslimit auf ${hours}h, damit die Fristen eingehalten werden.`
      : "Dieser Plan liegt außerhalb der aktuellen Kapazität.";
  }
  if (language === "pl") {
    return hours
      ? `Ten plan przekracza obecną pojemność. Podnieś dzienny limit do ${hours}h, aby zmieścić się w terminach.`
      : "Ten plan przekracza obecną pojemność.";
  }
  return hours
    ? `Questo piano supera la capacità attuale. Aumenta il limite giornaliero a ${hours}h per rispettare le scadenze.`
    : "Questo piano supera la capacità attuale.";
}

function uniqueSubjects(tasks: StudyTask[]) {
  return Array.from(new Set(tasks.filter((task) => !task.completed && task.estimatedHours > 0).map((task) => task.subject))).filter(Boolean);
}

function isBirthdayToday(today: string, birthday?: string) {
  if (!birthday) return false;
  const normalized = normalizeBirthdayDate(birthday);
  if (!normalized) return false;
  return normalized.slice(5) === today.slice(5);
}

function normalizeBirthdayDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function hashBriefingSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function groupTasksByWeek(tasks: StudyTask[], weekLabel: string) {
  const sortedAll = [...tasks].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = sortedAll[0]?.date;
  const weekMap = new Map<string, StudyTask[]>();

  for (const task of sortedAll) {
    const weekIndex = firstDate ? Math.floor(daysBetween(firstDate, task.date) / 7) : 0;
    const key = `week-${weekIndex + 1}`;
    const existing = weekMap.get(key) ?? [];
    weekMap.set(key, [...existing, task]);
  }

  return [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map(([key, weekTasks], index) => {
      const sortedTasks = [...weekTasks].sort((a, b) => a.date.localeCompare(b.date));
      const dayMap = sortedTasks.reduce<Record<string, StudyTask[]>>((groups, task) => {
        groups[task.date] = groups[task.date] ?? [];
        groups[task.date].push(task);
        return groups;
      }, {});
      const first = sortedTasks[0]?.date;
      const last = sortedTasks[sortedTasks.length - 1]?.date;
      const label = `${weekLabel} ${index + 1}`;

      return {
        key,
        label: first && last ? `${label} (${formatDate(first)} - ${formatDate(last)})` : label,
        tasks: sortedTasks,
        days: Object.entries(dayMap).map(([date, dayTasks]) => ({ date, tasks: dayTasks })),
      };
    });
}

function daysBetween(start: string, end: string) {
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  return Math.max(Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)), 0);
}

function SettingsPage({
  settings,
  profile,
  copy,
  onSettingsChange,
  onProfileChange,
  onReset,
}: {
  settings: PlannerSettings;
  profile: UserProfile;
  copy: typeof localeText.en.app;
  onSettingsChange: (patch: Partial<PlannerSettings>) => void;
  onProfileChange: (patch: Partial<UserProfile>) => void;
  onReset: () => void;
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [draftSettings, setDraftSettings] = useState<PlannerSettings>(settings);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);

  const reminderHour = Number(draftSettings.reminderTime.split(":")[0] ?? 18);
  const safeReminderHour = Number.isFinite(reminderHour) ? reminderHour : 18;
  const setReminderHour = (hour: number) => {
    const nextHour = ((hour % 24) + 24) % 24;
    setDraftSettings((current) => ({ ...current, reminderTime: `${String(nextHour).padStart(2, "0")}:00` }));
  };
  const settingsChanged = JSON.stringify(draftSettings) !== JSON.stringify(settings);
  const profileChanged = JSON.stringify(draftProfile) !== JSON.stringify(profile);
  const hasChanges = settingsChanged || profileChanged;

  function confirmChanges() {
    if (settingsChanged) onSettingsChange(draftSettings);
    if (profileChanged) onProfileChange(draftProfile);
  }

  return (
    <section className={`mx-auto w-full max-w-6xl space-y-5 ${hasChanges ? "pb-28" : ""}`}>
      <section className="soft-card rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.settingsProfile}</p>
            <h3 className="mt-1 text-2xl font-black text-[#fff7f7]">{copy.personalDetails}</h3>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm font700 text-[#d9c2c4]">
            {copy.name}
            <input
              value={draftProfile.name}
              onChange={(event) => setDraftProfile((current) => ({ ...current, name: event.target.value }))}
              className="field-dark mt-2 h-11 w-full rounded-xl px-3"
              placeholder={copy.name}
            />
          </label>
          <div className="text-sm font700 text-[#d9c2c4]">
            {copy.birthday}
            <div className="mt-2">
              <DateDraftInput
                value={draftProfile.birthday || undefined}
                onChange={(date) => setDraftProfile((current) => ({ ...current, birthday: date ?? "" }))}
              />
            </div>
          </div>
          <label className="text-sm font700 text-[#d9c2c4]">
            {copy.institution}
            <input
              value={draftProfile.institution}
              onChange={(event) => setDraftProfile((current) => ({ ...current, institution: event.target.value }))}
              className="field-dark mt-2 h-11 w-full rounded-xl px-3"
              placeholder={copy.institution}
            />
          </label>
        </div>
      </section>

      <section className="soft-card rounded-2xl p-5">
        <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.appearance}</p>
        <div className="mt-5 grid gap-5">
          <div>
            <p className="text-sm font700 text-[#d9c2c4]">{copy.theme}</p>
            <ThemePicker
              value={draftSettings.theme}
              onChange={(theme) => setDraftSettings((current) => ({ ...current, theme }))}
            />
            <p className="mt-3 text-xs font600 text-[#bfa4a7]">{copy.themeHelp}</p>
          </div>
          <div>
            <p className="text-sm font700 text-[#d9c2c4]">{copy.displayLanguage}</p>
            <LanguageDropdown
              value={draftSettings.language}
              onChange={(language) => setDraftSettings((current) => ({ ...current, language }))}
            />
            <p className="mt-3 text-xs font600 text-[#bfa4a7]">
              {copy.languageHelp}
            </p>
          </div>
        </div>
      </section>

      <section className="soft-card rounded-2xl p-5">
        <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.automation}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <ToggleSetting
            title={copy.automaticReplanning}
            description={copy.automaticReplanningHelp}
            checked={draftSettings.autoPlan}
            onChange={(checked) => setDraftSettings((current) => ({ ...current, autoPlan: checked }))}
          />
          <div className="flex min-h-24 flex-col justify-center rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/45 p-4 text-sm font700 text-[#d9c2c4]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span>{copy.autoPlanInterval}</span>
            </div>
            <NumberStepper
              key={draftSettings.autoPlanIntervalHours}
              value={draftSettings.autoPlanIntervalHours}
              min={1}
              max={24}
              step={1}
              onChange={(autoPlanIntervalHours) => setDraftSettings((current) => ({ ...current, autoPlanIntervalHours }))}
            />
          </div>
          <ToggleSetting
            title={copy.showCompletedTasks}
            description={copy.showCompletedTasksHelp}
            checked={draftSettings.showCompletedTasks}
            onChange={(checked) => setDraftSettings((current) => ({ ...current, showCompletedTasks: checked }))}
          />
          <ToggleSetting
            title={copy.lateNightPrompt}
            description={copy.lateNightStudyHelp}
            checked={draftSettings.lateNightPromptEnabled}
            onChange={(checked) => setDraftSettings((current) => ({ ...current, lateNightPromptEnabled: checked }))}
          />
          <div className="flex min-h-24 flex-col justify-center rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/45 p-4 text-sm font700 text-[#d9c2c4]">
            <span className="mb-2 block">{copy.lateNightPromptAfter}</span>
            <NumberStepper
              key={draftSettings.lateNightPromptAfterHour}
              value={draftSettings.lateNightPromptAfterHour}
              min={18}
              max={23}
              step={1}
              onChange={(lateNightPromptAfterHour) => setDraftSettings((current) => ({ ...current, lateNightPromptAfterHour }))}
            />
          </div>
          <div className="flex min-h-24 flex-col justify-center rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/45 p-4 text-sm font700 text-[#d9c2c4]">
            <span className="mb-2 block">{copy.lateNightMaxExtension}</span>
            <NumberStepper
              key={draftSettings.lateNightMaxExtensionHour}
              value={draftSettings.lateNightMaxExtensionHour}
              min={1}
              max={6}
              step={1}
              onChange={(lateNightMaxExtensionHour) => setDraftSettings((current) => ({ ...current, lateNightMaxExtensionHour }))}
            />
          </div>
        </div>
      </section>

      <section className="soft-card rounded-2xl p-5">
        <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.plannerDefaults}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font700 text-[#d9c2c4]">
            {copy.dailyStudyCap}
            <div className="mt-2">
              <NumberStepper
                key={draftSettings.maxDailyHours}
                value={draftSettings.maxDailyHours}
                min={0.5}
                max={24}
                step={0.5}
                onChange={(maxDailyHours) => setDraftSettings((current) => ({ ...current, maxDailyHours }))}
              />
            </div>
          </label>
          <label className="text-sm font700 text-[#d9c2c4]">
            {copy.defaultTaskHours}
            <div className="mt-2">
              <NumberStepper
                key={draftSettings.defaultTaskHours}
                value={draftSettings.defaultTaskHours}
                min={0.5}
                max={12}
                step={0.5}
                onChange={(defaultTaskHours) => setDraftSettings((current) => ({ ...current, defaultTaskHours }))}
              />
            </div>
          </label>
          <label className="text-sm font700 text-[#d9c2c4]">
            {copy.heavyDayWarning}
            <div className="mt-2">
              <NumberStepper
                key={draftSettings.warningThresholdHours}
                value={draftSettings.warningThresholdHours}
                min={1}
                max={24}
                step={0.5}
                onChange={(warningThresholdHours) => setDraftSettings((current) => ({ ...current, warningThresholdHours }))}
              />
            </div>
          </label>
          <div className="text-sm font700 text-[#d9c2c4]">
            {copy.preferredStudyTime}
            <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/55 px-2">
              <button
                type="button"
                onClick={() => setReminderHour(safeReminderHour - 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#ffb4bb]/12 bg-[#fff7f7]/6 text-base font-black text-[#fff7f7]"
                aria-label="Move preferred study time earlier"
              >
                -
              </button>
              <span className="text-base font-black text-[#fff7f7]">{String(safeReminderHour).padStart(2, "0")}:00</span>
              <button
                type="button"
                onClick={() => setReminderHour(safeReminderHour + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#ffb4bb]/12 bg-[#fff7f7]/6 text-base font-black text-[#fff7f7]"
                aria-label="Move preferred study time later"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs font600 text-[#bfa4a7]">{copy.reminderHelp}</p>
          </div>
        </div>
      </section>

      <section className="soft-card rounded-2xl p-5">
          <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.calendar}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDraftSettings((current) => ({ ...current, weekStartsOn: "monday" }))}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                draftSettings.weekStartsOn === "monday"
                  ? "border-[#ff4d5d]/70 bg-[#e11d2e]/24 text-white"
                  : "border-[#ffb4bb]/12 bg-[#070506]/45 text-[#d9c2c4] hover:border-[#ff6b76]/40"
              }`}
            >
              <span className="block font800">{copy.weekStartsMonday}</span>
              <span className="mt-1 block text-sm text-[#bfa4a7]">{copy.weekStartsMondayHelp}</span>
            </button>
            <button
              type="button"
              onClick={() => setDraftSettings((current) => ({ ...current, weekStartsOn: "sunday" }))}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                draftSettings.weekStartsOn === "sunday"
                  ? "border-[#ff4d5d]/70 bg-[#e11d2e]/24 text-white"
                  : "border-[#ffb4bb]/12 bg-[#070506]/45 text-[#d9c2c4] hover:border-[#ff6b76]/40"
              }`}
            >
              <span className="block font800">{copy.weekStartsSunday}</span>
              <span className="mt-1 block text-sm text-[#bfa4a7]">{copy.weekStartsSundayHelp}</span>
            </button>
          </div>
      </section>

      <section className="soft-card rounded-2xl p-5">
          <p className="text-xs font800 uppercase tracking-[0.22em] text-[#ff6b76]">{copy.data}</p>
          <div className="mt-5 rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/45 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font800 text-[#fff7f7]">{copy.resetRazor}</p>
                <p className="mt-1 text-sm text-[#bfa4a7]">{copy.resetHelp}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="ghost-button rounded-lg px-4 py-2 text-sm font-bold"
              >
                {copy.resetSchedule}
              </button>
            </div>
            {confirmingReset ? (
              <div className="mt-4 rounded-xl border border-[#e11d2e]/35 bg-[#e11d2e]/12 p-4">
                <p className="text-sm font700 text-[#fff7f7]">{copy.resetQuestion}</p>
                <p className="mt-1 text-sm text-[#d9c2c4]">{copy.resetWarning}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onReset();
                      setConfirmingReset(false);
                    }}
                    className="ember-button rounded-lg px-4 py-2 text-sm font-bold"
                  >
                    {copy.yesReset}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(false)}
                    className="ghost-button rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    {copy.cancel}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
      </section>
      {hasChanges ? (
        <div className="fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-[#ffb4bb]/14 bg-[#12090b]/92 p-3 shadow-2xl shadow-black/45 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font700 text-[#bfa4a7]">{copy.unsavedSettings}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftSettings(settings);
                  setDraftProfile(profile);
                }}
                className="ghost-button h-10 rounded-lg px-4 text-sm font800"
              >
                {copy.discard}
              </button>
              <button
                type="button"
                onClick={confirmChanges}
                className="ember-button h-10 rounded-lg px-4 text-sm font800"
              >
                {copy.confirmChanges}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-28 cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/45 p-4 transition hover:border-[#ff6b76]/35">
      <span>
        <span className="block font800 text-[#fff7f7]">{title}</span>
        <span className="mt-1 block text-sm text-[#bfa4a7]">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#e11d2e]" />
    </label>
  );
}

function NumberStepper({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  function clamp(next: number) {
    const stepped = Math.round(next / step) * step;
    const clamped = Math.min(Math.max(stepped, min), max);
    return Number(clamped.toFixed(2));
  }

  function commit(raw = draft) {
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = clamp(parsed);
    setDraft(String(next));
    onChange(next);
  }

  function stepBy(delta: number) {
    const next = clamp(value + delta);
    setDraft(String(next));
    onChange(next);
  }

  return (
    <div className="flex h-11 items-center gap-2 rounded-xl border border-[#ffb4bb]/12 bg-[#070506]/55 px-2">
      <button
        type="button"
        onClick={() => stepBy(-step)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#ffb4bb]/12 bg-[#fff7f7]/5 text-base font-black text-[#fff7f7] transition hover:border-[#ff6b76]/40"
      >
        -
      </button>
      <input
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/[^\d.,]/g, ""))}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            stepBy(step);
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            stepBy(-step);
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-center text-base font900 text-[#fff7f7] outline-none"
      />
      <button
        type="button"
        onClick={() => stepBy(step)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#ffb4bb]/12 bg-[#fff7f7]/5 text-base font-black text-[#fff7f7] transition hover:border-[#ff6b76]/40"
      >
        +
      </button>
    </div>
  );
}

const languageOptions: Array<{ value: PlannerSettings["language"]; label: string }> = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "pl", label: "Polski" },
  { value: "it", label: "Italiano" },
];

const themeOptions: Array<{ value: PlannerSettings["theme"]; label: string; colors: string[] }> = [
  { value: "razor", label: "Razor", colors: ["#080506", "#8f111a", "#e11d2e"] },
  { value: "biaBee", label: "Bia Bee", colors: ["#050505", "#facc15", "#f59e0b"] },
  { value: "tofu", label: "Tofu", colors: ["#15100d", "#a46a3d", "#f4eadc"] },
];

function ThemePicker({
  value,
  onChange,
}: {
  value: PlannerSettings["theme"];
  onChange: (theme: PlannerSettings["theme"]) => void;
}) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-3">
      {themeOptions.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`theme-choice rounded-xl border px-3 py-3 text-left transition ${
              selected
                ? "theme-choice-selected text-white"
                : "border-[#ffb4bb]/12 bg-[#070506]/45 text-[#d9c2c4] hover:border-[#ff6b76]/40"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font800">{option.label}</span>
              <span className="flex gap-1">
                {option.colors.map((color) => (
                  <span
                    key={color}
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ background: color }}
                  />
                ))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LanguageDropdown({
  value,
  onChange,
}: {
  value: PlannerSettings["language"];
  onChange: (language: PlannerSettings["language"]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = languageOptions.find((option) => option.value === value) ?? languageOptions[0];

  useEffect(() => {
    if (!isOpen) return;

    function updateMenuPosition() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
        zIndex: 9999,
      });
    }

    function closeFromOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("mousedown", closeFromOutside);
    window.addEventListener("keydown", closeFromEscape);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("mousedown", closeFromOutside);
      window.removeEventListener("keydown", closeFromEscape);
    };
  }, [isOpen]);

  const menu = isOpen
    ? createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
          className="overflow-hidden rounded-xl border border-[#ffb4bb]/14 bg-[#090506]/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {languageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font800 transition ${
                option.value === value
                  ? "bg-[#e11d2e]/24 text-[#fff7f7]"
                  : "text-[#d9c2c4] hover:bg-[#fff7f7]/8 hover:text-[#fff7f7]"
              }`}
            >
              {option.label}
              {option.value === value ? <CheckMark className="h-4 w-4 text-[#ffb4bb]" /> : null}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="mt-2">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`field-dark flex h-11 w-full items-center justify-between rounded-xl px-3.5 text-left text-sm font800 transition ${
          isOpen ? "border-[#e11d2e]/75 shadow-[0_0_0_4px_rgba(225,29,46,0.18)]" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selected.label}</span>
        <ChevronDown className={`h-4 w-4 text-[#ffb4bb] transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="m4.5 10.3 3.3 3.2 7.7-7.6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const boardCopy = {
  en: {
    columns: {
      todo: { label: "To-do", hint: "Ideas and tasks to start" },
      inProgress: { label: "In progress", hint: "Work currently moving" },
      done: { label: "Done", hint: "Finished notes" },
    },
    emptyColumn: "Drop a note here or add one above.",
    addSticky: "Add sticky note",
    noteTitle: "Note title",
    details: "Details",
    add: "Add",
    cancel: "Cancel",
    untitled: "Untitled note",
    noDetails: "No details yet.",
    linkCourseTask: "Link course or task",
    linkedTask: "Linked task",
    linkedCourse: "Linked course",
    noLink: "No link",
    courses: "Courses",
    tasks: "Tasks",
    noTasksFound: "No tasks found for this course.",
    done: "Done",
    removeNote: "Remove note",
  },
  de: {
    columns: {
      todo: { label: "Zu tun", hint: "Ideen und Aufgaben zum Starten" },
      inProgress: { label: "In Arbeit", hint: "Aktuelle Arbeit" },
      done: { label: "Erledigt", hint: "Abgeschlossene Notizen" },
    },
    emptyColumn: "Lege hier eine Notiz ab oder füge oben eine hinzu.",
    addSticky: "Notiz hinzufügen",
    noteTitle: "Notiztitel",
    details: "Details",
    add: "Hinzufügen",
    cancel: "Abbrechen",
    untitled: "Unbenannte Notiz",
    noDetails: "Noch keine Details.",
    linkCourseTask: "Kurs oder Aufgabe verknüpfen",
    linkedTask: "Verknüpfte Aufgabe",
    linkedCourse: "Verknüpfter Kurs",
    noLink: "Keine Verknüpfung",
    courses: "Kurse",
    tasks: "Aufgaben",
    noTasksFound: "Keine Aufgaben für diesen Kurs gefunden.",
    done: "Erledigt",
    removeNote: "Notiz entfernen",
  },
  pl: {
    columns: {
      todo: { label: "Do zrobienia", hint: "Pomysły i zadania do rozpoczęcia" },
      inProgress: { label: "W toku", hint: "Praca, ktora teraz trwa" },
      done: { label: "Gotowe", hint: "Ukończone notatki" },
    },
    emptyColumn: "Upusc notatke tutaj albo dodaj ja powyzej.",
    addSticky: "Dodaj notatke",
    noteTitle: "Tytul notatki",
    details: "Szczegoly",
    add: "Dodaj",
    cancel: "Anuluj",
    untitled: "Notatka bez tytulu",
    noDetails: "Brak szczegolow.",
    linkCourseTask: "Połącz kurs lub zadanie",
    linkedTask: "Powiązane zadanie",
    linkedCourse: "Powiazany kurs",
    noLink: "Brak polaczenia",
    courses: "Kursy",
    tasks: "Zadania",
    noTasksFound: "Brak zadań dla tego kursu.",
    done: "Gotowe",
    removeNote: "Usun notatke",
  },
  it: {
    columns: {
      todo: { label: "Da fare", hint: "Idee e attività da iniziare" },
      inProgress: { label: "In corso", hint: "Lavoro in movimento" },
      done: { label: "Fatto", hint: "Note completate" },
    },
    emptyColumn: "Trascina una nota qui o aggiungine una sopra.",
    addSticky: "Aggiungi nota",
    noteTitle: "Titolo nota",
    details: "Dettagli",
    add: "Aggiungi",
    cancel: "Annulla",
    untitled: "Nota senza titolo",
    noDetails: "Nessun dettaglio.",
    linkCourseTask: "Collega corso o attività",
    linkedTask: "Attivita collegata",
    linkedCourse: "Corso collegato",
    noLink: "Nessun collegamento",
    courses: "Corsi",
    tasks: "Attività",
    noTasksFound: "Nessuna attività trovata per questo corso.",
    done: "Fatto",
    removeNote: "Rimuovi nota",
  },
};

const boardColumns: BoardColumn[] = ["todo", "inProgress", "done"];

function BoardPage({
  notes,
  courses,
  tasks,
  language,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  notes: BoardNote[];
  courses: Course[];
  tasks: StudyTask[];
  language: PlannerSettings["language"];
  onAddNote: (note: Omit<BoardNote, "createdAt">) => void;
  onUpdateNote: (noteId: string, patch: Partial<BoardNote>) => void;
  onDeleteNote: (noteId: string) => void;
}) {
  const [dragOverColumn, setDragOverColumn] = useState<BoardColumn | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const draggedNote = draggedNoteId ? notes.find((note) => note.id === draggedNoteId) : undefined;
  const copy = boardCopy[language] ?? boardCopy.en;

  function getColumnFromPoint(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    const columnElement = element?.closest("[data-board-column]") as HTMLElement | null;
    const column = columnElement?.dataset.boardColumn;
    return column === "todo" || column === "inProgress" || column === "done" ? column : null;
  }

  function dropNote(column: BoardColumn, noteId: string | null) {
    if (!noteId) return;
    onUpdateNote(noteId, { column });
    setDragOverColumn(null);
    setDraggedNoteId(null);
    setDragPoint(null);
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {boardColumns.map((columnKey) => {
          const columnItem = copy.columns[columnKey];
          const columnNotes = notes.filter((note) => note.column === columnKey);
          return (
            <section
              key={columnKey}
              data-board-column={columnKey}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumn(columnKey);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragOverColumn(columnKey);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) setDragOverColumn(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const noteId = event.dataTransfer.getData("text/plain");
                dropNote(columnKey, noteId || draggedNoteId);
              }}
              className={`soft-card min-h-[34rem] rounded-2xl p-4 transition duration-200 ${
                dragOverColumn === columnKey ? "border-[#ff6b76]/55 bg-[#e11d2e]/10" : ""
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#fff7f7]">{columnItem.label}</h3>
                  <p className="mt-1 text-sm text-[#bfa4a7]">{columnItem.hint}</p>
                </div>
                <span className="rounded-full border border-[#ffb4bb]/12 bg-[#070506]/45 px-3 py-1 text-sm font800 text-[#ffb4bb]">
                  {columnNotes.length}
                </span>
              </div>

              <ColumnNoteComposer column={columnKey} onAddNote={onAddNote} onUpdateNote={onUpdateNote} copy={copy} />

              <div className="mt-4 space-y-3">
                {columnNotes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#ffb4bb]/18 bg-[#070506]/45 p-4 text-sm text-[#bfa4a7]">
                    {copy.emptyColumn}
                  </p>
                ) : (
                  columnNotes.map((note) => (
                    <BoardNoteCard
                      key={note.id}
                      note={note}
                      courses={courses}
                      tasks={tasks}
                      onStartDragging={setDraggedNoteId}
                      onDragPointer={(clientX, clientY) => {
                        setDragPoint({ x: clientX, y: clientY });
                        setDragOverColumn(getColumnFromPoint(clientX, clientY));
                      }}
                      onStopDragging={(clientX, clientY) => {
                        const column = clientX === undefined || clientY === undefined ? null : getColumnFromPoint(clientX, clientY);
                        if (column) dropNote(column, note.id);
                        setDraggedNoteId(null);
                        setDragPoint(null);
                        setDragOverColumn(null);
                      }}
                      onUpdateNote={onUpdateNote}
                      onDeleteNote={onDeleteNote}
                      copy={copy}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      {draggedNote && dragPoint ? (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-[#ff6b76]/55 bg-[#2a1518]/95 p-4 shadow-2xl shadow-black/50 transition-transform duration-75"
          style={{ left: dragPoint.x + 16, top: dragPoint.y + 16 }}
        >
          <p className="font-black text-[#fff7f7]">{draggedNote.title}</p>
          <p className="mt-2 line-clamp-3 text-sm text-[#d9c2c4]">{draggedNote.body}</p>
        </div>
      ) : null}
    </section>
  );
}

function ColumnNoteComposer({
  column,
  copy,
  onAddNote,
  onUpdateNote,
}: {
  column: BoardColumn;
  copy: typeof boardCopy.en;
  onAddNote: (note: Omit<BoardNote, "createdAt">) => void;
  onUpdateNote: (noteId: string, patch: Partial<BoardNote>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function autosave(nextTitle: string, nextBody: string) {
    if (!nextTitle.trim() && !nextBody.trim()) return;
    const nextNote = {
      title: nextTitle.trim() || copy.untitled,
      body: nextBody,
      column,
    };
    if (draftId) {
      onUpdateNote(draftId, nextNote);
      return;
    }
    const id = uniqueId("note");
    setDraftId(id);
    onAddNote({ id, ...nextNote });
  }

  function submit() {
    autosave(title, body);
    setTitle("");
    setBody("");
    setDraftId(null);
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-dashed border-[#ffb4bb]/22 bg-[#070506]/40 px-4 text-sm font800 text-[#d9c2c4] transition hover:border-[#ff6b76]/55 hover:bg-[#e11d2e]/10 hover:text-[#fff7f7]"
      >
        <span>{copy.addSticky}</span>
        <span className="text-lg text-[#ff6b76]">+</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#ff6b76]/28 bg-[#090506]/74 p-3 shadow-lg shadow-black/25">
      <input
        value={title}
        onChange={(event) => {
          const nextTitle = event.target.value;
          setTitle(nextTitle);
          autosave(nextTitle, body);
        }}
        placeholder={copy.noteTitle}
        className="field-dark h-10 w-full rounded-lg px-3 text-sm"
      />
      <textarea
        value={body}
        onChange={(event) => {
          const nextBody = event.target.value;
          setBody(nextBody);
          autosave(title, nextBody);
        }}
        placeholder={copy.details}
        rows={3}
        className="field-dark mt-2 w-full resize-none rounded-lg px-3 py-2 text-sm"
      />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={submit} className="ember-button h-9 rounded-lg px-3 text-xs font800">
          {copy.add}
        </button>
        <button type="button" onClick={() => setIsOpen(false)} className="ghost-button h-9 rounded-lg px-3 text-xs font800">
          {copy.cancel}
        </button>
      </div>
    </div>
  );
}

function BoardNoteCard({
  note,
  courses,
  tasks,
  copy,
  onStartDragging,
  onDragPointer,
  onStopDragging,
  onUpdateNote,
  onDeleteNote,
}: {
  note: BoardNote;
  courses: Course[];
  tasks: StudyTask[];
  copy: typeof boardCopy.en;
  onStartDragging: (noteId: string) => void;
  onDragPointer: (clientX: number, clientY: number) => void;
  onStopDragging: (clientX?: number, clientY?: number) => void;
  onUpdateNote: (noteId: string, patch: Partial<BoardNote>) => void;
  onDeleteNote: (noteId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const linkedCourse = courses.find((course) => course.id === note.linkedCourseId);
  const linkedTask = tasks.find((task) => task.id === note.linkedTaskId);
  const courseTasks = tasks
    .filter((task) => task.courseId && task.courseId === note.linkedCourseId)
    .slice(0, 12);

  return (
    <article
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (isEditing) return;
        if (target.closest("input, textarea, button, summary, details")) return;
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onStartDragging(note.id);
        onDragPointer(event.clientX, event.clientY);
        document.body.classList.add("is-dragging-note");
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        onDragPointer(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        document.body.classList.remove("is-dragging-note");
        onStopDragging(event.clientX, event.clientY);
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        document.body.classList.remove("is-dragging-note");
        onStopDragging();
      }}
      onDoubleClick={() => setIsEditing(true)}
      className="group animate-[note-land_180ms_ease-out] cursor-grab rounded-xl border border-[#ffb4bb]/14 bg-[#fff7f7]/8 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-[#ff6b76]/35 active:cursor-grabbing"
    >
      {isEditing ? (
        <>
          <input
            value={note.title}
            onChange={(event) => onUpdateNote(note.id, { title: event.target.value })}
            aria-label={copy.noteTitle}
            className="field-dark h-10 w-full rounded-lg px-3 text-base font-black"
          />
          <textarea
            value={note.body}
            onChange={(event) => onUpdateNote(note.id, { body: event.target.value })}
            aria-label={copy.details}
            placeholder={copy.details}
            rows={3}
            className="field-dark mt-2 w-full resize-none rounded-lg px-3 py-2 text-sm leading-6"
          />
        </>
      ) : (
        <>
          <p className="text-base font-black text-[#fff7f7]">{note.title || copy.untitled}</p>
          <p className="mt-2 min-h-16 whitespace-pre-wrap text-sm leading-6 text-[#d9c2c4]">{note.body || copy.noDetails}</p>
        </>
      )}
      <details className="mt-3 rounded-lg border border-[#ffb4bb]/10 bg-[#070506]/38 px-3 py-2">
        <summary className="cursor-pointer select-none text-xs font800 text-[#ffb4bb]">
          {linkedTask ? `${copy.linkedTask}: ${linkedTask.title}` : linkedCourse ? `${copy.linkedCourse}: ${linkedCourse.name}` : copy.linkCourseTask}
        </summary>
        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={() => onUpdateNote(note.id, { linkedCourseId: undefined, linkedTaskId: undefined })}
            className={`rounded-lg px-3 py-1.5 text-xs font800 transition ${
              !note.linkedCourseId && !note.linkedTaskId ? "bg-[#e11d2e] text-white" : "bg-[#090506] text-[#bfa4a7] hover:text-white"
            }`}
          >
            {copy.noLink}
          </button>
          <div>
            <p className="mb-2 text-[10px] font800 uppercase tracking-wide text-[#8f787b]">{copy.courses}</p>
            <div className="flex flex-wrap gap-2">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onUpdateNote(note.id, { linkedCourseId: course.id, linkedTaskId: undefined })}
                  className={`rounded-lg px-3 py-1.5 text-xs font800 transition ${
                    note.linkedCourseId === course.id && !note.linkedTaskId
                      ? "bg-[#e11d2e] text-white"
                      : "bg-[#090506] text-[#d9c2c4] hover:bg-[#e11d2e]/18 hover:text-white"
                  }`}
                >
                  {course.name}
                </button>
              ))}
            </div>
          </div>
          {note.linkedCourseId ? (
            <div>
              <p className="mb-2 text-[10px] font800 uppercase tracking-wide text-[#8f787b]">{copy.tasks}</p>
              <div className="app-scroll max-h-40 space-y-2 overflow-y-auto pr-1">
                {courseTasks.length === 0 ? (
                  <p className="text-xs text-[#8f787b]">{copy.noTasksFound}</p>
                ) : (
                  courseTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onUpdateNote(note.id, { linkedCourseId: task.courseId ?? undefined, linkedTaskId: task.id })}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-xs font700 transition ${
                        note.linkedTaskId === task.id
                          ? "bg-[#e11d2e] text-white"
                          : "bg-[#090506] text-[#d9c2c4] hover:bg-[#e11d2e]/18 hover:text-white"
                      }`}
                    >
                      {task.title}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </details>
      <div className="mt-3 flex items-center justify-end gap-2">
        {isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-lg px-3 py-1.5 text-xs font800 text-[#bfa4a7] transition hover:bg-[#e11d2e]/15 hover:text-[#fff7f7]"
          >
            {copy.done}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDeleteNote(note.id)}
          aria-label={copy.removeNote}
          title={copy.removeNote}
          className="grid h-8 w-8 place-items-center rounded-lg text-[#bfa4a7] opacity-0 transition hover:bg-[#e11d2e]/15 hover:text-[#fff7f7] group-hover:opacity-100 focus:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M6 7h12" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M8 7l1 13h6l1-13" />
            <path d="M10 7V5h4v2" />
          </svg>
        </button>
      </div>
    </article>
  );
}
