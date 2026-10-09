# Project Plan — "Pathfinder" (working name)

Congressional App Challenge 2026. Submission deadline: **Monday, October 26, 2026, 12:00 PM ET**.
Plan written October 9, 2026, which leaves **17 days**.

---

## 1. The honest reality check

Phase 1 alone is a full app: AI search with sources, an AI coach, an AI plan builder, profiles,
4 sign-in methods, guest mode with migration, cross-device sync, COPPA consent, 5 offline tools,
a recommendation feed, bilingual UI, PWA, accessibility, and a side menu system.

That is achievable in 17 days **only** if Phase 1 is the entire competition scope.
Phases 2–10 become the "future plans" section of the video. That is the plan below.

Rules I will follow:
- Every milestone ends with a deployed, working app. Nothing half-built is ever visible.
- Unfinished tabs are hidden by a feature registry, never shown empty.
- Code freeze **Thursday Oct 22**. After that: only bug fixes, video, and submission.
- Submit **Sunday Oct 25**, a day early. Submissions cannot be edited after the deadline.

---

## 2. Five better names

| Name | Why |
|---|---|
| **Camino** (recommended) | "Path" in Spanish; easy to say in both languages; fits the RGV audience; short app icon label. |
| **Rumbo** | Spanish for "heading/direction" ("¿Qué rumbo vas a tomar?"). Distinctive and memorable. |
| **Puente** | "Bridge" — the app bridges students to opportunities that big-city students find easily. |
| **Horizonte** | Same word idea in both languages ("horizon"); aspirational. |
| **Brújula** | "Compass." Strong meaning, but harder to spell for English-only users. |

The name lives in one config value, so changing it later is a one-line edit.

---

## 3. Tech decisions

| Area | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS | Server route handlers for all AI calls. |
| Hosting | Vercel (free tier) | Gives a public URL for judges and the video. |
| Database + auth | Supabase (Postgres + Auth), Row Level Security on every table | Policy: `user_id = auth.uid()`. |
| AI provider | Groq through one helper module `src/lib/ai/` | Model names live only in `src/lib/ai/config.ts`. |
| Web search model | `groq/compound` (multi-search) and `groq/compound-mini` (single search) | Returns the sources it used. |
| Chat model | Latest strong Groq chat model, currently expected to be an `openai/gpt-oss-120b`-class model | **To verify in the Groq console before coding** (the docs were not reachable from my environment). |
| Validation | `zod` schemas for every AI JSON response | Invalid → retry once → friendly error. |
| i18n | `next-intl`, message files `messages/en.json`, `messages/es.json` | Adding a language = adding one file + one registry line. |
| Local data | IndexedDB via `idb-keyval`/Dexie; small settings in localStorage | All wrapped so failures never crash a page. |
| PWA | `@serwist/next` service worker + web manifest | App shell and [LOCAL] tools fully offline. |
| Rate limiting | Postgres counters in Supabase (per user, per guest-IP hash, per day and per minute) | No extra paid service. |
| Icons | `lucide-react` | One icon per tab. |
| Fonts | Self-hosted; dyslexia-friendly option (Atkinson Hyperlegible or OpenDyslexic) | Self-hosting also helps low data mode. |

### How "never invent a listing" is enforced (in code, not just in the prompt)
1. Compound runs the web search and returns its answer **plus the list of URLs it actually visited**.
2. A second call to the chat model (JSON mode) turns that into result cards, using only that text.
3. The server checks every card's source URL against the list of URLs Compound actually returned.
   Cards whose URL is not in that list are **dropped** or downgraded to
   "Not a confirmed listing. Contact them first to ask."
4. Missing fields are shown as "Not listed, check with organizer," never guessed.
5. The scam check (money upfront, sensitive info requests, too-good-to-be-true pay) runs on each card
   and shows a warning badge.

### Cost control
- Search cache table keyed by `(normalized query, category, area = city or 3-digit ZIP, language)`,
  kept for 7 days. Shared across students; contains no personal data.
- For You reads from the cache and refreshes each (interest, area) about once a week.
- Per-student limits, for example 20 searches and 60 coach messages per day
  (guests: lower limits). Over the limit → "Try again in a minute."

---

## 4. Phase 1 build schedule (milestones)

Each milestone ends deployed and working. If a milestone runs late, the cut list in section 5 is used,
not the polish time.

### M0 — Foundation (Oct 9–11)
- Next.js + TypeScript + Tailwind project, deployed to Vercel.
- App shell: side menu with headings, collapse to icons on desktop, drawer on phones,
  bottom bar with 5 student-picked tabs + "More," tab search box, pin and hide tabs.
- Feature registry: one file lists every tab and tool with a `built` flag. Unbuilt ones are hidden
  everywhere (menu, search, bottom bar).
- English/Spanish toggle on every page; light/dark mode; large text; dyslexia font; low data mode.
- PWA manifest + service worker (installable, offline app shell).
- AI helper module, model config file, zod/retry wrapper, rate limiter, search cache table.
- Supabase project, base tables, RLS policies.
- Privacy page and transparency page (plain language, both languages).

### M1 — Starter tools [LOCAL] (Oct 11–13)
Grades: GPA calculator (weighted/unweighted, AP/IB/dual credit/honors, what-if mode), grade calculator.
Focus: Pomodoro (custom lengths, sound + vibration, daily minutes, weekly chart).
Homework: homework tracker, backward planner.
All built on one shared local-storage layer that later syncs. Fully offline.
These come first because they do not depend on AI, keys, or auth, so a working app exists early.

