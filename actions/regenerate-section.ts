import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { generateSections, loadSpec, requireSection, saveSpec, type SectionKey } from "../server/lib/spec.js";

export default defineAction({
  description: "Regenerate one section of the current spec from the original idea, discarding its current content.",
  schema: z.object({ section: z.enum(["problem","targetUsers","proposedSolution","keyFeatures","implementationSteps","risks"]).describe("Section key: problem | targetUsers | proposedSolution | keyFeatures | implementationSteps | risks"),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ section, via: viaArg }, ctx) => {
    // Agent tool / MCP calls are always recorded as "agent", whatever they pass.
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const { content, source } = await generateSections(spec.idea);
    const s = requireSection(spec, section as SectionKey);
    const now = new Date().toISOString();
    s.content = content[section as SectionKey]; s.updatedBy = "agent"; s.updatedAt = now; s.version += 1; s.source = source;
    spec.activity.push({ via, at: now, actor: "agent", action: "regenerated", section: section as SectionKey, source });
    await saveSpec(spec);
    return { id: spec.id, message: `Regenerated ${section} (source: ${source})`, spec };
  },
});
