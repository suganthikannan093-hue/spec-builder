import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { specMarkdown, taskCount, tasksMarkdown } from "../server/lib/spec-export.js";
import { loadSpec, saveSpec } from "../server/lib/spec.js";

export default defineAction({
  description:
    "Export the current spec as a SPEC.md (all sections plus a task list) and a TASKS.md markdown checklist derived from Implementation Steps, Key Features and Risks. Returns the markdown and download links. No LLM call.",
  schema: z.object({
    via: z.enum(["ui", "agent"]).default("agent").describe('Which surface called this: "ui" (page buttons) or "agent" (chat/CLI/MCP); defaults to "agent"'),
  }),
  run: async ({ via: viaArg }, ctx) => {
    const via: "ui" | "agent" = ctx?.caller === "tool" || ctx?.caller === "mcp" || ctx?.caller === "a2a" ? "agent" : viaArg;
    const spec = await loadSpec();
    if (!spec) throw new Error("No spec yet. Call generate-spec first.");
    const markdown = specMarkdown(spec);
    const tasks = tasksMarkdown(spec);
    const n = taskCount(spec);
    spec.activity.push({ via, at: new Date().toISOString(), actor: via === "ui" ? "user" : "agent", action: "exported", note: `SPEC.md + ${n} tasks` });
    await saveSpec(spec);
    return {
      message: `Exported SPEC.md and a ${n}-item task list. Download: /api/spec-export?file=spec (SPEC.md) and /api/spec-export?file=tasks (TASKS.md).`,
      filename: "SPEC.md",
      downloadUrl: "/api/spec-export?file=spec",
      tasksUrl: "/api/spec-export?file=tasks",
      taskCount: n,
      markdown,
      tasksMarkdown: tasks,
    };
  },
});
