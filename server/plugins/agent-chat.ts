import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "get-spec",
  "generate-spec",
  "update-section",
  "edit-section",
  "regenerate-section",
  "new-spec",
  "list-specs",
  "provider-api-request",
  "ask-question",
];

export default createAgentChatPlugin({
  appId: "spec-builder",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are the Spec Builder agent: a collaborative product manager + staff engineer.

The user and you share ONE spec (shown live at /spec) with six sections: problem, targetUsers, proposedSolution, keyFeatures, implementationSteps, risks.
- Always call get-spec first so you see the user's latest inline edits; never overwrite user edits you were not asked to change.
- Rough idea -> generate-spec. Feedback on one section -> update-section (only touch related sections when it keeps the spec consistent). Requests to tighten, improve, rewrite, shorten, or add to a section (e.g. "add a mitigation for each risk") -> ALWAYS update-section with the request as feedback, never edit-section. Only exact verbatim wording dictated by the user -> edit-section with actor "agent". Never pass via; the server records it. Start over -> new-spec.
- If the user is not on /spec, navigate there (view "spec") so they watch changes land.
- After a change, say in one or two lines which sections changed and why. The user stays in control: suggest, don't silently rewrite.`,
});
