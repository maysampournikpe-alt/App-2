# Rumbo

A free, bilingual (English and Spanish) app that helps middle and high school students in the
Rio Grande Valley find opportunities, build skills, study better, and reach their goals.
Built for the 2026 Congressional App Challenge.

See [PLAN.md](PLAN.md) for the full phased plan.

## What works today

- **Find**: ask in plain language ("free summer coding camp near McAllen"). Rumbo searches real
  websites and shows result cards with cost, deadline, who can apply, how to apply, and a link to the
  source page. Every confirmed card links to a page the search actually visited; anything else is
  labeled "Not a confirmed listing" with a sample email and phone script. Scam warnings, a Free
  filter, distance from a bundled Texas city/ZIP table, and "My Saved" (works offline).
- **For You**: recommendations ranked from results the student has already seen (free and nearby
  first), with "Because you like ...", "More like this", "Not interested", and reset.
- **Coach**: streamed AI chat with homework mode (teaches with guiding questions), mock interview,
  debate, and quiz modes.
- **Plan**: turns a goal into week / month / year steps with a progress bar; "change my plan" keeps
  finished steps.
- **Profile and onboarding**: nickname, birth month and year, grade, language, interests.
  Students under 13 are guest-only (no account, no email).
- **Accounts and sync** (Supabase): Email-link sign-in (no password); everything saved on the device
  is copied to the account and synced across devices (newest change wins).
- **Offline tools** that save on the device: GPA calculator (weighted, unweighted, what-if), final
  exam calculator, Pomodoro timer with weekly chart, homework tracker, backward planner.
- **Safety**: serious topics (self-harm, abuse, danger) skip the AI and show crisis and
  trusted-adult guidance in both languages; adult topics are filtered from results.
- English and Spanish on every page, light and dark mode, large text, dyslexia-friendly font,
  reduce motion, low data mode, installable PWA, "Download my data".
- Plain-language Privacy and "How the AI works" pages.

## Tools and languages

TypeScript, React 19, Next.js 16 (App Router), Tailwind CSS 4, Dexie (IndexedDB), Serwist (service
worker), Zod, Vitest, Supabase (auth, Postgres with Row Level Security), Groq API (web-search model
and chat model; model names live only in `src/lib/ai/config.ts`), lucide-react icons, Lexend and
Atkinson Hyperlegible fonts. Languages: English and Spanish.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev                  # http://localhost:3000
```

Keys (all in `.env.local`, never committed): `GROQ_API_KEY` (server), `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Without Groq keys the AI features say they aren't turned on;
without Supabase keys the app runs guest-only. Run the SQL files in `supabase/migrations/` in order.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
The service worker is turned off in `npm run dev`; use `npm run build && npm start` to test offline mode.

## How the code is organized

- `src/lib/features.ts`: every tab and tool. Set `built: true` to make one appear in the menu.
- `src/i18n/en.ts`, `src/i18n/es.ts`: all text. Add a language by adding a file and registering it in `src/i18n/index.ts`.
- `src/lib/local-store.ts`: shared on-device storage for offline tools (ready for account sync).
- `src/lib/finder/`: search, source checking, scam and safety checks, place table (all tested).
- `src/lib/ai/`: provider client and model config. `src/app/api/{find,coach,plan}`: server-only AI routes.
- `src/lib/sync.ts`: account sync. `supabase/migrations/`: tables and access rules.
- `src/lib/tools/`: the math behind each tool, with tests.
- `src/components/tools/`: one component per tool.

## Deploy on Cloudflare Workers

Uses the OpenNext Cloudflare adapter (`wrangler.jsonc`, `open-next.config.ts`).

```bash
npx wrangler login
# Public values are baked in at build time, so have them in .env.local (or build variables) first:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put GROQ_API_KEY      # server secret, asks for the value
npm run cf:preview                        # test locally in the Workers runtime
npm run cf:deploy                         # build and publish; prints your *.workers.dev URL
```

Then add `https://<your-worker>.workers.dev/auth/callback` to Supabase (Authentication → URL
Configuration). Notes: `scripts/cf-copy-sw.mjs` copies the service worker
into the static assets; `patches/` fixes the adapter for Next 16.4 (applied on `npm install`);
`stubs/esbuild-wasm` keeps a build-only tool out of the Worker (it stays under the 3 MiB free-plan limit).
Rate limits and the search cache are per Worker instance until they move to Supabase.
