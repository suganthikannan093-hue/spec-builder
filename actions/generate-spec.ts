import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { generateSections, newSpec, saveSpec } from "../server/lib/spec.js";

export default defineAction({
  description:
    "Turn a rough product/feature idea into a structured spec with six sections (Problem, Target Users, Proposed Solution, Key Features, Implementation Steps, Risks & Open Questions). Replaces the current spec shown in the Spec Builder UI.",
  schema: z.object({
    idea: z.string().min(3).describe("The rough product or feature idea in plain words"),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ idea, via: viaArg }, ctx) => {
    // Agent tool / MCP calls are always recorded as "agent", whatever they pass.
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const { title, content, source } = await generateSections(idea);
    const fresh = newSpec(idea, title, content, source);
    fresh.activity[0]!.via = via;
    const spec = await saveSpec(fresh);
    return { id: spec.id, message: `Generated spec "${spec.title}" (source: ${source})`, spec };
  },
});
