"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  CircleHelp,
  Copy,
  ExternalLink,
  HeartHandshake,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
} from "lucide-react";
import { useLocale, useMessages } from "@/i18n/client";
import { stripMeta, useCollection, useLocalValue, type WithId } from "@/lib/local-store";
import { rememberResults } from "@/lib/foryou-store";
import { ageGroupFor } from "@/lib/profile";
import { useProfile } from "@/lib/use-profile";
import { lookupPlace, nearestPlace } from "@/lib/finder/geo";
import {
  categories,
  type Category,
  type FindRequest,
  type FindResponse,
  type Opportunity,
  type SafetyKind,
} from "@/lib/finder/types";
import { PageHeader, Section } from "@/components/ui";

const SAVED = "saved-opportunities";
const FINDER = "finder";

type Place = { label: string; lat: number; lng: number };
type Filters = { freeOnly: boolean; onlineOnly: boolean; nearOnly: boolean; confirmedOnly: boolean };
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; code: keyof ReturnType<typeof useMessages>["finder"]["errors"] }
  | { kind: "safety"; safety: SafetyKind }
  | { kind: "done"; results: Opportunity[]; sources: { title: string; url: string }[]; cached: boolean };

export function applyFilters(results: Opportunity[], f: Filters): Opportunity[] {
  return results.filter((r) => {
    if (f.freeOnly && r.cost !== "free") return false;
    if (f.onlineOnly && !r.online) return false;
    if (f.nearOnly && !r.online && (r.distanceMiles === null || r.distanceMiles > 25)) return false;
    if (f.confirmedOnly && !r.confirmed) return false;
    return true;
  });
}

