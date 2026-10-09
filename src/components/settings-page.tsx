"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Pin, PinOff } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { locales, localeList } from "@/i18n";
import { builtTabs, BOTTOM_BAR_MAX, type TabId } from "@/lib/features";
import { resetSettings, updateSettings, useSettings, type Theme } from "@/lib/settings";
import { clearAllLocalData } from "@/lib/local-store";
import { PageHeader, Section, Status, Switch } from "@/components/ui";

function Choice<T extends string>({
  legend,
  help,
  options,
  value,
  onChange,
}: {
  legend: string;
  help?: string;
  options: { value: T; label: string; lang?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="font-bold">{legend}</legend>
      {help && <p className="text-sm text-ink-soft">{help}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <div key={o.value}>
            <input
              type="radio"
              id={`${id}-${o.value}`}
              name={id}
              className="peer sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <label
              htmlFor={`${id}-${o.value}`}
              lang={o.lang}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 font-bold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] ${
                value === o.value ? "border-river bg-river text-on-river" : "border-line bg-surface hover:bg-surface-2"
              }`}
            >
              {o.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsPage() {
  const m = useMessages();
  const s = useSettings();
  const [cleared, setCleared] = useState(false);

  const toggleIn = (list: TabId[], id: TabId) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const bottomFull = s.bottomBar.length >= BOTTOM_BAR_MAX;
  // Settings itself can't be hidden, or there would be no way back.
  const menuTabs = builtTabs.filter((t) => t.id !== "settings");

  async function clearEverything() {
    if (!window.confirm(m.settings.clearDataConfirm)) return;
    await clearAllLocalData();
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
    resetSettings();
    setCleared(true);
  }

  return (
    <>
      <PageHeader title={m.settings.title} intro={m.tabIntros.settings} />

      <Section title={m.settings.language}>
        <Choice
          legend={m.settings.language}
          help={m.settings.languageHelp}
          value={s.locale}
          options={localeList.map((l) => ({ value: l, label: locales[l].messages.meta.languageName, lang: locales[l].htmlLang }))}
          onChange={(locale) => updateSettings({ locale })}
        />
      </Section>

      <Section title={m.settings.appearance}>
        <Choice<Theme>
          legend={m.settings.theme}
          value={s.theme}
          options={(["system", "light", "dark"] as Theme[]).map((t) => ({ value: t, label: m.settings.themes[t] }))}
          onChange={(theme) => updateSettings({ theme })}
        />
      </Section>

      <Section title={m.settings.accessibility}>
        <div className="divide-y divide-line">
          <Switch label={m.settings.largeText} help={m.settings.largeTextHelp} checked={s.largeText} onChange={(largeText) => updateSettings({ largeText })} />
          <Switch
            label={m.settings.dyslexiaFont}
            help={m.settings.dyslexiaFontHelp}
            checked={s.dyslexiaFont}
            onChange={(dyslexiaFont) => updateSettings({ dyslexiaFont })}
          />
          <Switch
            label={m.settings.reduceMotion}
            help={m.settings.reduceMotionHelp}
            checked={s.reduceMotion}
            onChange={(reduceMotion) => updateSettings({ reduceMotion })}
          />
          <Switch label={m.settings.lowData} help={m.settings.lowDataHelp} checked={s.lowData} onChange={(lowData) => updateSettings({ lowData })} />
        </div>
      </Section>

      <Section title={m.settings.menu}>
        <p className="-mt-1 mb-3 text-ink-soft">{m.settings.menuHelp}</p>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface px-4">
          {menuTabs.map((tab) => {
            const Icon = tab.icon;
            const name = m.tabs[tab.id];
            const pinned = s.pinned.includes(tab.id);
            const hidden = s.hidden.includes(tab.id);
            return (
              <li key={tab.id} className="flex items-center gap-3 py-2">
                <Icon className="size-5 shrink-0 text-river" aria-hidden="true" />
                <span className={`flex-1 font-bold ${hidden ? "text-ink-soft line-through" : ""}`}>
                  {name}
                  {hidden && <span className="sr-only"> ({m.settings.hidden})</span>}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={pinned}
                  disabled={hidden}
                  onClick={() => updateSettings({ pinned: toggleIn(s.pinned, tab.id) })}
                  aria-label={pinned ? m.settings.unpin(name) : m.settings.pin(name)}
                  title={pinned ? m.settings.unpin(name) : m.settings.pin(name)}
                >
                  {pinned ? <PinOff className="size-5" aria-hidden="true" /> : <Pin className="size-5" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={hidden}
                  onClick={() =>
                    updateSettings({
                      hidden: toggleIn(s.hidden, tab.id),
                      pinned: s.pinned.filter((x) => x !== tab.id),
                    })
                  }
                  aria-label={hidden ? m.settings.show(name) : m.settings.hide(name)}
                  title={hidden ? m.settings.show(name) : m.settings.hide(name)}
                >
                  {hidden ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={m.settings.bottomBar}>
        <fieldset>
          <legend className="-mt-1 mb-3 text-ink-soft">{m.settings.bottomBarHelp(BOTTOM_BAR_MAX)}</legend>
          <div className="flex flex-wrap gap-2">
            {builtTabs.map((tab) => {
              const checked = s.bottomBar.includes(tab.id);
              const disabled = !checked && bottomFull;
              return (
                <label
                  key={tab.id}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
                    checked ? "border-river bg-river-soft" : "border-line bg-surface"
                  } ${disabled ? "opacity-50" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--river)]"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => updateSettings({ bottomBar: toggleIn(s.bottomBar, tab.id) })}
                  />
                  {m.tabs[tab.id]}
                </label>
              );
            })}
          </div>
          {bottomFull && <p className="help mt-2">{m.settings.bottomBarFull(BOTTOM_BAR_MAX)}</p>}
        </fieldset>
      </Section>

      <Section title={m.settings.data}>
        <p className="-mt-1 mb-3 max-w-[62ch] text-ink-soft">{m.settings.dataHelp}</p>
        <button type="button" className="btn border border-danger text-danger hover:bg-ruby-soft" onClick={clearEverything}>
          {m.settings.clearData}
        </button>
        <Status>{cleared ? m.settings.cleared : null}</Status>
      </Section>
    </>
  );
}
