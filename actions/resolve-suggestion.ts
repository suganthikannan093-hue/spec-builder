import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { applySectionChange, loadSpec, saveSpec } from "../server/lib/spec.js";

export default defineAction({
  description:
    "Accept or reject one review suggestion from review-spec. Accept applies its proposed content to the section (the old version is kept in history, so it can be undone). Agent: only accept when the user asks you to.",
  schema: z.object({
    id: z.string().describe("Suggestion id from review-spec"),
    decision: z.enum(["accept", "reject"]).describe("accept or reject"),
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ id, decision, via: viaArg }, ctx) => {
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const sg = spec.review?.suggestions.find((s) => s.id === id);
    if (!sg) throw new Error(`Unknown suggestion ${id}`);
    if (sg.status !== "pending") throw new Error(`Suggestion ${id} is already ${sg.status}`);
    const at = new Date().toISOString();
    let stale = false;
    if (decision === "accept") {
      const sec = spec.sections.find((s) => s.key === sg.section)!;
      stale = sec.version !== sg.baseVersion;
      applySectionChange(spec, sg.section, { content: sg.proposedContent, updatedBy: "agent", source: spec.review!.source, action: "review suggestion" });
    }
    sg.status = decision === "accept" ? "accepted" : "rejected";
    spec.activity.push({ via, at, actor: via === "ui" ? "user" : "agent", action: decision === "accept" ? "accepted suggestion" : "rejected suggestion", section: sg.section, note: sg.issue });
    await saveSpec(spec);
    return {
      message: decision === "accept" ? `Applied suggestion to ${sg.section}${stale ? " (it was written for an older version; check the diff, Undo is available)" : ""}` : `Rejected suggestion on ${sg.section}`,
      spec,
    };
  },
});
