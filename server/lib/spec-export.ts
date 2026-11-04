import type { Spec } from "./spec.js";

function stripMd(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)_(.+?)_(?=\s|$)/g, "$1$2").trim();
}
function items(content: string): string[] {
  return content
    .split("\n")
    .map((l) => /^\s*(?:[-*]|\d+[.)])\s+(.*)$/.exec(l)?.[1])
    .filter((x): x is string => !!x && x.trim().length > 0)
    .map(stripMd);
}

export interface TaskGroup { title: string; tasks: string[] }

/** Deterministic task list derived from the spec (no LLM call). */
export function buildTasks(spec: Spec): TaskGroup[] {
  const get = (k: string) => spec.sections.find((s) => s.key === k)?.content ?? "";
  const groups: TaskGroup[] = [
    { title: "Implementation", tasks: items(get("implementationSteps")) },
    { title: "Features", tasks: items(get("keyFeatures")).map((t) => `Build: ${t}`) },
    {
      title: "Risks & open questions",
      tasks: items(get("risks")).map((t) => (/open question|\?/i.test(t) ? `Decide: ${t.replace(/^open question:\s*/i, "")}` : `Mitigate: ${t.replace(/^risk:\s*/i, "")}`)),
    },
  ];
  return groups.filter((g) => g.tasks.length);
}

export function tasksMarkdown(spec: Spec): string {
  const groups = buildTasks(spec);
  return [`# Tasks: ${spec.title}`, "", ...groups.flatMap((g) => [`## ${g.title}`, ...g.tasks.map((t) => `- [ ] ${t}`), ""])].join("\n").trimEnd() + "\n";
}

export function specMarkdown(spec: Spec): string {
  const lines = [`# ${spec.title}`, "", `> ${spec.idea.trim()}`, ""];
  for (const s of spec.sections) {
    lines.push(`## ${s.title}`, "", s.content.trim(), "", `<sub>v${s.version} · last edited by ${s.updatedBy}${s.source ? ` · ${s.source}` : ""}</sub>`, "");
  }
  lines.push("## Task list", "");
  for (const g of buildTasks(spec)) lines.push(`### ${g.title}`, ...g.tasks.map((t) => `- [ ] ${t}`), "");
  lines.push(`---`, `Exported from Spec Builder on ${new Date().toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function taskCount(spec: Spec) {
  return buildTasks(spec).reduce((n, g) => n + g.tasks.length, 0);
}