### M2 — Opportunity Finder (Oct 13–16) — the centerpiece of the video
- Greeting "What are you looking for today?", plain-language input.
- Location: browser permission, or city/ZIP entry. Distance from a bundled Texas ZIP/city table
  (no paid geocoding).
- Result cards with every field from 1.1, source links, "Why this fits you," scam badge,
  "Not a confirmed listing" cards with sample email and phone script.
- Filters, with **Free** shown prominently. Save to "My Saved."
- Domain prioritization for local searches (RGV city, county, ISD, .gov, .edu sites).
- Safety: age-appropriate filter, refusal + trusted-adult/counselor guidance for serious issues.

### M3 — Accounts, profile, onboarding (Oct 16–18)
- Google sign-in and email magic link (first); Microsoft next (see cut list); Apple last.
- Onboarding: birth month/year → grade → language → interest bubbles (3–10, custom, "Not sure yet" quiz).
- Under 13: stays in guest mode until a parent approves through an emailed consent link.
  No school email collected before consent.
- Guest mode banner; on sign-in, all device data moves into the account.
- Sync: local tools sync when online; the most recent change wins.
- Me tab: profile editing. Settings: sign out, sign out everywhere, download my data, delete account.

### M4 — Coach and Plan builder (Oct 18–20)
- Coach: streamed chat, homework mode that teaches step by step with guiding questions,
  practice modes (mock interview, debate opponent, quiz me), profile-aware, safety rules.
- Plan: goal + grade + hours/week → JSON plan with weekly/monthly/yearly milestones, checklist
  with progress bar, "adjust my plan," goal templates, links to saved/cached Finder results.

### M5 — For You (Oct 20–21)
Feed from cached Finder results + matching tools + goal templates + free courses, each with
"Because you like ___," Save / More like this / Not interested, free and nearby first,
reset recommendations.

### M6 — Polish and submission (Oct 22–25)
- **Oct 22 code freeze.** Bug bash on a real phone and slow-network mode, accessibility pass
  (keyboard, screen reader labels, contrast), Spanish copy review (ideally by a native speaker
  at home or school).
- Oct 23: demo data, final deploy, README with tools and languages used.
- Oct 24: record the demo video (1–3 minutes, public on YouTube or Vimeo).
- Oct 25: submit.

---

## 5. Cut list (if behind, cut in this order — top first)

1. Apple sign-in (needs a paid Apple Developer account, $99/year).
2. Microsoft sign-in (needs an Azure app registration; may be blocked by school IT anyway).
3. For You feed falls back to a simpler version: cached results + matching tools only.
4. Weekly study chart in the Pomodoro (keep the daily counter).
5. Goal templates reduced to 4.

Never cut: source links, the no-invented-listings check, safety basics, privacy page, Spanish,
offline local tools, guest mode.

---

## 6. Data model (Phase 1)

All tables have RLS: a student can only read and write rows where `user_id = auth.uid()`.

- `profiles` — nickname, birth_month, birth_year, grade, school (optional), language, interests[],
  skills[], goals[], settings JSON (theme, a11y, pinned/hidden tabs, bottom bar), consent_status.
- `parent_consents` — child user, parent email, token hash, status, timestamps.
- `saved_opportunities` — opportunity JSON snapshot, saved_at.
- `plans`, `plan_steps` — goal, milestones, checked state.
- `local_items` — generic synced store for [LOCAL] tools: `tool`, `item_id`, `data` JSON,
  `updated_at`, `deleted`. One table serves every local tool now and later.
- `search_cache` — shared, no personal data; written only by the server.
- `rate_limits` — server-only.
- `rec_feedback` — liked / not interested per recommendation.

---

## 7. Folder layout

```
src/
  app/[locale]/(tabs)/for-you, find, coach, plan, grades, focus, homework, me, settings …
  app/api/ai/find, coach, plan, recommend …       server-only AI routes
  components/shell/                               side menu, drawer, bottom bar, tab search
  components/tools/                               reusable [LOCAL] tool components
  lib/ai/config.ts                                model names (one place)
  lib/ai/client.ts                                provider wrapper, JSON + retry
  lib/local-store/                                IndexedDB layer + sync
  lib/features.ts                                 tab/tool registry with "built" flags
  lib/supabase/                                   clients (browser and server)
messages/en.json, messages/es.json
supabase/migrations/                              tables + RLS policies
```

---

## 8. Later phases (become "future plans" in the video unless time remains)

Phase 2 Family and school · Phase 3 Discovery and college/career · Phase 4 Study tools, AP and test
prep engine · Phase 5 Planning and life skills · Phase 6 People (safe, group-only) · Phase 7 Wellbeing ·
Phase 8 Local resources · Phase 9 Motivation · Phase 10 Extra accessibility.

The architecture is built so these are cheap later: the feature registry, the shared local-tool store,
the AI helper, and the config-driven exam engine design (one config file per exam).

---

## 9. What I need from you before coding

1. **Name** — Camino, one of the others, or keep Pathfinder?
2. **Groq API key** — created at console.groq.com. Please confirm the current recommended chat model
   in the console's Models page.
3. **Supabase project** — create a free project; I will need the project URL and anon key
   (public), and the service role key (server only, never committed).
4. **Vercel account** — for the public demo link.
5. **Google sign-in** — a Google Cloud OAuth client (I will give exact steps).
6. **Apple sign-in** — do you have a paid Apple Developer account? If not, I will skip it.
7. **Team** — solo, or teammates (the video must introduce everyone)?
8. **Email for parent consent** — OK to use a free transactional email service (for example Resend)?

Secrets go in `.env.local` (git-ignored) and in Vercel's environment settings, never in the repo.
