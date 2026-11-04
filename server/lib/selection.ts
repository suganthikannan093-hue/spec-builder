import { readAppStateForCurrentTab } from "@agent-native/core/application-state";
import { SECTION_KEYS, type SectionKey } from "./spec.js";

export const SELECTION_KEY = "spec-selection";
export interface SpecSelection { section: SectionKey; title?: string; version?: number; excerpt?: string; at?: string }

/** The card the user selected on /spec (written by the UI into application-state). */
export async function readSelection(): Promise<SpecSelection | null> {
  try {
    const v = (await readAppStateForCurrentTab(SELECTION_KEY)) as SpecSelection | null;
    return v && SECTION_KEYS.includes(v.section as SectionKey) ? v : null;
  } catch {
    return null;
  }
}

export async function resolveSection(section: SectionKey | undefined): Promise<SectionKey> {
  if (section) return section;
  const sel = await readSelection();
  if (!sel) throw new Error("No section given and no card is selected. Ask the user which section, or pass section.");
  return sel.section;
}
