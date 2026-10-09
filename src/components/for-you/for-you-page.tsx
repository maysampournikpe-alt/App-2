"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { stripMeta, useCollection, type WithId } from "@/lib/local-store";
import { builtTabs } from "@/lib/features";
import { FEEDBACK, SEEN, buildFeed, suggestTools, type Feedback, type Seen, type Verdict } from "@/lib/foryou";
import { goalTemplateIds } from "@/lib/plan";
import { useProfile } from "@/lib/use-profile";
import type { Opportunity } from "@/lib/finder/types";
import { OpportunityCard } from "@/components/tools/opportunity-finder";
import { PageHeader, Section, Status } from "@/components/ui";

const SAVED = "saved-opportunities";

export function ForYouPage() {
  const m = useMessages();
  const f = m.forYou;
  const { profile, loaded } = useProfile();
  const seen = useCollection<Seen>(SEEN);
  const feedback = useCollection<Feedback>(FEEDBACK);
  const saved = useCollection<Opportunity>(SAVED);
  const [note, setNote] = useState("");

  const labels = m.me.interests as Record<string, string>;
  const interests = useMemo(() => profile.interests.map((id) => ({ id, label: labels[id] ?? id })), [profile.interests, labels]);
  const verdicts = useMemo(() => Object.fromEntries((feedback.items ?? []).map((i) => [i.id, i.verdict])) as Record<string, Verdict>, [feedback.items]);
  const savedIds = useMemo(() => new Set((saved.items ?? []).map((s) => s.id)), [saved.items]);
  const feed = useMemo(() => buildFeed((seen.items ?? []).map((s) => stripMeta(s as WithId<Seen>) as Seen), verdicts, interests), [seen.items, verdicts, interests]);

  const tools = suggestTools(profile.grade)
    .map((t) => ({ ...t, tool: builtTabs.flatMap((tab) => tab.tools).find((x) => x.id === t.toolId) }))
    .filter((t) => t.tool);

  const ideas = interests.slice(0, 4);
  const goals = goalTemplateIds.slice(0, 4);

  async function reset() {
    if (!window.confirm(f.resetConfirm)) return;
    for (const item of feedback.items ?? []) await feedback.remove(item.id);
    setNote(f.resetDone);
  }

  const toggleSave = (o: Opportunity) => (savedIds.has(o.id) ? void saved.remove(o.id) : void saved.put(o.id, o));

  if (!loaded) return <PageHeader title={f.title} />;

  return (
    <>
      <PageHeader title={f.title} intro={f.intro} />

      {profile.interests.length === 0 && (
        <div className="panel mb-6 flex flex-wrap items-center justify-between gap-3">
          <p>{f.emptyProfile}</p>
          <Link href="/me" className="btn-primary">
            {f.setupProfile}
          </Link>
        </div>
      )}

      <Section title={f.oppsHeading}>
        {feed.length === 0 ? (
          <div className="panel">
            <p className="text-ink-soft">{f.oppsEmpty}</p>
            <Link href="/find" className="btn-secondary mt-3">
              {f.goFind}
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {feed.map((item) => {
              const liked = verdicts[item.id] === "liked";
              const reason =
                item.reason.type === "interest" ? f.because(item.reason.label) : item.reason.type === "query" ? f.becauseSearch(item.reason.label) : f.general;
              return (
                <li key={item.id}>
                  <p className="mb-1 text-sm font-bold text-river">{reason}</p>
                  <OpportunityCard o={item.opportunity} saved={savedIds.has(item.id)} onToggleSave={() => toggleSave(item.opportunity)} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary min-h-10" aria-pressed={liked} onClick={() => void feedback.put(item.id, { verdict: "liked" })}>
                      <ThumbsUp className="size-4" aria-hidden="true" />
                      {liked ? f.moreDone : f.more}
                    </button>
                    <button type="button" className="btn-secondary min-h-10" onClick={() => void feedback.put(item.id, { verdict: "notInterested" })}>
                      <ThumbsDown className="size-4" aria-hidden="true" />
                      {f.notInterested}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {ideas.length > 0 && (
        <Section title={f.ideasHeading}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ideas.map((i) => (
              <li key={i.id} className="panel flex flex-col justify-between gap-3">
                <div>
                  <p className="font-bold">{f.ideaQuery(i.label)}</p>
                  <p className="text-sm text-ink-soft">{f.ideaBecause(i.label)}</p>
                </div>
                <Link href={`/find?q=${encodeURIComponent(f.ideaQuery(i.label))}`} className="btn-secondary self-start">
                  {f.searchThis}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {tools.length > 0 && (
        <Section title={f.toolsHeading}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {tools.map(({ toolId, why, tool }) => {
              const Icon = tool!.icon;
              return (
                <li key={toolId}>
                  <Link href={tool!.href} className="group flex h-full gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-river">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-river-soft text-river">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-display text-lg font-bold group-hover:text-river">{m.tools[toolId].name}</span>
                      <span className="block text-ink-soft">{f.toolWhy[why]}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title={f.goalsHeading}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {goals.map((id) => (
            <li key={id} className="panel flex flex-col justify-between gap-3">
              <p className="font-bold">{m.plan.templates[id]}</p>
              <Link href={`/plan?goal=${id}`} className="btn-secondary self-start">
                {f.startGoal}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={f.resetHeading}>
        <button type="button" className="btn-secondary" onClick={reset}>
          {f.reset}
        </button>
        <Status>{note}</Status>
      </Section>
    </>
  );
}

