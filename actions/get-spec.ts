import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { readSelection } from "../server/lib/selection.js";
import { lastLlmError, loadSpec, providerName } from "../server/lib/spec.js";

export default defineAction({
  description: `Read the current spec (title, idea, six sections with content, who last edited each, recent activity). Call before editing so you see the user's latest edits. "selected" is the card the user has selected on /spec (null if none): "this", "this card" or "it" refers to it.`,
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => ({ spec: await loadSpec(), provider: providerName(), lastLlmError, selected: await readSelection() }),
});
