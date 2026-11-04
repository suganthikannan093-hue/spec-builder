import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { resolveSection } from "../server/lib/selection.js";
import { applySectionChange, generateSections, loadSpec, saveSpec, type SectionKey } from "../server/lib/spec.js";

export default defineAction({
  description: "Regenerate one section of the current spec from the original idea, discarding its current content.",
  schema: z.object({ section: z.enum(["problem","targetUsers","proposedSolution","keyFeatures","implementationSteps","risks"]).optional().describe("Section key; omit to use the card the user selected on /spec"),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ section: sectionArg, via: viaArg }, ctx) => {
    // Agent tool / MCP calls are always recorded as "agent", whatever they pass.
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const section = await resolveSection(sectionArg as SectionKey | undefined);
    const { content, source } = await generateSections(spec.idea);
    const now = new Date().toISOString();
    applySectionChange(spec, section as SectionKey, { content: content[section as SectionKey], updatedBy: "agent", source, action: "regenerate-section" });
    spec.activity.push({ via, at: now, actor: "agent", action: "regenerated", section: section as SectionKey, source });
    await saveSpec(spec);
    return { id: spec.id, message: `Regenerated ${section} (source: ${source})`, spec };
  },
});
