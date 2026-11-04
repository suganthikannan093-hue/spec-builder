import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { loadSpec, requireSection, reviseSection, saveSpec, type SectionKey } from "../server/lib/spec.js";

export default defineAction({
  description:
    "Apply targeted feedback to ONE section of the current spec; the agent rewrites that section and, if allowRelated is true, minimally adjusts other sections that became inconsistent.",
  schema: z.object({
    section: z.enum(["problem","targetUsers","proposedSolution","keyFeatures","implementationSteps","risks"]).describe("Section key: problem | targetUsers | proposedSolution | keyFeatures | implementationSteps | risks"),
    feedback: z.string().min(2).describe("What to change in this section"),
    allowRelated: z.boolean().default(true).describe("Allow touching related sections; defaults to true"),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ section, feedback, allowRelated, via: viaArg }, ctx) => {
    // Agent tool / MCP calls are always recorded as "agent", whatever they pass.
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const { content, related, source } = await reviseSection(spec, section as SectionKey, feedback, allowRelated);
    const now = new Date().toISOString();
    const touch = (k: SectionKey, c: string) => {
      const s = requireSection(spec, k);
      s.content = c; s.updatedBy = "agent"; s.updatedAt = now; s.version += 1; s.source = source;
    };
    touch(section as SectionKey, content);
    for (const [k, c] of Object.entries(related)) touch(k as SectionKey, c as string);
    spec.activity.push({ via, at: now, actor: "agent", action: "applied feedback", section: section as SectionKey, note: feedback, source });
    spec.provider = source;
    await saveSpec(spec);
    return { id: spec.id, message: `Updated ${section}${Object.keys(related).length ? " and " + Object.keys(related).join(", ") : ""} (source: ${source})`, updated: [section, ...Object.keys(related)], spec };
  },
});
