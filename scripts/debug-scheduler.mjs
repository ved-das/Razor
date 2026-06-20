import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

mkdirSync(".tmp/scheduler-debug", { recursive: true });

const tscArgs = [
  "--outDir",
  ".tmp/scheduler-debug",
  "--module",
  "NodeNext",
  "--moduleResolution",
  "NodeNext",
  "--target",
  "ES2022",
  "--skipLibCheck",
  "lib/autoScheduler.ts",
  "lib/schedule.ts",
  "lib/seedData.ts",
  "lib/types.ts",
];

if (process.platform === "win32") {
  execFileSync("cmd.exe", ["/c", "node_modules\\.bin\\tsc.cmd", ...tscArgs], { stdio: "inherit" });
} else {
  execFileSync("node_modules/.bin/tsc", tscArgs, { stdio: "inherit" });
}

const [{ debugSchedulerTrace }, { seedData }] = await Promise.all([
  import(pathToFileURL(`${process.cwd()}/.tmp/scheduler-debug/autoScheduler.js`)),
  import(pathToFileURL(`${process.cwd()}/.tmp/scheduler-debug/seedData.js`)),
]);

const trace = debugSchedulerTrace(
  {
    ...seedData,
    settings: {
      ...seedData.settings,
      startDate: "2026-06-15",
    },
  },
  { today: "2026-06-15", maxDailyHours: 8, ignoreTodayClock: true },
);

writeFileSync(".tmp/scheduler-debug/trace.json", `${JSON.stringify(trace, null, 2)}\n`);
console.log("Scheduler debug trace written to .tmp/scheduler-debug/trace.json");