export function OpportunityFinder() {
  const m = useMessages();
  const f = m.finder;
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "any">("any");
  const [place, setPlace] = useState<Place | null>(null);
  const [placeText, setPlaceText] = useState("");
  const [placeMsg, setPlaceMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const [filters, setFilters] = useState<Filters>({ freeOnly: false, onlineOnly: false, nearOnly: false, confirmedOnly: false });
  const [state, setState] = useState<State>({ kind: "idle" });
  const { profile } = useProfile();
  const saved = useCollection<Opportunity>(SAVED);
  const stored = useLocalValue<{ place: Place | null }>(FINDER, "settings", { place: null });
  const [hydrated, setHydrated] = useState(false);

  // Adopt the remembered place once it loads from this device.
  if (stored.loaded && !hydrated) {
    setHydrated(true);
    if (stored.value.place && !place) {
      setPlace(stored.value.place);
      setPlaceText(stored.value.place.label);
    }
  }

  const choosePlace = (p: Place | null) => {
    setPlace(p);
    void stored.save({ place: p });
  };

  const setPlaceFromText = () => {
    const found = lookupPlace(placeText);
    if (!found) {
      setPlaceMsg(f.locationUnknown);
      return;
    }
    setPlaceMsg("");
    setPlaceText(found.name);
    choosePlace({ label: found.name, lat: found.lat, lng: found.lng });
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setPlaceMsg(f.locationDenied);
      return;
    }
    setLocating(true);
    setPlaceMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Only the nearest bundled city is kept; the exact coordinates are dropped.
        const { place: near } = nearestPlace({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPlaceText(near.name);
        choosePlace({ label: near.name, lat: near.lat, lng: near.lng });
        setLocating(false);
      },
      () => {
        setPlaceMsg(f.locationDenied);
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const search = async (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      setState({ kind: "error", code: "badRequest" });
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState({ kind: "error", code: "offline" });
      return;
    }
    setState({ kind: "loading" });
    const body: FindRequest = { query: q, category, language: locale, ageGroup: ageGroupFor(profile.birthMonth, profile.birthYear), interests: profile.interests.slice(0, 10), location: place };
    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as FindResponse;
      if (data.status === "ok") {
        setState({ kind: "done", results: data.results, sources: data.sources, cached: data.cached });
        void rememberResults(data.results, q);
      }
      else if (data.status === "safety") setState({ kind: "safety", safety: data.kind });
      else setState({ kind: "error", code: data.code });
    } catch {
      setState({ kind: "error", code: navigator.onLine ? "failed" : "offline" });
    }
  };

  // A link like /find?q=free+camps (from For You) fills the box and searches once.
  const startQuery = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("q");
  useEffect(() => {
    if (!startQuery || !stored.loaded) return;
    void Promise.resolve().then(() => {
      setQuery(startQuery);
      void search(startQuery);
    });
    // Run once, after the remembered place has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored.loaded]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void search(query);
  };

  const savedIds = useMemo(() => new Set((saved.items ?? []).map((s) => s.id)), [saved.items]);
  const toggleSave = (o: Opportunity) => {
    if (savedIds.has(o.id)) void saved.remove(o.id);
    else void saved.put(o.id, o);
  };

  const shown = state.kind === "done" ? applyFilters(state.results, filters) : [];
  const savedList = (saved.items ?? []).slice().sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      <PageHeader title={f.greeting} intro={f.intro} />

      <form onSubmit={onSubmit} className="panel space-y-4">
        <div>
          <label htmlFor="finder-query" className="label">
            {f.queryLabel}
          </label>
          <input
            id="finder-query"
            className="field"
            value={query}
            maxLength={300}
            placeholder={f.queryPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <ul className="mt-2 flex flex-wrap gap-2" aria-label={f.examples.join(", ")}>
            {f.examples.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  className="btn-secondary min-h-9 px-3 py-1 text-sm"
                  onClick={() => {
                    setQuery(ex);
                    void search(ex);
                  }}
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <fieldset>
          <legend className="label">{f.categoryLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {(["any", ...categories] as const).map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="finder-category"
                  className="peer sr-only"
                  checked={category === c}
                  onChange={() => setCategory(c)}
                />
                <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface px-3 text-sm peer-checked:border-river peer-checked:bg-river-soft peer-checked:font-bold peer-checked:text-river peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                  {f.categories[c]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">{f.locationHeading}</legend>
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-48 flex-1">
              <label htmlFor="finder-place" className="sr-only">
                {f.locationLabel}
              </label>
              <input
                id="finder-place"
                className="field"
                value={placeText}
                placeholder={f.locationPlaceholder}
                onChange={(e) => setPlaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setPlaceFromText();
                  }
                }}
                onBlur={() => placeText.trim() && placeText !== place?.label && setPlaceFromText()}
                aria-describedby="finder-place-help"
                autoComplete="postal-code"
              />
            </div>
            <button type="button" className="btn-secondary" onClick={useMyLocation} disabled={locating}>
              {locating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="size-4" aria-hidden="true" />}
              {locating ? f.locating : f.useMyLocation}
            </button>
          </div>
          <p id="finder-place-help" className="help flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {place ? f.locationSet(place.label) : f.noLocation} {f.locationPrivacy}
          </p>
          <p role="alert" className="min-h-0 text-sm font-bold text-danger">
            {placeMsg}
          </p>
        </fieldset>

        <button type="submit" className="btn-primary" disabled={state.kind === "loading"}>
          {state.kind === "loading" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Search className="size-5" aria-hidden="true" />}
          {f.search}
        </button>
      </form>

      <div className="mt-6" aria-live="polite">
        {state.kind === "loading" && (
          <p className="panel flex items-center gap-3" role="status">
            <Loader2 className="size-5 shrink-0 animate-spin text-river" aria-hidden="true" />
            <span>
              <span className="block font-bold">{f.searching}</span>
              <span className="text-sm text-ink-soft">{f.searchingHelp}</span>
            </span>
          </p>
        )}

        {state.kind === "error" && (
          <p role="alert" className="panel border-danger font-bold text-danger">
            {f.errors[state.code]}
          </p>
        )}

        {state.kind === "safety" && <SafetyCard kind={state.safety} onBack={() => setState({ kind: "idle" })} />}

        {state.kind === "done" && (
          <>
            <fieldset className="mb-4">
              <legend className="label">{f.filtersHeading}</legend>
              <div className="flex flex-wrap gap-2">
                <FilterChip checked={filters.freeOnly} onChange={(v) => setFilters({ ...filters, freeOnly: v })} label={f.freeOnly} strong />
                <FilterChip checked={filters.onlineOnly} onChange={(v) => setFilters({ ...filters, onlineOnly: v })} label={f.onlineOnly} />
                <FilterChip checked={filters.nearOnly} onChange={(v) => setFilters({ ...filters, nearOnly: v })} label={f.nearOnly} />
                <FilterChip checked={filters.confirmedOnly} onChange={(v) => setFilters({ ...filters, confirmedOnly: v })} label={f.confirmedOnly} />
              </div>
            </fieldset>
            <h2 className="sr-only">{f.resultsHeading}</h2>
            <p className="mb-3 font-bold" role="status">
              {f.resultsCount(state.results.length, shown.length)}
              {state.cached && <span className="ml-2 text-sm font-normal text-ink-soft">{f.cachedNote}</span>}
            </p>
            {state.results.length === 0 ? (
              <p className="panel">{f.noResults}</p>
            ) : shown.length === 0 ? (
              <p className="panel">{f.noneMatchFilters}</p>
            ) : (
              <ul className="space-y-4">
                {shown.map((o) => (
                  <li key={o.id}>
                    <OpportunityCard o={o} saved={savedIds.has(o.id)} onToggleSave={() => toggleSave(o)} />
                  </li>
                ))}
              </ul>
            )}
            {state.sources.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-bold">{f.sourcesHeading}</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {state.sources.map((s) => (
                    <li key={s.url} className="break-words">
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-river underline">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p className="help mt-4">{f.footnote}</p>
          </>
        )}
      </div>

      <div className="mt-10">
        <Section title={f.mySaved}>
          {saved.items === undefined ? null : savedList.length === 0 ? (
            <p className="text-ink-soft">{f.savedEmpty}</p>
          ) : (
            <>
              <p className="help mb-3">{f.savedOffline}</p>
              <ul className="space-y-4">
                {savedList.map((item) => {
                  const o = stripMeta(item as WithId<Opportunity>) as Opportunity;
                  return (
                    <li key={item.id}>
                      <OpportunityCard o={o} saved onToggleSave={() => toggleSave(o)} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Section>
      </div>
    </>
  );
}

function FilterChip({ checked, onChange, label, strong }: { checked: boolean; onChange: (v: boolean) => void; label: string; strong?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={`inline-flex min-h-10 items-center rounded-full border px-4 peer-checked:border-river peer-checked:bg-river peer-checked:text-on-river peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
          strong ? "border-river font-bold text-river" : "border-line bg-surface"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

export function SafetyCard({ kind, onBack }: { kind: SafetyKind; onBack: () => void }) {
  const f = useMessages().finder.safety;
  const s = f[kind];
  return (
    <section role="alert" className="panel border-river bg-river-soft">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <HeartHandshake className="size-6 shrink-0 text-river" aria-hidden="true" />
        {s.title}
      </h2>
      <p className="mt-2">{s.body}</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        {s.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <button type="button" className="btn-secondary mt-4" onClick={onBack}>
        {f.back}
      </button>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  const f = useMessages().finder;
  return (
    <div>
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd className={value ? "break-words" : "text-ink-soft italic"}>{value ?? f.notListed}</dd>
    </div>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const f = useMessages().finder;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the text is still selectable on screen.
    }
  };
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold">{label}</h4>
        <button type="button" className="btn-quiet min-h-9" onClick={copy}>
          <Copy className="size-4" aria-hidden="true" />
          {copied ? f.copied : f.copy}
        </button>
      </div>
      <p className="mt-1 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export function OpportunityCard({ o, saved, onToggleSave }: { o: Opportunity; saved: boolean; onToggleSave: () => void }) {
  const f = useMessages().finder;
  const where = o.online ? f.online : o.city;
  const costText = o.cost === "free" ? f.freeBadge : o.cost === "paid" ? f.paidBadge : f.costUnknown;
  return (
    <article className={`panel ${o.confirmed ? "" : "border-dashed"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-soft">{f.categories[o.category]}</p>
          <h3 className="text-xl font-bold break-words">{o.title}</h3>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? f.unsaveLabel(o.title) : f.saveLabel(o.title)}
          title={saved ? f.saved : f.save}
        >
          {saved ? <BookmarkCheck className="size-6 text-river" aria-hidden="true" /> : <Bookmark className="size-6" aria-hidden="true" />}
        </button>
      </div>

      <p className="mt-2 flex flex-wrap gap-2 text-sm font-bold">
        <span
          className={`rounded-full px-3 py-1 ${o.cost === "free" ? "bg-river text-on-river" : "border border-line bg-surface-2"}`}
        >
          {costText}
        </span>
        {where && <span className="rounded-full border border-line px-3 py-1">{where}</span>}
        {o.distanceMiles !== null && !o.online && <span className="rounded-full border border-line px-3 py-1">{f.miles(o.distanceMiles)}</span>}
      </p>

      <p className="mt-3">{o.summary}</p>

      {o.whyFits && (
        <p className="mt-3 rounded-xl bg-river-soft p-3">
          <span className="font-bold text-river">{f.whyFits}: </span>
          {o.whyFits}
        </p>
      )}

      {o.scamFlags.length > 0 && (
        <div role="note" className="mt-3 rounded-xl border-2 border-danger p-3">
          <p className="flex items-center gap-2 font-bold text-danger">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            {f.scamTitle}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {o.scamFlags.map((flag) => (
              <li key={flag}>{f.scamFlags[flag]}</li>
            ))}
          </ul>
          <p className="help">{f.scamHelp}</p>
        </div>
      )}

      {o.confirmed ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={f.fields.organization} value={o.organization} />
          <Field label={f.fields.deadline} value={o.deadline} />
          <Field label={f.fields.cost} value={o.cost === "unknown" ? null : [costText, o.costNote].filter(Boolean).join(". ")} />
          <Field label={f.fields.eligibility} value={o.eligibility} />
          <Field label={f.fields.howToApply} value={o.howToApply} />
          <Field label={f.fields.contact} value={[o.email, o.phone].filter(Boolean).join(" · ") || null} />
        </dl>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-line p-3">
          <p className="flex items-center gap-2 font-bold">
            <CircleHelp className="size-5 shrink-0 text-ruby" aria-hidden="true" />
            {f.unconfirmedTitle}
          </p>
          <p className="mt-1 text-ink-soft">{f.unconfirmedBody}</p>
          {o.organization && <p className="mt-2 font-bold">{o.organization}</p>}
          {o.outreachEmail && <CopyBlock label={f.sampleEmail} text={o.outreachEmail} />}
          {o.phoneScript && <CopyBlock label={f.samplePhone} text={o.phoneScript} />}
        </div>
      )}

      {o.sourceUrl && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <ExternalLink className="size-4" aria-hidden="true" />
            {f.viewSource}
          </a>
          {o.sourceHost && <span className="text-sm text-ink-soft break-all">{f.sourceFrom(o.sourceHost)}</span>}
        </p>
      )}
    </article>
  );
}
