import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { lastLlmError, loadSpec, providerName } from "../server/lib/spec.js";

export default defineAction({
  description: "Read the current spec (title, idea, six sections with content, who last edited each, recent activity). Call before editing so you see the user's latest edits.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => ({ spec: await loadSpec(), provider: providerName(), lastLlmError }),
});
