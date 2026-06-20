import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { autoPlanSchedule, plannerCapacityWarning } from "../../lib/autoScheduler";
import type { StudyState } from "../../lib/types";
import { createUser, loginUser, userFromAuthHeader } from "./auth";
import { normalizeState, readState, readUserState, writeState, writeUserState } from "./store";

const port = Number(process.env.PORT ?? 8787);
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES ?? 1_000_000);
const authWindowMs = 15 * 60 * 1000;
const authMaxAttempts = 25;
const authAttempts = new Map<string, { count: number; resetAt: number }>();

type GenerateBody = {
  state?: StudyState;
  options?: {
    today?: string;
    maxDailyHours?: number;
    endDate?: string;
    holidays?: string[];
    customStudyHours?: Array<{ date: string; hours: number }>;
    restrictedDays?: Array<{ date: string; maxHours: number }>;
    ignoreTodayClock?: boolean;
  };
};

type AuthBody = {
  email?: string;
  password?: string;
  name?: string;
};

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : errorStatus(error);
    sendJson(response, status, {
      error: status === 500 ? "Internal server error" : error instanceof Error ? error.message : "Request failed",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Razor API listening on http://127.0.0.1:${port}`);
});

async function route(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, app: "Razor" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/register") {
    throttleAuth(request);
    const body = await readJson<AuthBody>(request);
    const result = await createUser(requiredString(body.email, "Email"), requiredString(body.password, "Password"), body.name ?? "");
    sendJson(response, 201, result);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    throttleAuth(request);
    const body = await readJson<AuthBody>(request);
    const result = await loginUser(requiredString(body.email, "Email"), requiredString(body.password, "Password"));
    if (!result) {
      sendJson(response, 401, { error: "Invalid email or password." });
      return;
    }
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me") {
    const user = await userFromAuthHeader(request.headers.authorization);
    if (!user) {
      sendJson(response, 401, { error: "Authentication required." });
      return;
    }
    sendJson(response, 200, { user });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/state") {
    const user = await userFromAuthHeader(request.headers.authorization);
    sendJson(response, 200, { state: user ? await readUserState(user.id) : await readState(), user });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/state") {
    const user = await userFromAuthHeader(request.headers.authorization);
    const body = await readJson<StudyState>(request);
    sendJson(response, 200, { state: user ? await writeUserState(user.id, body) : await writeState(body), user });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/planner/generate") {
    const body = await readJson<GenerateBody>(request);
    const user = await userFromAuthHeader(request.headers.authorization);
    const state = normalizeState(body.state ?? (user ? await readUserState(user.id) : await readState()));
    const options = normalizeGenerateOptions(body, state);
    const plannedState = autoPlanSchedule(state, options);
    const warning = plannerCapacityWarning(state, options);
    sendJson(response, 200, { state: plannedState, warning });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function errorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isInteger(status) && status >= 400 && status < 600) return status;
  }
  return 500;
}

function normalizeGenerateOptions(body: GenerateBody, state: StudyState) {
  const settings = state.settings;
  const today = body.options?.today ?? new Date().toISOString().slice(0, 10);
  const maxDailyHours = clampNumber(body.options?.maxDailyHours ?? settings?.maxDailyHours ?? 8, 0.5, 24);

  return {
    today,
    maxDailyHours,
    endDate: body.options?.endDate ?? settings?.planEndDate,
    holidays: body.options?.holidays ?? settings?.holidays ?? [],
    customStudyHours: body.options?.customStudyHours ?? settings?.customStudyHours,
    restrictedDays: body.options?.restrictedDays ?? settings?.restrictedDays ?? [],
    ignoreTodayClock: body.options?.ignoreTodayClock,
  };
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxBodyBytes) {
      throw new HttpError(413, "Request body is too large.");
    }
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    ...corsHeaders(),
    ...securityHeaders(),
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendEmpty(response: ServerResponse, status: number) {
  response.writeHead(status, {
    ...corsHeaders(),
    ...securityHeaders(),
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  response.end();
}

function clampNumber(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
}

function requiredString(value: string | undefined, label: string) {
  if (!value?.trim()) {
    throw new HttpError(400, `${label} is required.`);
  }
  return value;
}

function throttleAuth(request: IncomingMessage) {
  const key = `${request.socket.remoteAddress ?? "unknown"}:${request.headers["user-agent"] ?? "unknown"}`;
  const now = Date.now();
  const bucket = authAttempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + authWindowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > authMaxAttempts) {
    throw new HttpError(429, "Too many authentication attempts. Try again later.");
  }
}

function corsHeaders() {
  const origin = process.env.CORS_ORIGIN?.trim() || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  };
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
