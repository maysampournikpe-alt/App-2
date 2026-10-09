"use client";

import { useState } from "react";
import { Download, Pencil } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { exportAllData } from "@/lib/local-store";
import { INTERESTS_MIN, isUnder13, type Profile } from "@/lib/profile";
import { useProfile } from "@/lib/use-profile";
import { useSettings } from "@/lib/settings";
import { PageHeader, Section, Status } from "@/components/ui";
import { AccountSection } from "./account";
import { InterestPicker, Onboarding } from "./onboarding";

export function MePage() {
  const m = useMessages();
  const settings = useSettings();
  const { profile, loaded, save } = useProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [note, setNote] = useState("");

  if (!loaded) return <PageHeader title={m.me.title} />;
  if (!profile.onboarded) return <Onboarding initial={profile} onDone={(p) => void save(p)} />;

  const labels = m.me.interests as Record<string, string>;
  const locked = isUnder13(profile.birthMonth, profile.birthYear);

  async function download() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, settings, tools: await exportAllData() }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rumbo-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title={profile.nickname || m.me.title} intro={m.me.intro} />

      <Section
        title={m.me.profileHeading}
        action={
          !editing && (
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                setDraft(profile);
                setEditing(true);
                setNote("");
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
              {m.me.editProfile}
            </button>
          )
        }
      >
        {editing ? (
          <form
            className="panel space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await save(draft);
              setEditing(false);
              setNote(m.me.savedProfile);
            }}
          >
            <div>
              <label htmlFor="nick" className="label">
                {m.me.onboarding.nicknameLabel}
              </label>
              <input id="nick" className="field" value={draft.nickname} maxLength={30} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} />
            </div>
            <div>
              <label htmlFor="grade" className="label">
                {m.me.onboarding.grade}
              </label>
              <select id="grade" className="field max-w-xs" value={draft.grade ?? 0} onChange={(e) => setDraft({ ...draft, grade: Number(e.target.value) })}>
                {Array.from({ length: 13 }, (_, g) => (
                  <option key={g} value={g}>
                    {m.me.onboarding.gradeName(g)}
                  </option>
                ))}
              </select>
            </div>
            <InterestPicker value={draft.interests} onChange={(interests) => setDraft({ ...draft, interests })} />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={draft.interests.length < INTERESTS_MIN}>
                {m.me.saveProfile}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                {m.common.cancel}
              </button>
            </div>
          </form>
        ) : (
          <div className="panel">
            {profile.grade !== null && <p className="font-bold">{m.me.gradeLine(profile.grade)}</p>}
            {profile.interests.length === 0 ? (
              <p className="text-ink-soft">{m.me.noInterests}</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {profile.interests.map((i) => (
                  <li key={i} className="rounded-full bg-river-soft px-3 py-1 font-bold text-river">
                    {labels[i] ?? i}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Status>{note}</Status>
      </Section>

      <AccountSection locked={locked} />

      <Section title={m.me.data.heading}>
        <div className="panel">
          <p className="mb-3 text-ink-soft">{m.me.data.downloadHelp}</p>
          <button type="button" className="btn-secondary" onClick={download}>
            <Download className="size-4" aria-hidden="true" />
            {m.me.data.download}
          </button>
        </div>
      </Section>
    </>
  );
}
