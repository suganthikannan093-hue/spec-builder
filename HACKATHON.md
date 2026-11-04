# Agent-Native Hackathon: compliance and submission kit (spec-builder)

Sources, read on 3 Nov 2026:
- Official Rules: https://www.builder.io/hackathon/rules
- Hackathon page: https://www.builder.io/hackathon
- Submission form: https://www.builder.io/hackathon/submit
- Event listing: https://luma.com/builderio-hackathon
- Framework docs: https://www.agent-native.com/docs/
- Clips: https://www.agent-native.com/apps/clips/, docs slug `template-clips`

**Deadline: Monday 9 Nov 2026, 11:59 PM PT** (= Tue 10 Nov 2026, 1:29 PM IST / 07:59 UTC). The rules say to submit early and confirm receipt. Technical problems don't extend the deadline.

## Mandatory technology and tools

| Requirement | Source | Status |
|---|---|---|
| Build a functional app with the **Agent-Native framework** (`@agent-native/core`) | Rules, How to Enter #1 | ✅ Scaffolded with `npx @agent-native/core@latest create spec-builder --standalone --template chat` (core 0.223.0) |
| Record the demo with **Builder Clips** and share a **public Clips link**, viewable without login or an access request | Rules #4–5. The hackathon page says "Record a public Clips demo" | ⏳ User. Clips is Agent-Native's open-source, Loom-style screen recorder. Record at https://clips.agent-native.com, set visibility to public, and copy the share link |
| Submit through the **project submission form** | Rules #5, https://www.builder.io/hackathon/submit | ⏳ User |
| Public repo or live deployment | Rules #4, encouraged but **not required** | ⏳ Optional (see Deployment below) |

There are no other mandatory tools. Any LLM provider is allowed, and registration and attendance are optional.

## Compliance checklist

| # | Rule | Status | Evidence |
|---|---|---|---|
| 1 | Functional app built with Agent-Native | ✅ | `actions/*.ts` use `defineAction`, plus `app/routes/spec.tsx` and the agent plugin. `pnpm typecheck`, `pnpm build` and `pnpm agent-native:doctor` all pass |
| 2 | Original work or meaningful new development since 27 Oct 2026 | ✅ | Project created 3 Nov 2026. All spec code is new (see disclosure) |
| 3 | Identify pre-existing work, templates, libraries, third-party assets and what changed | ✅ (drafted) | "Pre-existing work" section below. Paste it into the form |
| 4 | Project description | ✅ (drafted) | "Submission description" below |
| 5 | Creator or team details and contact info | ⏳ User | Form fields |
| 6 | Accessible demo of the working app | ⏳ User | Public Clips recording. A live deployment is optional |
| 7 | Public Clips demo showing the actual app in use, no login needed | ⏳ User | Record, set it to public, then check the link in a private window |
| 8 | Submit the form and the Clips link by the deadline, and confirm receipt | ⏳ User | Recording a clip alone is not a submission |
| 9 | Agree to the Official Rules and confirm eligibility (18+, not a sponsor employee or judge, not sanctions-restricted) | ⏳ User | Checkbox on the form |
| 10 | Truthful demo, no fabricated demonstrations | ⚠️ Important | The demo now runs on real gpt-4o-mini, and the cards show the `openai · gpt-4o-mini` badge. The mock is labelled "offline mock" on every card. If you demo with it, say so |
| 11 | Third-party licences respected | ✅ | Only framework and npm dependencies under their own licences. No third-party assets added |

## Pre-existing work (disclosure)

