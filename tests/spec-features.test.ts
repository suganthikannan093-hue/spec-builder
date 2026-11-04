import { describe, expect, it } from "vitest";
import { diffStats, lineDiff } from "../app/lib/line-diff";
import { specMarkdown, taskCount, tasksMarkdown } from "../server/lib/spec-export";
import { applySectionChange, mockGenerate, mockReview, newSpec, undoSectionChange } from "../server/lib/spec";

const fresh = () => { const g = mockGenerate("Neighbours share drills and ladders with deposits"); return newSpec("Neighbours share drills", g.title, g.content); };

describe("line diff", () => {
  it("marks added and removed lines", () => {
    const ops = lineDiff("a\nb\nc", "a\nB\nc\nd");
    expect(ops.map((o) => o.type + o.text)).toEqual(["samea", "delb", "addB", "samec", "addd"]);
    expect(diffStats(ops)).toEqual({ added: 2, removed: 1 });
  });
});

describe("per-card history", () => {
  it("keeps previous versions and undo restores them", () => {
    const spec = fresh();
    const orig = spec.sections[0]!.content;
    applySectionChange(spec, "problem", { content: "v2", updatedBy: "user", source: "user", action: "edit-section" });
    applySectionChange(spec, "problem", { content: "v3", updatedBy: "agent", source: "mock", action: "update-section" });
    const s = spec.sections[0]!;
    expect(s.version).toBe(3);
    expect(s.history!.map((h) => h.content)).toEqual([orig, "v2"]);
    expect(s.history![1]!.replacedBy).toBe("update-section");
    undoSectionChange(spec, "problem");
    expect(s.content).toBe("v2");
    expect(s.updatedBy).toBe("user");
    expect(s.version).toBe(4);
    undoSectionChange(spec, "problem");
    expect(s.content).toBe(orig);
    expect(() => undoSectionChange(spec, "problem")).toThrow(/Nothing to undo/);
  });
  it("ignores no-op changes and caps history at 10", () => {
    const spec = fresh();
    applySectionChange(spec, "risks", { content: spec.sections[5]!.content, updatedBy: "user", action: "edit-section" });
    expect(spec.sections[5]!.history ?? []).toHaveLength(0);
    for (let i = 0; i < 15; i++) applySectionChange(spec, "risks", { content: `r${i}`, updatedBy: "user", action: "edit-section" });
    expect(spec.sections[5]!.history).toHaveLength(10);
  });
});

describe("export", () => {
  it("builds SPEC.md with every section and a checklist", () => {
    const spec = fresh();
    const md = specMarkdown(spec);
    for (const s of spec.sections) expect(md).toContain(`## ${s.title}`);
    expect(md).toContain("## Task list");
    expect(md).toMatch(/- \[ \] Week 1: data model/);
    expect(tasksMarkdown(spec)).toMatch(/- \[ \] Decide: what's the pricing model\?/);
    expect(taskCount(spec)).toBeGreaterThan(8);
  });
});

describe("review (offline mock)", () => {
  it("returns typed suggestions with full replacement content", () => {
    const spec = fresh();
    const all = mockReview(spec);
    expect(all.map((s) => s.type).sort()).toEqual(["acceptance-criteria", "ambiguity", "gap"]);
    for (const s of all) expect(s.proposedContent.startsWith(spec.sections.find((x) => x.key === s.section)!.content)).toBe(true);
    expect(mockReview(spec, "problem").every((s) => s.section === "problem")).toBe(true);
    expect(mockReview(spec, "problem")).toHaveLength(1);
  });
});

import { keepExisting } from "../server/lib/spec";
describe("review guard", () => {
  it("appends when the model returns only new lines", () => {
    const cur = "1. Step one is long enough\n2. Step two is long enough\n3. Step three is long enough";
    expect(keepExisting(cur, "4. Measure success")).toBe(`${cur}\n4. Measure success`);
    expect(keepExisting(cur, cur + "\n4. x")).toBe(cur + "\n4. x");
  });
});
