# Rumbo

A free, bilingual (English and Spanish) app that helps middle and high school students in the
Rio Grande Valley find opportunities, build skills, study better, and reach their goals.
Built for the 2026 Congressional App Challenge.

See [PLAN.md](PLAN.md) for the full phased plan.

## What works today

- Side menu with search, pinned and hidden tabs, collapse to icons (desktop), slide-out drawer
  and a customizable bottom bar (phones)
- English and Spanish on every page, light and dark mode, large text, dyslexia-friendly font,
  reduce motion, low data mode
- Installable PWA that works offline
- Offline tools that save on the device: GPA calculator (weighted, unweighted, what-if),
  final exam calculator, Pomodoro timer with weekly chart, homework tracker, backward planner
- Plain-language privacy page and "How the AI works" page

## Tools and languages

TypeScript, React, Next.js (App Router), Tailwind CSS, Dexie (IndexedDB), Serwist (service worker),
Vitest. Coming next: Supabase (accounts and database) and the Groq API (AI search and coaching).

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev                  # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
The service worker is turned off in `npm run dev`; use `npm run build && npm start` to test offline mode.

## How the code is organized

- `src/lib/features.ts`: every tab and tool. Set `built: true` to make one appear in the menu.
- `src/i18n/en.ts`, `src/i18n/es.ts`: all text. Add a language by adding a file and registering it in `src/i18n/index.ts`.
- `src/lib/local-store.ts`: shared on-device storage for offline tools (ready for account sync).
- `src/lib/tools/`: the math behind each tool, with tests.
- `src/components/tools/`: one component per tool.
