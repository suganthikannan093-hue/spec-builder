import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { resolveSection } from "../server/lib/selection.js";
import { loadSpec, saveSpec, undoSectionChange, type SectionKey } from "../server/lib/spec.js";

export default defineAction({
  description: "Undo the last change (agent or user) to one section, restoring its previous version from the card's history.",
  schema: z.object({
    section: z.enum(["problem","targetUsers","proposedSolution","keyFeatures","implementationSteps","risks"]).optional().describe("Section key; omit to use the card the user selected on /spec"),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ section: sectionArg, via: viaArg }, ctx) => {
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const section = await resolveSection(sectionArg as SectionKey | undefined);
    const { undone } = undoSectionChange(spec, section);
    spec.activity.push({ via, at: new Date().toISOString(), actor: via === "ui" ? "user" : "agent", action: "undid", section, note: `reverted ${undone.replacedBy}, back to v${undone.version} content` });
    await saveSpec(spec);
    return { message: `Undid the last change to ${section} (restored v${undone.version} content)`, spec };
  },
});
