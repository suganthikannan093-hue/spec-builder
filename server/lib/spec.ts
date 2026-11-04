import { getSetting, putSetting } from "@agent-native/core/settings";

export const SECTION_KEYS = [
  "problem",
  "targetUsers",
  "proposedSolution",
  "keyFeatures",
  "implementationSteps",
  "risks",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_TITLES: Record<SectionKey, string> = {
  problem: "Problem",
  targetUsers: "Target Users",
  proposedSolution: "Proposed Solution",
  keyFeatures: "Key Features",
  implementationSteps: "Implementation Steps",
  risks: "Risks & Open Questions",
};

export interface Section {
  key: SectionKey;
  title: string;
  content: string;
  updatedBy: "agent" | "user";
  updatedAt: string;
  version: number;
  /** Where the content came from: "openai:<model>", "anthropic:<model>", "mock", "mock (fallback: …)" or "user". */
  source?: string | undefined;
  /** Previous versions, oldest first (max 10). Undo pops the last one. */
  history?: HistoryEntry[];
}
export interface HistoryEntry {
  content: string;
  updatedBy: "agent" | "user";
  version: number;
  source?: string | undefined;
  at: string;
  /** The change that replaced this version, e.g. "update-section". */
  replacedBy: string;
}
export type SuggestionType = "gap" | "ambiguity" | "acceptance-criteria";
export interface Suggestion {
  id: string;
  section: SectionKey;
  type: SuggestionType;
  issue: string;
  suggestion: string;
  proposedContent: string;
  baseVersion: number;
  status: "pending" | "accepted" | "rejected";
}
export interface Review { at: string; source: string; via?: string; suggestions: Suggestion[] }
export let lastLlmError: string | null = null;
export interface ActivityEntry {
  at: string;
  actor: "agent" | "user";
  action: string;
  section?: SectionKey | undefined;
  note?: string;
  source?: string;
  via?: string;
}
export interface Spec {
  id: string;
  title: string;
  idea: string;
  provider: string;
  sections: Section[];
  activity: ActivityEntry[];
  review?: Review | null;
  createdAt: string;
  updatedAt: string;
}

const CURRENT_KEY = "spec-builder:current";
const ARCHIVE_PREFIX = "spec-builder:spec:";

export async function loadSpec(): Promise<Spec | null> {
  const v = await getSetting(CURRENT_KEY, { bypassCache: true });
  return v && (v as any).spec ? ((v as any).spec as Spec) : null;
}
export async function saveSpec(spec: Spec): Promise<Spec> {
  spec.updatedAt = new Date().toISOString();
  spec.activity = spec.activity.slice(-30);
  await putSetting(CURRENT_KEY, { spec } as any);
  await putSetting(ARCHIVE_PREFIX + spec.id, { spec } as any);
  return spec;
}
export async function clearSpec() {
  await putSetting(CURRENT_KEY, { spec: null } as any);
}
export async function loadArchived(id: string): Promise<Spec | null> {
  const v = await getSetting(ARCHIVE_PREFIX + id);
  return v && (v as any).spec ? ((v as any).spec as Spec) : null;
}
export const ARCHIVE_KEY_PREFIX = ARCHIVE_PREFIX;

export function requireSection(spec: Spec, key: SectionKey): Section {
  const s = spec.sections.find((x) => x.key === key);
  if (!s) throw new Error(`Unknown section ${key}`);
  return s;
}

export const MAX_HISTORY = 10;

/** Every content change goes through here so the previous version is kept for diff + undo. */
export function applySectionChange(
  spec: Spec,
  key: SectionKey,
  change: { content: string; updatedBy: "agent" | "user"; source?: string; action: string },
): Section {
  const s = requireSection(spec, key);
  if (s.content === change.content) return s;
  s.history = [
    ...(s.history ?? []),
    { content: s.content, updatedBy: s.updatedBy, version: s.version, source: s.source, at: s.updatedAt, replacedBy: change.action },
  ].slice(-MAX_HISTORY);
  s.content = change.content;
  s.updatedBy = change.updatedBy;
  s.updatedAt = new Date().toISOString();
  s.version += 1;
  s.source = change.source;
  return s;
}

/** Revert the last change of a section. Version keeps increasing so live views notice. */
export function undoSectionChange(spec: Spec, key: SectionKey): { section: Section; undone: HistoryEntry } {
  const s = requireSection(spec, key);
  const prev = s.history?.pop();
  if (!prev) throw new Error(`Nothing to undo on ${key}`);
  s.content = prev.content;
  s.updatedBy = prev.updatedBy;
  s.source = prev.source;
  s.updatedAt = new Date().toISOString();
  s.version += 1;
  return { section: s, undone: prev };
}

// ---------------- LLM layer ----------------
// Hackathon demo: optional deploy-level keys from .env (see .env.example).
// For multi-user production, swap this for resolveCredential(key, { userEmail, orgId }).
function env(name: "OPENAI_API_KEY" | "OPENAI_MODEL" | "ANTHROPIC_API_KEY" | "ANTHROPIC_MODEL"): string | undefined {
  const e = process.env;
  const map = {
    // guard:allow-no-env-credentials — single-tenant hackathon demo, optional deploy-level key
    OPENAI_API_KEY: e.OPENAI_API_KEY,
    // guard:allow-no-env-credentials — model name, not a credential
    OPENAI_MODEL: e.OPENAI_MODEL,
    // guard:allow-no-env-credentials — single-tenant hackathon demo, optional deploy-level key
    ANTHROPIC_API_KEY: e.ANTHROPIC_API_KEY,
    // guard:allow-no-env-credentials — model name, not a credential
    ANTHROPIC_MODEL: e.ANTHROPIC_MODEL,
  };
  return map[name];
}
export function mockSource(): string {
  return lastLlmError ? `mock (fallback: ${lastLlmError})` : "mock";
}
export function providerName(): string {
  if (env("OPENAI_API_KEY")) return `openai:${env("OPENAI_MODEL") || "gpt-4o-mini"}`;
  if (env("ANTHROPIC_API_KEY"))
    return `anthropic:${env("ANTHROPIC_MODEL") || "claude-3-5-haiku-latest"}`;
  return "mock (offline)";
}

async function callLLM(system: string, user: string): Promise<string | null> {
  lastLlmError = null;
  try {
    if (env("OPENAI_API_KEY")) {
      let r!: Response;
      for (let attempt = 0; attempt < 4; attempt++) {
      r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env("OPENAI_API_KEY")}`,
        },
        body: JSON.stringify({
          model: env("OPENAI_MODEL") || "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: AbortSignal.timeout(60000),
      });
        if (r.status !== 429 && r.status < 500) break;
        if (attempt < 3) await new Promise((res) => setTimeout(res, 800 * 2 ** attempt));
      }
      if (!r.ok) {
        const body: any = await r.json().catch(() => ({}));
        throw new Error(`OpenAI ${r.status}${body?.error?.code ? " " + body.error.code : ""}`);
      }
      const j: any = await r.json();
      return j.choices?.[0]?.message?.content ?? null;
    }
    if (env("ANTHROPIC_API_KEY")) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env("ANTHROPIC_API_KEY") ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env("ANTHROPIC_MODEL") || "claude-3-5-haiku-latest",
          max_tokens: 4000,
          system,
          messages: [{ role: "user", content: user }],
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) {
        const body: any = await r.json().catch(() => ({}));
        throw new Error(`Anthropic ${r.status}${body?.error?.type ? " " + body.error.type : ""}`);
      }
      const j: any = await r.json();
      return j.content?.[0]?.text ?? null;
    }
  } catch (e) {
    lastLlmError = e instanceof Error ? e.message : String(e);
    console.warn("[spec-builder] LLM call failed, falling back to mock:", lastLlmError);
  }
  return null;
}

function parseJson(text: string | null): any {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  try {
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

const SYSTEM = `You are a senior product manager and staff engineer. You write concise, concrete product specs in Markdown (bullets, short paragraphs). Always reply with a single JSON object only.`;

export async function generateSections(idea: string): Promise<{ title: string; content: Record<SectionKey, string>; source: string }> {
  const out = parseJson(
    await callLLM(
      SYSTEM,
      `Turn this rough idea into a spec. Return JSON {"title": string, ${SECTION_KEYS.map((k) => `"${k}": markdown string`).join(", ")}}. Keys mean: ${SECTION_KEYS.map((k) => `${k}=${SECTION_TITLES[k]}`).join("; ")}.\n\nIdea:\n${idea}`,
    ),
  );
  if (out && SECTION_KEYS.every((k) => typeof out[k] === "string")) {
    return { title: String(out.title || titleFrom(idea)), content: out, source: providerName() };
  }
  return { ...mockGenerate(idea), source: mockSource() };
}

export async function reviseSection(
  spec: Spec,
  key: SectionKey,
  feedback: string,
  allowRelated: boolean,
): Promise<{ content: string; related: Partial<Record<SectionKey, string>>; source: string }> {
  const ctx = spec.sections.map((s) => `## ${s.title} (${s.key})\n${s.content}`).join("\n\n");
  const out = parseJson(
    await callLLM(
      SYSTEM,
      `Current spec for "${spec.title}":\n\n${ctx}\n\nRewrite ONLY the section "${key}" (${SECTION_TITLES[key]}) applying this feedback: ${feedback}\n${allowRelated ? `If the change makes other sections inconsistent, you may also return minimal updated versions of them under "related" (object keyed by section key). Leave untouched sections out.` : `Do not change other sections; "related" must be {}.`}\nReturn JSON {"content": markdown string WITHOUT a heading (the card shows the title), "related": object}.`,
    ),
  );
  if (out && typeof out.content === "string") {
    const related: Partial<Record<SectionKey, string>> = {};
    if (allowRelated && out.related && typeof out.related === "object") {
      for (const k of SECTION_KEYS)
        if (k !== key && typeof out.related[k] === "string") related[k] = out.related[k];
    }
    // Drop a leading heading that repeats the section title (cards already show it).
    const content = out.content.replace(/^\s*#{1,6}\s+[^\n]*\n+/, "").trim();
    return { content, related, source: providerName() };
  }
  return { ...mockRevise(spec, key, feedback, allowRelated), source: mockSource() };
}

const TYPES: SuggestionType[] = ["gap", "ambiguity", "acceptance-criteria"];

export async function reviewSections(
  spec: Spec,
  only?: SectionKey,
): Promise<{ suggestions: Omit<Suggestion, "id" | "status" | "baseVersion">[]; source: string }> {
  const ctx = spec.sections.map((s) => `## ${s.title} (${s.key})\n${s.content}`).join("\n\n");
  const out = parseJson(
    await callLLM(
      SYSTEM,
      `Critically review this spec for "${spec.title}" like a tough staff-engineer reviewer.\n\n${ctx}\n\nFind the ${only ? "2-3" : "3-5"} most valuable problems${only ? ` in the section "${only}" only` : ""}: gaps (missing things a team needs), ambiguity (vague words, unmeasurable goals), and missing acceptance criteria (features without testable done-conditions). For each, write a fix as "proposedContent": the ENTIRE new section in Markdown, i.e. every existing line of that section kept verbatim unless the fix changes it, plus your additions (never drop existing items, no heading).\nReturn JSON {"suggestions":[{"section": one of ${SECTION_KEYS.join("|")}, "type": "gap"|"ambiguity"|"acceptance-criteria", "issue": one sentence, "suggestion": one sentence describing the fix, "proposedContent": markdown}]}.`,
    ),
  );
  if (out && Array.isArray(out.suggestions)) {
    const suggestions = out.suggestions
      .filter((x: any) => x && SECTION_KEYS.includes(x.section) && typeof x.proposedContent === "string" && typeof x.issue === "string")
      .filter((x: any) => !only || x.section === only)
      .slice(0, 6)
      .map((x: any) => ({
        section: x.section as SectionKey,
        type: (TYPES.includes(x.type) ? x.type : "gap") as SuggestionType,
        issue: String(x.issue),
        suggestion: String(x.suggestion ?? ""),
        proposedContent: keepExisting(requireSection(spec, x.section).content, String(x.proposedContent).replace(/^\s*#{1,6}\s+[^\n]*\n+/, "").trim()),
      }));
    if (suggestions.length) return { suggestions, source: providerName() };
  }
  return { suggestions: mockReview(spec, only), source: mockSource() };
}

/** Guard: if the model returned only the new lines (much shorter than the card), append them instead of wiping the card. */
export function keepExisting(current: string, proposed: string): string {
  if (proposed.length < current.length * 0.6 && !proposed.includes(current.slice(0, 40))) return `${current.trim()}\n${proposed}`;
  return proposed;
}

export function mockReview(spec: Spec, only?: SectionKey): Omit<Suggestion, "id" | "status" | "baseVersion">[] {
  const c = (k: SectionKey) => requireSection(spec, k).content;
  const all: Omit<Suggestion, "id" | "status" | "baseVersion">[] = [
    {
      section: "keyFeatures",
      type: "acceptance-criteria",
      issue: "Features have no testable done-conditions.",
      suggestion: "Add acceptance criteria so QA knows when each feature is finished.",
      proposedContent: `${c("keyFeatures")}\n\n**Acceptance criteria**\n- Each feature has a demoable happy path and one error state.\n- Core flows complete in under 3 taps/clicks.`,
    },
    {
      section: "targetUsers",
      type: "ambiguity",
      issue: "\"Small teams\" is not measurable.",
      suggestion: "Define the team size and the first segment to win.",
      proposedContent: `${c("targetUsers")}\n- **Beachhead (v1):** teams of 2-10 people.`,
    },
    {
      section: "risks",
      type: "gap",
      issue: "No success metric to judge the launch.",
      suggestion: "Add a measurable success metric and a kill criterion.",
      proposedContent: `${c("risks")}\n- **Success metric:** 40% of beta users active weekly after 4 weeks; otherwise revisit scope.`,
    },
  ];
  return only ? all.filter((x) => x.section === only).concat(only && !all.some((x) => x.section === only) ? [{ section: only, type: "ambiguity", issue: "This section has no measurable statement.", suggestion: "Add one concrete, measurable line.", proposedContent: `${c(only)}\n- **Measurable:** define a number we can check after launch.` }] : []) : all;
}

// ---------------- Deterministic offline mock ----------------
function titleFrom(idea: string) {
  const words = idea.replace(/[^\w\s-]/g, " ").trim().split(/\s+/).slice(0, 6).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled spec";
}
function keywords(idea: string): string[] {
  const stop = new Set("a an the and or for to of in on with that this app tool want build make users user who which is are be can it my our we i mobile web helps help helping people platform system service share sharing their them".split(" "));
  const seen = new Set<string>();
  return idea
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !stop.has(w) && !seen.has(w) && seen.add(w));
}
export function mockGenerate(idea: string) {
  const kw = keywords(idea);
  const k = (i: number, d: string) => kw[i] ?? d;
  const title = titleFrom(idea);
  const content: Record<SectionKey, string> = {
    problem: `People who care about **${k(0, "this workflow")}** today stitch it together by hand.\n\n- The idea: _${idea.trim()}_\n- Current tools are fragmented, so work around **${k(1, "the core task")}** is slow and error-prone.\n- There is no single place that shows status and next steps.`,
    targetUsers: `- **Primary:** individuals and small teams who regularly deal with ${k(0, "the core task")}.\n- **Secondary:** managers who need visibility into ${k(1, "progress")}.\n- **Not for (v1):** large enterprises that need SSO, audit and custom compliance.`,
    proposedSolution: `A focused web app, **${title}**, that turns ${k(0, "the workflow")} into a guided flow.\n\n1. Capture input in one place.\n2. Let an AI agent draft the first version, using the same actions the UI uses.\n3. Keep the human in control: every agent change is visible, editable and attributable.`,
    keyFeatures: `- Quick capture of ${k(0, "items")} with smart defaults\n- AI-assisted drafting and summarisation of ${k(1, "content")}\n- Shared, live-updating workspace between agent and user\n- History of who changed what (agent vs user)\n- Export to Markdown`,
    implementationSteps: `1. **Week 1:** data model and core actions (create, update, list).\n2. **Week 2:** main UI with editable cards and live sync.\n3. **Week 3:** agent integration: expose the same actions as tools.\n4. **Week 4:** polish, onboarding, telemetry and beta with 5 users.`,
    risks: `- **Risk:** AI output quality varies, so keep humans in the loop with inline edit.\n- **Risk:** scope creep beyond ${k(0, "the core use case")}.\n- **Open question:** what's the pricing model?\n- **Open question:** which integrations matter most for v1?`,
  };
  return { title, content };
}
function mockRevise(spec: Spec, key: SectionKey, feedback: string, allowRelated: boolean) {
  const cur = requireSection(spec, key).content;
  const fb = feedback.trim();
  const content = `${cur}\n\n**Revised per feedback:** ${fb}\n- ${fb.charAt(0).toUpperCase() + fb.slice(1)}${/[.!?]$/.test(fb) ? "" : "."}`;
  const related: Partial<Record<SectionKey, string>> = {};
  if (allowRelated && (key === "keyFeatures" || key === "proposedSolution")) {
    related.implementationSteps = `${requireSection(spec, "implementationSteps").content}\n${"5"}. **Follow-up:** implement "${fb}".`;
  }
  if (allowRelated && key === "targetUsers") {
    related.problem = `${requireSection(spec, "problem").content}\n- Updated audience note: ${fb}.`;
  }
  return { content, related };
}

export function newSpec(idea: string, title: string, content: Record<SectionKey, string>, source = "mock"): Spec {
  const now = new Date().toISOString();
  return {
    id: `spec_${Date.now().toString(36)}`,
    title,
    idea,
    provider: source,
    createdAt: now,
    updatedAt: now,
    sections: SECTION_KEYS.map((key) => ({
      key,
      title: SECTION_TITLES[key],
      content: content[key],
      updatedBy: "agent",
      updatedAt: now,
      version: 1,
      source,
    })),
    activity: [{ at: now, actor: "agent", action: "generated spec", source }],
  };
}
