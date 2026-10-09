"use client";

import { useMemo } from "react";
import { emptyProfile, parseProfile, type Profile } from "@/lib/profile";
import { useLocalValue } from "@/lib/local-store";

export const PROFILE_TOOL = "profile";

export function useProfile() {
  const { value, save, loaded } = useLocalValue<Profile>(PROFILE_TOOL, "me", emptyProfile);
  const profile = useMemo(() => parseProfile(value), [value]);
  return { profile, loaded, save: (next: Profile) => save(parseProfile(next)) };
}
