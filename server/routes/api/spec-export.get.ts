// Binary/file download (allowed api/ use): serves the current spec as a .md attachment.
import { defineEventHandler, getQuery, setResponseHeader, setResponseStatus } from "h3";
import { specMarkdown, tasksMarkdown } from "../../lib/spec-export.js";
import { loadSpec } from "../../lib/spec.js";

export default defineEventHandler(async (event) => {
  const spec = await loadSpec();
  if (!spec) { setResponseStatus(event, 404); return "No spec yet"; }
  const tasks = getQuery(event).file === "tasks";
  setResponseHeader(event, "content-type", "text/markdown; charset=utf-8");
  setResponseHeader(event, "content-disposition", `attachment; filename="${tasks ? "TASKS.md" : "SPEC.md"}"`);
  return tasks ? tasksMarkdown(spec) : specMarkdown(spec);
});
