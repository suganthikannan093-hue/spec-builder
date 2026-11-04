import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { readSelection } from "../server/lib/selection.js";
import { loadSpec, reviewSections, saveSpec, type SectionKey } from "../server/lib/spec.js";

export default defineAction({
  description:
    "Critique the current spec like a tough reviewer: find gaps, ambiguity and missing acceptance criteria. Returns structured suggestions (each with a proposed replacement for one section) that the user Accepts or Rejects on /spec. Does NOT change any section; use resolve-suggestion to apply one.",
  schema: z.object({
    section: z.enum(["problem","targetUsers","proposedSolution","keyFeatures","implementationSteps","risks"]).optional().describe("Review only this section. Omit to review the whole spec"),
    selectedOnly: z.boolean().default(false).describe("Review only the card the user selected on /spec"),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ section, selectedOnly, via: viaArg }, ctx) => {
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const only = (section ?? (selectedOnly ? (await readSelection())?.section : undefined)) as SectionKey | undefined;
    const { suggestions, source } = await reviewSections(spec, only);
    const stamp = Date.now().toString(36);
    const at = new Date().toISOString();
    spec.review = {
      at, source, via,
      suggestions: suggestions.map((s, i) => ({
        ...s, id: `sg_${stamp}_${i + 1}`, status: "pending",
        baseVersion: spec.sections.find((x) => x.key === s.section)!.version,
      })),
    };
    spec.activity.push({ via, at, actor: "agent", action: "reviewed", section: only, note: `${suggestions.length} suggestions`, source });
    await saveSpec(spec);
    return {
      message: `Review found ${suggestions.length} suggestions (source: ${source}). They are shown on /spec with Accept / Reject.`,
      suggestions: spec.review.suggestions.map(({ proposedContent: _p, ...rest }) => rest),
    };
  },
});
