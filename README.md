# Razor

![Razor wordmark](public/razor-text-transparent.png)

Razor is a local-first personal study tracker for exam prep, lecture progress, revision, practice, and daily workload planning.

It is local-first for v1, with a backend foundation you can enable:

- Desktop/offline state still works through `localStorage`
- A Node API service can store state server-side and run the same planner engine
- No production authentication or hosted database yet
- No calendar sync yet

## Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

Build for production:

```bash
npm run build
```

## Backend API

Razor includes a backend foundation in `backend/`. It uses Node's built-in HTTP server, Prisma, JWT authentication, and the same scheduling engine as the app. It can run unauthenticated for local development, or store per-user synced state when auth is enabled.

Build the backend:

```bash
npm run backend:build
```

Start the backend:

```bash
npm run backend:start
```

Default URL:

```text
http://127.0.0.1:8787
```

Current endpoints:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/state`
- `PUT /api/state`
- `POST /api/planner/generate`

Backend production notes:

- Set a long random `JWT_SECRET` before using auth
- Set `DATABASE_URL` for the target database
- Set `CORS_ORIGIN` to the frontend origin in hosted builds
- Request bodies are limited by `MAX_BODY_BYTES`
- Auth endpoints include basic request throttling
- API responses include JSON validation errors and security headers

Prepare the local database:

```bash
npm run db:generate
npm run db:push
```

## Desktop App

Razor includes a Tauri wrapper in `src-tauri/`, so the same Next.js UI can run as a native desktop app.

Windows prerequisites:

- Microsoft C++ Build Tools with "Desktop development with C++"
- Rust with the MSVC toolchain
- Microsoft Edge WebView2 Runtime, usually already installed on Windows 10/11

Run the desktop app in development:

```bash
npm run desktop:dev
```

Build the Windows desktop app:

```bash
npm run desktop:build
```

The built app will be created under `src-tauri/target/release/bundle/` after the native prerequisites are installed.

## Features

- Desktop-style dashboard UI with mobile-friendly stacking
- Subject input form for lectures, completed progress, hours per lecture, priorities, dependencies, and deadline or exam date
- Adaptive calendar scheduler with month navigation
- Auto-plan mode that regenerates unfinished future work when progress changes
- Daily workload cap used by the scheduling engine
- Today view with planned, completed, remaining, and overdue task separation
- Course cards with exam date, lecture totals, remaining lecture hours, progress, priority, dependencies, and revision status
- Priority-aware planning:
  - High priority: scheduled first when deadlines compete, aims to finish 4 days before the finish date
  - Medium priority: normal scheduling, aims to finish 2 days before the finish date
  - Low priority: flexible scheduling, uses the finish date directly
- Full daily planner grouped by date
- Task completion checkboxes
- Automatic daily workload risk:
  - 0-5 hours: Low
  - 5-8 hours: Medium
  - 8-10 hours: High
  - 10+ hours: Critical
- Automatic course progress calculation
- Automatic lecture, revision, and mock-task generation for custom subjects
- Local persistence via `localStorage`
- Full reset button to clear the local workspace and start fresh

## Seeded Schedule

The app is seeded with the study plan starting on 14 June 2026.

Courses:

- Math 1: 27 lectures, 9 already complete, no exam, no revision required, finish by 19 June 2026
- Math 2: 27 lectures, depends on Math 1, exam on 10 July 2026, finish lectures by 3 July 2026
- Python 1: 11 lectures, exam on 15 July 2026, finish lectures by 3 July 2026
- Intro to AI: 10 lectures, exam on 15 July 2026, finish lectures by 3 July 2026
- Statistics AI: 14 lectures, exam on 24 October 2026, finish lectures by 30 September 2026
- ADS 1: 12 lectures, no exam, finish by 15 October 2026

The June-July schedule follows the five requested phases:

- Phase 1: Finish Math 1 while starting Python 1 and Intro to AI lightly
- Phase 2: Start Math 2 and continue Python/Intro AI lectures with daily coding
- Phase 3: Finish Math 2, Python 1, and Intro to AI lectures
- Phase 4: Revise Math 2 and continue Python coding
- Phase 5: Final Python 1 and Intro to AI revision

After the July exams:

- Statistics AI is scheduled at two lectures per week from 16 July to 31 August, then revision through October
- ADS 1 is scheduled from July through mid October, with each lecture including a short summary and Python implementation

Lecture tasks update course progress automatically. A task named `Math 1 L10-L12` counts as three lectures, while `Math 2 L27` counts as one lecture. Unchecking a completed lecture task subtracts the same count.

## Future V2 Ideas

- Editable tasks and courses
- A weekly workload heatmap
- Smart rescheduling suggestions
- Import/export JSON
- Keyboard shortcuts
- Desktop polish and installer signing
- Calendar export without requiring account sync
