import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useActionMutation, useActionQuery } from "@agent-native/core/client/use-action";
import {
  IconCheck,
  IconEdit,
  IconLoader2,
  IconMessageChatbot,
  IconRefresh,
  IconRobot,
  IconSparkles,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type SectionKey = "problem" | "targetUsers" | "proposedSolution" | "keyFeatures" | "implementationSteps" | "risks";
interface Section { key: SectionKey; title: string; content: string; updatedBy: "agent" | "user"; updatedAt: string; version: number; source?: string }
interface Spec { id: string; title: string; idea: string; provider: string; sections: Section[]; activity: { at: string; actor: string; action: string; section?: string; note?: string; source?: string; via?: string }[]; updatedAt: string }

const EXAMPLE = "A mobile app that helps neighbours share tools (drills, ladders, lawn mowers) with deposits, ratings and pickup scheduling.";

export function meta() {
  return [{ title: "Spec Builder - turn rough ideas into specs with an agent" }];
}

const useQ: any = useActionQuery;
const useM: any = useActionMutation;

function Markdownish({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed text-foreground/90">
      {text.split("\n").map((line, i) => {
        const html = line
          .replace(/&/g, "&amp;").replace(/</g, "&lt;")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
          .replace(/\b_(.+?)_\b/g, "<em>$1</em>");
        const h = /^\s*#{1,6}\s+(.*)$/.exec(line);
        if (h) return <p key={i} className="pt-1 font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: html.replace(/^\s*#{1,6}\s+/, "") }} />;
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (/^\s*[-*] /.test(line)) return <div key={i} className="flex gap-2 pl-1"><span className="text-primary">•</span><span dangerouslySetInnerHTML={{ __html: html.replace(/^\s*[-*] /, "") }} /></div>;
        if (/^\s*\d+\. /.test(line)) return <div key={i} className="pl-1" dangerouslySetInnerHTML={{ __html: html }} />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

function SourceBadge({ source }: { source?: string | undefined }) {
  if (!source) return null;
  const real = /^(openai|anthropic):/.test(source);
  const user = source === "user";
  const label = real ? source.replace(":", " · ") : user ? "written by you" : source.startsWith("mock (fallback") ? "offline mock (LLM unavailable)" : source.startsWith("agent") ? "agent, verbatim" : "offline mock";
  return (
    <span title={source} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${real ? "bg-sky-500/10 text-sky-700" : user ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
      <span className={`size-1.5 rounded-full ${real ? "bg-sky-500" : user ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

const ACCENTS: Record<string, string> = {
  problem: "from-rose-500 to-orange-400",
  targetUsers: "from-amber-500 to-yellow-400",
  proposedSolution: "from-emerald-500 to-teal-400",
  keyFeatures: "from-sky-500 to-cyan-400",
  implementationSteps: "from-indigo-500 to-violet-400",
  risks: "from-fuchsia-500 to-pink-400",
};
const NUM: Record<string, string> = { problem: "01", targetUsers: "02", proposedSolution: "03", keyFeatures: "04", implementationSteps: "05", risks: "06" };

function SectionCard({ section, flash }: { section: Section; flash: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.content);
  const [feedback, setFeedback] = useState("");
  const edit = useM("edit-section");
  const update = useM("update-section");
  const regen = useM("regenerate-section");
  useEffect(() => { if (!editing) setDraft(section.content); }, [section.content, editing]);
  const busy = update.isPending || regen.isPending;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-card p-5 pt-6 shadow-sm transition-all duration-700 hover:shadow-md ${flash ? "ring-2 ring-violet-500/70 shadow-lg shadow-violet-500/10 -translate-y-0.5" : ""}`} data-section={section.key}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ACCENTS[section.key]}`} />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{NUM[section.key]}</span>
          <h3 className="text-base font-semibold">{section.title}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${section.updatedBy === "agent" ? "bg-violet-500/10 text-violet-600" : "bg-emerald-500/10 text-emerald-600"}`}>
            {section.updatedBy === "agent" ? <IconRobot className="size-3" /> : <IconUser className="size-3" />}
            {section.updatedBy} · v{section.version}
          </span>
          <SourceBadge source={section.source} />
        </div>
        {!editing && (
          <div className="flex gap-1 opacity-70 group-hover:opacity-100">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit"><IconEdit className="size-4" /></Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => regen.mutate({ section: section.key, via: "ui" }, { onSuccess: () => toast.success(`Regenerated ${section.title}`) })} aria-label="Regenerate"><IconRefresh className={`size-4 ${regen.isPending ? "animate-spin" : ""}`} /></Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea className="min-h-40 w-full rounded-lg border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/40" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(section.content); }}><IconX className="size-4" /> Cancel</Button>
            <Button size="sm" disabled={edit.isPending} onClick={() => edit.mutate({ section: section.key, content: draft, actor: "user", via: "ui" }, { onSuccess: () => { setEditing(false); toast.success("Saved"); } })}>
              {edit.isPending ? <IconLoader2 className="size-4 animate-spin" /> : <IconCheck className="size-4" />} Save
            </Button>
          </div>
        </div>
      ) : (
        <div className={busy ? "animate-pulse opacity-60" : ""}><Markdownish text={section.content} /></div>
      )}

      <form className="mt-4 flex gap-2 border-t pt-3" onSubmit={(e) => {
        e.preventDefault();
        if (!feedback.trim()) return;
        update.mutate({ section: section.key, feedback, allowRelated: true, via: "ui" }, {
          onSuccess: (r: any) => { setFeedback(""); toast.success(r?.message ?? "Updated"); },
          onError: (err: any) => toast.error(String(err?.message ?? err)),
        });
      }}>
        <input className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" placeholder={`Feedback on ${section.title.toLowerCase()}…`} value={feedback} onChange={(e) => setFeedback(e.target.value)} disabled={busy} />
        <Button size="sm" type="submit" disabled={busy || !feedback.trim()}>
          {update.isPending ? <IconLoader2 className="size-4 animate-spin" /> : <IconSparkles className="size-4" />} Update
        </Button>
      </form>
    </div>
  );
}

export default function SpecRoute() {
  const q = useQ("get-spec", {}, { refetchInterval: 2000, refetchIntervalInBackground: false });
  const spec: Spec | null = q.data?.spec ?? null;
  const provider: string = q.data?.provider ?? "";
  const llmError: string | null = q.data?.lastLlmError ?? null;
  const realConfigured = /^(openai|anthropic):/.test(provider);
  const gen = useM("generate-spec");
  const reset = useM("new-spec");
  const [idea, setIdea] = useState("");
  const prev = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!spec) return;
    const changed = new Set<string>();
    for (const s of spec.sections) {
      const k = `${spec.id}:${s.key}`;
      if (prev.current[k] !== undefined && prev.current[k] !== s.version) changed.add(s.key);
      prev.current[k] = s.version;
    }
    if (changed.size) { setFlash(changed); const t = setTimeout(() => setFlash(new Set()), 1800); return () => clearTimeout(t); }
  }, [spec]);

  const generate = () => idea.trim().length > 2 && gen.mutate({ idea, via: "ui" }, { onSuccess: () => toast.success("Spec generated"), onError: (e: any) => toast.error(String(e?.message ?? e)) });

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-violet-700"><IconSparkles className="size-3" /> Agent-Native</div>
            <h1 className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">Collaborative Spec &amp; Plan Builder</h1>
            <p className="text-sm text-muted-foreground">Paste a rough idea. The agent drafts the spec; you edit any card or give it feedback. Agent and UI share the same actions and data.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live sync</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${realConfigured && !llmError ? "border-sky-500/40 text-sky-700" : "border-amber-500/40 text-amber-700"}`} title={llmError ?? provider}>
              Engine: {realConfigured ? provider.replace(":", " · ") : "offline mock"}{llmError ? " (failing, using mock)" : ""}
            </span>
            <Button size="sm" variant="outline" onClick={() => sendToAgentChat({ message: spec ? "Review the current spec and suggest the 3 most important improvements, then apply them with update-section." : "Ask me about my product idea, then generate a spec.", submit: true, openSidebar: true } as any)}>
              <IconMessageChatbot className="size-4" /> Ask the agent
            </Button>
          </div>
        </header>

        {llmError && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-800">
            The configured LLM is failing (<code>{llmError}</code>), so new content comes from the deterministic offline mock. Each card shows its real source.
          </div>
        )}
        <div className="mb-4 grid gap-2 text-xs sm:grid-cols-3">
          {[
            ["You (this page)", "Generate, edit, give feedback", "border-emerald-500/30 text-emerald-700"],
            ["Shared actions", "generate-spec · update-section · edit-section · regenerate-section · get-spec", "border-violet-500/30 text-violet-700"],
            ["Agent (chat)", "Calls the same actions as tools", "border-sky-500/30 text-sky-700"],
          ].map(([t, d, c]) => (
            <div key={t} className={`rounded-xl border bg-card/70 px-3 py-2 backdrop-blur ${(c ?? "").split(" ")[0]}`}>
              <div className={`font-semibold ${(c ?? "").split(" ")[1]}`}>{t}</div>
              <div className="text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-2xl border bg-card p-4 shadow-sm">
          <textarea className="min-h-24 w-full resize-y rounded-lg bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. An app that helps neighbours share tools…" value={idea} onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setIdea(EXAMPLE)}>Use example idea</button>
            <div className="flex gap-2">
              {spec && <Button variant="ghost" size="sm" onClick={() => reset.mutate({})}><IconTrash className="size-4" /> New spec</Button>}
              <Button onClick={generate} disabled={gen.isPending || idea.trim().length < 3}>
                {gen.isPending ? <IconLoader2 className="size-4 animate-spin" /> : <IconSparkles className="size-4" />} {spec ? "Regenerate spec" : "Generate spec"}
              </Button>
            </div>
          </div>
        </div>

        {q.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : spec ? (
          <>
            <div className="mb-4"><h2 className="text-xl font-semibold">{spec.title}</h2><p className="text-xs text-muted-foreground">Idea: {spec.idea}</p></div>
            <div className="grid gap-4 md:grid-cols-2">{spec.sections.map((s) => <SectionCard key={s.key} section={s} flash={flash.has(s.key)} />)}</div>
            <div className="mt-8 rounded-xl border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold">Activity · who did what, through which action</h3>
              <p className="mb-2 text-[11px] text-muted-foreground">UI clicks and agent tool calls land in the same log because they go through the same actions.</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {[...spec.activity].reverse().slice(0, 8).map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50">
                    <span className="w-20 shrink-0 font-mono">{new Date(a.at).toLocaleTimeString()}</span>
                    <span className={`rounded px-1.5 py-0.5 font-medium ${a.via === "ui" ? "bg-emerald-500/10 text-emerald-700" : "bg-sky-500/10 text-sky-700"}`}>{a.via === "ui" ? "UI" : "Agent chat"}</span>
                    <span>→</span>
                    <code className="rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-700">{({"generated spec": "generate-spec", "applied feedback": "update-section", edited: "edit-section", regenerated: "regenerate-section"} as Record<string, string>)[a.action] ?? a.action}</code>
                    <span className="text-foreground/80">{a.section ? a.section : ""}{a.note ? ` — "${a.note.length > 90 ? a.note.slice(0, 90).trimEnd() + "…" : a.note}"` : ""}</span>
                    {a.source && <SourceBadge source={a.source} />}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">No spec yet. Describe an idea above, or open the agent chat and say "Turn my idea into a spec: …".</div>
        )}
      </div>
    </div>
  );
}
