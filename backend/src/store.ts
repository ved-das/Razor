import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { seedData } from "../../lib/seedData";
import type { StudyState } from "../../lib/types";
import { prisma } from "./db";

const statePath = join(process.cwd(), "backend", "data", "razor-state.json");

export async function readState(): Promise<StudyState> {
  try {
    const raw = await readFile(statePath, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return cloneState(seedData);
  }
}

export async function writeState(state: StudyState): Promise<StudyState> {
  const normalized = normalizeState(state);
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export async function readUserState(userId: string): Promise<StudyState> {
  const stored = await prisma.userState.findUnique({ where: { userId } });
  if (!stored) return cloneState(seedData);

  try {
    return normalizeState(JSON.parse(stored.dataJson));
  } catch {
    return cloneState(seedData);
  }
}

export async function writeUserState(userId: string, state: StudyState): Promise<StudyState> {
  const normalized = normalizeState(state);
  await prisma.userState.upsert({
    where: { userId },
    update: { dataJson: JSON.stringify(normalized) },
    create: { userId, dataJson: JSON.stringify(normalized) },
  });
  return normalized;
}

export function normalizeState(value: unknown): StudyState {
  if (!isRecord(value)) return cloneState(seedData);

  return {
    courses: Array.isArray(value.courses) ? value.courses.map((course) => ({ ...course })) as StudyState["courses"] : [],
    tasks: Array.isArray(value.tasks) ? value.tasks.map((task) => ({ ...task })) as StudyState["tasks"] : [],
    boardNotes: Array.isArray(value.boardNotes) ? value.boardNotes.map((note) => ({ ...note })) as StudyState["boardNotes"] : [],
    settings: isRecord(value.settings) ? { ...value.settings } as StudyState["settings"] : seedData.settings,
    profile: isRecord(value.profile) ? { ...value.profile } as StudyState["profile"] : { name: "", birthday: "", institution: "" },
  };
}

function cloneState(state: StudyState): StudyState {
  return JSON.parse(JSON.stringify(state)) as StudyState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