- **Template:** the Agent-Native `chat` starter (`@agent-native/core` 0.223.0, `--standalone --template chat`). It provided the app shell, auth, sidebar, agent chat panel and inspector, settings, and the starter actions (`hello`, `navigate`, `view-screen`, `provider-api-request`, `run`).
- **Libraries:** `@agent-native/core`, `toolkit` and `agentkit`, React 19, React Router 8, TanStack Query, Tailwind 4, Tabler icons, Zod, and the Vercel AI SDK (the framework's OpenAI engine). LLM providers are OpenAI (gpt-4o-mini) or Anthropic, through their public APIs.
- **New during the hackathon (3 Nov 2026 onward):**
  - Spec domain model and storage in `server/lib/spec.ts`. It uses the framework's SQL settings store and keeps a per-section version, author and source, plus an activity log.
  - The LLM layer (OpenAI or Anthropic with JSON output), a deterministic offline mock, and an honest record of where every piece of content came from.
  - Eleven actions: `generate-spec`, `update-section` (feedback that can touch related sections), `edit-section`, `regenerate-section`, `get-spec`, `new-spec`, `list-specs`, `review-spec`, `resolve-suggestion`, `export-spec` and `undo-section`.
  - Selected-card awareness: the page writes the selected card into application-state (`spec-selection`, tab-scoped), and `get-spec`, `view-screen` and the section actions use it, so "make this more specific" targets that card.
  - Spec review: structured suggestions (gap, ambiguity, acceptance criteria) with Accept / Reject and a diff preview.
  - Export: SPEC.md and a TASKS.md checklist, from chat or a button (`/api/spec-export` serves the file download).
  - Per-card history (last 10 versions), a line diff view and Undo.
  - A new `/spec` page with editable cards, feedback on each card, source and author badges, live refresh, change highlights, and an activity log showing the UI or agent and the action it called.
  - Agent system prompt and first-turn tools, the sidebar link and nav view, the home path, the README and this file.

## Submission description (draft)

> **Collaborative Spec & Plan Builder** turns a rough product idea into a structured, editable spec covering problem, target users, proposed solution, key features, implementation steps, and risks and open questions. You and an AI agent work on the same document. You can edit any card directly, type feedback on one card so the agent rewrites only that section (and fixes related sections when the change makes them inconsistent), regenerate a single section, or just ask in chat ("tighten the risks section", "make this a 2-week MVP"). Click a card and the agent knows what "this" means. Ask for a review and the agent returns typed suggestions (gaps, ambiguity, missing acceptance criteria) that you Accept or Reject. Every edit keeps its previous version with a diff and one-click Undo, and the finished spec exports as SPEC.md plus a task checklist.
>
> It's built the agent-native way: every capability is one `defineAction` shared by the React UI, the in-app agent, HTTP, MCP and the CLI, and both sides read and write the same SQL-backed spec. The page refreshes live when the agent acts. Each card shows who changed it (you or the agent), its version and which model wrote it. An activity log shows every step as "UI → update-section" or "Agent chat → update-section", so the collaboration is visible and the human always has the last word.
>
> Pre-existing work: the Agent-Native `chat` starter template and open-source libraries. Everything spec-related was built during the hackathon (see HACKATHON.md).

## 2:30 demo script, mapped to the judging criteria

| Time | On screen | Say | Criterion |
|---|---|---|---|
| 0:00–0:10 | `/spec` hero and the strip "You · Shared actions · Agent" | "Specs start as messy ideas. Here you and an agent shape one together, on the same data, through the same actions." | Usefulness and Execution (40) |
| 0:10–0:28 | Paste the idea, click **Generate spec**. Six cards appear with `agent · v1 · openai · gpt-4o-mini` | "One click gives a full spec. Every card says who wrote it and which model." | Usefulness and Execution (40), Creativity and Design (20) |
| 0:28–0:50 | Click the **Key Features** card. It gets a blue ring, the chip "Selected · agent sees this" and the bar "Agent focus: 04 Key Features". Click **Make this more specific** (or type it in chat) | "I never say which card. The UI writes my selection into application-state, and the agent reads it, so 'this' just works." | Use of Agent-Native (20), Innovation (20) |
| 0:50–1:05 | The card updates live. Click the **History** icon: a red/green diff shows exactly what the agent changed, then click **Undo** | "Every agent or human edit keeps the previous version. I can see the diff and undo it in one click. The agent can call the same undo-section action." | Usefulness and Execution (40), Innovation (20) |
| 1:05–1:40 | Click **Review spec**. A panel lists typed suggestions (gap, ambiguity, acceptance-criteria) with orange "1 review" chips on the affected cards. Click **Preview change** on one, **Accept** it, **Reject** another | "The agent critiques its own spec like a tough reviewer, but it only proposes. I decide, and an accepted fix goes into history so it's undoable." | Innovation (20), Creativity and Design (20) |
| 1:40–2:00 | In chat: "Export the spec as SPEC.md with the task list". The agent replies with download links. Then click the **SPEC.md** button and open the file | "SPEC.md plus a checklist ready to paste into a repo or tracker, from chat or a button: same export-spec action." | Usefulness and Execution (40), Use of Agent-Native (20) |
| 2:00–2:15 | Edit Target Users inline and **Save**. The badge turns `user · v2 · written by you` | "I can override anything, and my edits are never silently overwritten." | Usefulness and Execution (40) |
| 2:15–2:30 | Show the activity log (`UI → resolve-suggestion`, `Agent chat → update-section`, `Agent chat → export-spec`), then `actions/review-spec.ts` | "Eleven defineActions shared by the UI, the agent, HTTP, MCP and the CLI, plus shared application-state. That's agent-native." | Use of Agent-Native (20) |

Tip: before recording, click **New spec** so history and review start empty. Screenshots of each feature: `docs/feature-*.png`.

## Deployment (optional, not done)

The framework documents Node.js, Docker, Vercel, Netlify, Cloudflare Workers and Deno Deploy (`pnpm action docs-search --slug deploy-an-app`). This template ships with a `netlify.toml`. Deploying needs:
1. A persistent PostgreSQL database (`DATABASE_URL`, for example Neon or Supabase). Local dev uses embedded PGlite.
2. `BETTER_AUTH_SECRET`, and optionally `BETTER_AUTH_URL`. Don't set `AUTH_DISABLED` in production.
3. A host account and CLI (for example `netlify deploy`), plus `OPENAI_API_KEY` set in the host's environment settings.
4. Change the template's `BETTER_AUTH_TRUSTED_ORIGINS` and analytics IDs in `netlify.toml`, which still point to the starter's own domains.
A public GitHub repo is the cheapest "encouraged" extra.

## Remaining steps only you can do

1. ~~Add OpenAI credits~~ Done (3 Nov 2026). Real gpt-4o-mini is verified for the UI actions and the chat agent. OpenAI calls retry 429 and 5xx responses with backoff, so a brief blip won't drop a card to the mock.
2. Restart `pnpm dev`, regenerate the demo spec so the cards show the `openai · gpt-4o-mini` badge, then rehearse the chat step.
3. Record the demo in **Clips** (https://clips.agent-native.com), make it **public**, and check the link in a logged-out window.
4. Optionally push to a public GitHub repo (keep `.env` uncommitted) and/or deploy.
5. Fill in the **submission form** (https://www.builder.io/hackathon/submit): name, contact, team, description, pre-existing work and the Clips link. Accept the rules, submit **before Mon 9 Nov 2026, 11:59 PM PT**, and keep the confirmation.
