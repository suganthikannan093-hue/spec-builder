import { defineAction } from "@agent-native/core/action";
import { listSettingsByPrefix } from "@agent-native/core/settings";
import { z } from "zod";
import { ARCHIVE_KEY_PREFIX, saveSpec, loadArchived } from "../server/lib/spec.js";

export default defineAction({
  description: "List previously generated specs (id, title, updatedAt). Pass openId to make one the current spec.",
  schema: z.object({ openId: z.string().optional().describe("Spec id to reopen as current; omit to just list") }),
  run: async ({ openId }) => {
    if (openId) {
      const s = await loadArchived(openId);
      if (!s) throw new Error(`Spec ${openId} not found`);
      await saveSpec(s);
    }
    const rows = await listSettingsByPrefix(ARCHIVE_KEY_PREFIX, { limit: 50 });
    return {
      specs: rows
        .map((r) => (r.value as any).spec)
        .filter(Boolean)
        .map((s: any) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt }))
        .sort((a: any, b: any) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  },
});
