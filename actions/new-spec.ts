import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { clearSpec } from "../server/lib/spec.js";

export default defineAction({
  description: "Clear the current spec so the user can start over with a new idea (previous specs stay in list-specs).",
  schema: z.object({}),
  run: async () => {
    await clearSpec();
    return { message: "Cleared current spec" };
  },
});
