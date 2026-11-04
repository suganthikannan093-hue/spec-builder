import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { loadSpec, requireSection, saveSpec, type SectionKey } from "../server/lib/spec.js";

export default defineAction({
  description: "Directly replace the content (Markdown) of one section of the current spec. Used by the UI for inline user edits. Agent: use this ONLY when the user dictates exact verbatim text; for any rewrite/tighten/improve request call update-section instead.",
  schema: z.object({
    section: z.enum(["problem","targetUsers","proposedSolution","keyFeatures","implementationSteps","risks"]).describe("Section key: problem | targetUsers | proposedSolution | keyFeatures | implementationSteps | risks"),
    content: z.string().describe("New full Markdown content for the section"),
    actor: z.enum(["user", "agent"]).default("user").describe('Who made the edit: "user" or "agent"; defaults to "user"'),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ section, content, actor, via: viaArg }, ctx) => {
    // Agent tool / MCP calls are always recorded as "agent", whatever they pass.
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const s = requireSection(spec, section as SectionKey);
    const now = new Date().toISOString();
    s.content = content; s.updatedBy = actor; s.updatedAt = now; s.version += 1; s.source = actor === "user" ? "user" : "agent (verbatim)";
    spec.activity.push({ via, at: now, actor, action: "edited", section: section as SectionKey });
    await saveSpec(spec);
    return { id: spec.id, message: `Saved ${section}`, spec };
  },
});
