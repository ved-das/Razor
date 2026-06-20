# Razor

![Razor wordmark](public/razor-text-transparent.png)

Razor is a study planning cockpit for courses, deadlines, lectures, practice, revision, daily workload, and adaptive scheduling.

The app starts fresh for every new user. It does not ship with a personal study plan, personal profile, or private course schedule.

## Setup

Install dependencies:

```bash
npm install
```

Start the web app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

Build the web app:

```bash
npm run build
```

## Desktop App

Razor includes a Tauri wrapper in `src-tauri/`, so the same Next.js app can run as a Windows desktop app.

Run the desktop app in development:

```bash
npm run desktop:dev
```

Build the desktop installer:

```bash
npm run desktop:build
```

The built app is created under `src-tauri/target/release/bundle/`.

## Backend API

Razor includes a production foundation in `backend/`. The backend uses Node, Prisma, JWT auth, and the same planner engine used by the frontend.

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

Prepare the local database:

```bash
npm run db:generate
npm run db:push
```

## Features

- Fresh local-first workspace with `localStorage` persistence
- Course and task management
- Priority-aware planner
- Course prerequisites
- Optional target finish dates and exam dates
- Custom task deadlines
- Daily study cap
- Holidays and restricted-hour days
- Automatic replanning for unfinished work
- Late-night study-day extension prompt
- Calendar, task list, cockpit dashboard, and board views
- Sticky notes with linked courses or tasks
- Themes: Razor, Bia Bee, and Tofu
- Languages: English, German, Polish, and Italian
- Full reset to clear local user data

## Planner Logic

The planner generates a schedule from the user’s own courses and tasks. It considers:

- Remaining workload
- Daily available hours
- Target finish dates
- Optional exam dates
- Course priority
- Manual course planning order
- Task planning order
- Prerequisites
- Custom task deadlines
- Holidays and restricted days
- Revision and mock windows close to exams

The app avoids silently creating impossible plans. When the workload cannot fit inside the selected capacity and deadlines, it warns the user and suggests the smallest practical daily cap increase.

## Data Model

Razor stores dates internally as `YYYY-MM-DD` and displays them as `DD.MM.YYYY`.

First-run app state is intentionally empty:

- No courses
- No tasks
- No profile name
- No institution
- No private seeded schedule

Users create their own courses, tasks, deadlines, preferences, and board notes inside the app.

## Roadmap

- Hosted account sync
- Team/class templates
- Calendar import and export
- More language packs
- Signed installers
- Cloud backup
- Public onboarding templates without personal data
