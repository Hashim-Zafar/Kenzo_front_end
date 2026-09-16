/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS loader compiles TS for dependency-free contract tests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/") ? path.join(root, name.slice(2)) : name,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
};
require.extensions[".tsx"] = require.extensions[".ts"];
const { interactions } = require("../lib/interactions.ts");
const { interpretDirectives, canInteractWithMetric } = require("../lib/ui-directives.ts");
const { createInitialConversationUiState, applyConversationResponse, persistConversationUiState, loadConversationUiState, getMetricSectionId } = require("../lib/conversation.ts");
const { startConversation, sendInteraction, completeConversation, ApiError } = require("../lib/api.ts");
const { normalizeApiError } = require("../lib/api-errors.ts");
const { validateStartConversation, isConversationResponse } = require("../lib/helpers.ts");
const question = (changes = {}) => ({ type: "metric_question", metric: "plans", question: "Tell us about your plans?", examples: [], ui: { type: "text_input", options: [], allow_custom: false }, ...changes });
const response = (changes = {}) => ({
  conversation_id: "conversation-1", lead_id: "lead-1", response: "Tell us about your plans?",
  conversation_status: "active", lead_status: "pending", qualification_complete: false,
  remaining_question_count: 3, can_proceed: false, next_action: "continue_chat", current_metric: "plans",
  ui_directives: [question()], ...changes,
});
const pursuit = { type: "pursuit_offer", metric: "plans", threshold: 1500, minimum_viable_threshold: 1000 };
process.env.NEXT_PUBLIC_API_BASE_URL = "https://example.test/";
process.env.NEXT_PUBLIC_API_AGENCY_ID = "test-agency";
process.env.NEXT_PUBLIC_API_SCHEMA_NAME = "test-schema";

async function withFetch(mock, run) {
  const original = global.fetch;
  global.fetch = mock;
  try { await run(); } finally { global.fetch = original; }
}

test("start and all five interactions use exact V4 endpoints, direct bodies and tenant headers", async () => {
  const requests = [];
  await withFetch(async (url, options) => { requests.push({ url, ...options }); return Response.json(response()); }, async () => {
    const started = await startConversation({ name: "Hashim", email: "hashim@example.com" });
    assert.equal(started.lead_id, "lead-1");
    const bodies = [interactions.metricText("plans", "My plans"), interactions.structuredAnswer("plans", false), interactions.structuredAnswer("plans", 15000), interactions.structuredAnswer("plans", "enterprise"),
      interactions.generalText("I don't want to continue."), interactions.askKenzo("Do you work with SaaS?"),
      ...["repeat_question", "explain_question", "accept_pursuit", "decline_pursuit", "continue_pursuit", "accept_pursuit_threshold", "keep_pursuit_preference"].map(action => interactions.action(action, "plans"))];
    for (const body of bodies) await sendInteraction("conversation-1", body);
    assert.equal(requests[0].url, "https://example.test/conversations/start");
    assert.deepEqual(JSON.parse(requests[0].body), { name: "Hashim", email: "hashim@example.com" });
    assert.deepEqual(requests.slice(1).map(r => JSON.parse(r.body)), bodies);
    for (const request of requests) {
      assert.equal(request.headers.get("X-Agency-ID"), "test-agency");
      assert.equal(request.headers.get("X-Schema-Name"), "test-schema");
      assert.equal(request.headers.get("Content-Type"), "application/json");
    }
    assert.ok(requests.slice(1).every(r => r.url === "https://example.test/conversations/conversation-1/messages"));
  });
});

test("hard disqualification and a zero remaining count never locally complete active qualification", () => {
  const active = response({ lead_status: "unqualified", remaining_question_count: 0,
    ui_directives: [{ type: "hard_disqualification" }, pursuit] });
  assert.equal(interpretDirectives(active).acceptsInput, true);
  assert.equal(interpretDirectives(active).terminal, false);
  assert.equal(interpretDirectives(response({ ui_directives: [{ type: "qualification_complete" }] })).terminal, false);
});

test("completed unqualified overrides continue_chat; abandoned and end directives disable all input", () => {
  for (const changes of [
    { conversation_status: "completed", lead_status: "unqualified", next_action: "continue_chat" },
    { conversation_status: "abandoned", can_proceed: true, next_action: "show_booking_cta" },
    { ui_directives: [{ type: "conversation_end" }] }, { next_action: "end_chat" },
  ]) {
    const view = interpretDirectives(response(changes));
    assert.equal(view.acceptsInput, false);
    assert.equal(view.showBooking, false);
  }
});

test("qualified and warm success offer booking without requiring next_action; auto_advance does not invent navigation", () => {
  for (const lead_status of ["qualified", "warm"]) {
    const r = response({ conversation_status: "completed", qualification_complete: true, lead_status, can_proceed: true, ui_directives: [] });
    assert.equal(interpretDirectives(r).showBooking, true);
    assert.equal(interpretDirectives({ ...r, can_proceed: false }).showBooking, false);
    assert.equal(interpretDirectives({ ...r, next_action: "end_chat" }).showBooking, false);
  }
  assert.equal(interpretDirectives(response({ next_action: "auto_advance" })).acceptsInput, true);
});

test("multiple directives create only observed questions and retain current context on missing focus", () => {
  let state = createInitialConversationUiState(response());
  state = applyConversationResponse(state, response({ current_metric: "other", response: "Let's look at the next question.", ui_directives: [
    question({ metric: "other", question: "Another question?" }),
    { type: "metric_not_available_yet", metric: "unseen" }, { type: "focus_metric", metric: "unknown" },
  ] }), interactions.metricText("plans", "Our plans"));
  assert.deepEqual(state.blocks.map(b => b.metric), ["plans", "other"]);
  assert.equal(state.blocks[1].isExpanded, true);
  assert.equal(state.generalMessages.at(-1).content, "Let's look at the next question.");
  assert.equal(canInteractWithMetric(state.conversation, "unseen"), false);
  assert.equal(state.conversation.current_metric, "other");
  state = applyConversationResponse(state, response({ current_metric: "other", ui_directives: [{ type: "focus_metric", metric: "plans" }] }));
  assert.ok(state.blocks.every(b => b.isExpanded));
  assert.equal(canInteractWithMetric(state.conversation, "plans"), true);
  assert.notEqual(getMetricSectionId("a_b"), getMetricSectionId("a-b"));
});

test("Ask Kenzo preserves pursuit; qualification replies use only backend pursuit directives", () => {
  let state = createInitialConversationUiState(response({ remaining_question_count: 0, ui_directives: [pursuit] }));
  state = applyConversationResponse(state, response({ ui_directives: [], response: "Agency answer" }), interactions.askKenzo("An agency question"));
  assert.equal(state.blocks[0].pursuit.type, "pursuit_offer");
  assert.equal(state.askMessages.length, 2);
  state = applyConversationResponse(state, response({ ui_directives: [], response: "Let's discuss" }), interactions.action("accept_pursuit", "plans"));
  assert.equal(state.blocks[0].pursuit, undefined);
  state = applyConversationResponse(state, response({ ui_directives: [], response: "I understand." }), interactions.metricText("plans", "Too expensive"));
  assert.equal(state.blocks[0].pursuit, undefined);
  assert.equal(state.blocks[0].messages.at(-1).content, "I understand.");
  state = applyConversationResponse(state, response({ ui_directives: [{ type: "pursuit_decision", metric: "plans", proposed_value: null, threshold: null }] }));
  assert.equal(state.blocks[0].pursuit.type, "pursuit_decision");
  state = applyConversationResponse(state, response({ current_metric: "next", ui_directives: [] }), interactions.action("keep_pursuit_preference", "plans"));
  assert.equal(state.blocks[0].pursuit, undefined);
});

test("drafts and observed history stay separate from backend state and clear only after acknowledged submission", () => {
  const state = createInitialConversationUiState(response());
  state.drafts["metric:plans"] = "draft";
  state.drafts.ask_kenzo = "agency question";
  const next = applyConversationResponse(state, response({ ui_directives: [], response: "Clarify your answer" }), interactions.metricText("plans", "draft"));
  assert.equal(state.drafts["metric:plans"], "draft");
  assert.equal(state.blocks[0].messages.length, 1);
  assert.equal(next.drafts["metric:plans"], "");
  assert.equal(next.drafts.ask_kenzo, "agency question");
  assert.equal(next.conversation.qualification_complete, false);
  assert.equal(next.blocks[0].messages.length, 3);
  const general = applyConversationResponse(next, response({ ui_directives: [], response: "Noted" }), interactions.generalText("A correction"));
  assert.equal(general.generalMessages.length, 2);
  assert.equal(general.askMessages.length, 0);
});

test("session storage restores questions, drafts, pursuit and closed state; corrupt or wrong-tenant sessions fail safely", () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const state = createInitialConversationUiState(response({ conversation_id: "restore", ui_directives: [pursuit] }));
  state.drafts.ask_kenzo = "A draft"; state.messagesClosed = true;
  persistConversationUiState(state, storage);
  assert.deepEqual(loadConversationUiState("restore", storage), state);
  assert.equal(loadConversationUiState("missing", storage), null);
  const previous = process.env.NEXT_PUBLIC_API_AGENCY_ID;
  process.env.NEXT_PUBLIC_API_AGENCY_ID = "different-agency";
  assert.equal(loadConversationUiState("restore", storage), null);
  process.env.NEXT_PUBLIC_API_AGENCY_ID = previous;
  assert.equal(loadConversationUiState("bad", { getItem: () => "{" }), null);
  const denied = { getItem() { throw Error("Denied"); }, setItem() { throw Error("Denied"); } };
  assert.equal(persistConversationUiState(state, denied), false);
  assert.deepEqual(loadConversationUiState("restore", denied), state);
});

test("string and validation-array API errors are normalized; network and malformed responses remain recoverable", async () => {
  for (const status of [400, 404, 409, 422, 500, 503]) {
    for (const detail of ["server trace", [{ loc: ["body", "email"], msg: "Invalid email" }]]) {
      await withFetch(async () => Response.json({ detail }, { status }), async () => {
        await assert.rejects(sendInteraction("conversation-1", interactions.generalText("Hi")), e => e instanceof ApiError && e.status === status && !e.message.includes("server trace"));
      });
    }
  }
  assert.equal(normalizeApiError(422, { detail: [{ loc: ["body", "email"], msg: "Invalid" }] }, "start").details.validationIssues[0].field, "email");
  await withFetch(async () => { throw new TypeError("fetch failed"); }, async () => {
    await assert.rejects(sendInteraction("conversation-1", interactions.generalText("Hi")), ApiError);
  });
  await withFetch(async () => Response.json({ ...response(), ui_directives: [{ type: "metric_question", metric: "plans" }] }), async () => {
    await assert.rejects(sendInteraction("conversation-1", interactions.generalText("Hi")), ApiError);
  });
  await withFetch(async () => Response.json(response({ conversation_id: "wrong" })), async () => {
    await assert.rejects(sendInteraction("conversation-1", interactions.generalText("Hi")), ApiError);
  });
});

test("unknown directives are ignored without rejecting otherwise valid workflow state", async () => {
  await withFetch(async () => Response.json(response({ ui_directives: [{ type: "future", value: 1 }] })), async () => {
    const result = await sendInteraction("conversation-1", interactions.generalText("Hi"));
    assert.deepEqual(result.ui_directives, []);
  });
});

test("explicit completion sends no body; nothing automatically invokes it", async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, "https://example.test/conversations/conversation-1/complete");
    assert.equal(options.method, "POST"); assert.equal(options.body, undefined);
    return new Response(null, { status: 204 });
  }, async () => assert.equal(await completeConversation("conversation-1"), null));
});

test("name/email are validated and normalized", () => {
  assert.equal(validateStartConversation({ name: " ", email: "bad" }).payload, null);
  assert.deepEqual(validateStartConversation({ name: " Hashim ", email: "HASHIM@example.com " }).payload, { name: "Hashim", email: "hashim@example.com" });
});

test("metric controls use complete backend metadata, including boolean choices and numeric/custom inputs", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { MetricBlock } = require("../components/conversation/MetricBlock.tsx");
  const state = createInitialConversationUiState(response());
  const props = { block: state.blocks[0], isActive: true, editable: true, disabled: false, pending: false, focusSignal: 0, draft: "", numericDraft: "",
    onToggle() {}, onDraft() {}, onNumericDraft() {}, onSendText() {}, onAnswer() {}, onAction() {} };
  const render = directive => renderToStaticMarkup(React.createElement(MetricBlock, { ...props, block: { ...props.block, question: directive } }));
  assert.match(render(question()), /<textarea/);
  assert.doesNotMatch(render(question()), /Show examples|5,000|10,000/);
  for (const type of ["single_select", "boolean_choice"]) {
    const directive = question({ description: "Backend description", examples: ["Backend example"], ui: { type, options: [{ label: "Backend option", value: false }], allow_custom: false } });
    const html = render(directive);
    assert.match(html, /Backend option/); assert.doesNotMatch(html, /<textarea/);
    assert.match(html, /Backend description/); assert.match(html, /Show examples/);
    assert.match(html, /<details[^>]*><summary[^>]*>Show examples/);
    assert.match(html, /More question actions<\/summary><button[^>]*>Repeat question/);
    assert.match(render({ ...directive, ui: { ...directive.ui, allow_custom: true } }), /Type your own answer/);
  }
  const numeric = question({ ui: { type: "number_input", options: [], allow_custom: false } });
  assert.match(render(numeric), /type="number"/); assert.doesNotMatch(render(numeric), /<textarea/);
  assert.match(render({ ...numeric, ui: { ...numeric.ui, allow_custom: true } }), /<textarea/);
  props.block = { ...props.block, pursuit: { type: "pursuit_decision", metric: "plans", threshold: null, proposed_value: null } };
  const decision = renderToStaticMarkup(React.createElement(MetricBlock, props));
  assert.match(decision, /Accept the proposed value/); assert.doesNotMatch(decision, />null</);
});

test("response validation requires the full metric UI contract and typed option values", () => {
  assert.equal(isConversationResponse(response()), true);
  assert.equal(isConversationResponse(response({ conversation_id: null })), false);
  for (const change of [
    { examples: undefined }, { examples: [1] }, { ui: undefined }, { description: 3 },
    { ui: { type: "single_select", options: [], allow_custom: undefined } },
    { ui: { type: "boolean_choice", options: [{ label: "No", value: null }], allow_custom: false } },
  ]) assert.equal(isConversationResponse(response({ ui_directives: [question(change)] })), false);
});

test("Ask Kenzo retains question metadata, typed options, drafts, and qualification context", () => {
  const directive = question({ examples: ["Any natural answer"], ui: { type: "single_select", options: [{ label: "Fifteen thousand", value: 15000 }], allow_custom: true } });
  const state = createInitialConversationUiState(response({ ui_directives: [directive] }));
  state.drafts["metric:plans"] = "around 12k";
  const next = applyConversationResponse(state, response({ ui_directives: [], response: "Agency answer" }), interactions.askKenzo("What do you do?"));
  assert.deepEqual(next.blocks[0].question, directive);
  assert.equal(next.drafts["metric:plans"], "around 12k");
  assert.equal(next.conversation.current_metric, "plans");
  assert.equal(next.askMessages.at(-1).content, "Agency answer");
});

test("development diagnostics include failed bodies and interactions, redact tenants, and stay off in production", async () => {
  const previous = process.env.NODE_ENV;
  const debug = console.debug, error = console.error;
  const logs = [];
  console.debug = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  const interaction = interactions.action("repeat_question", "plans");
  try {
    await withFetch(async () => Response.json({ detail: "Invalid interaction for test-agency", schema_name: "test-schema", token: "secret" }, { status: 400 }), async () => {
      process.env.NODE_ENV = "development";
      await assert.rejects(sendInteraction("conversation-1", interaction), ApiError);
      assert.deepEqual(logs[0], ["Kenzo interaction", interaction]);
      assert.equal(logs[1][1].status, 400);
      assert.deepEqual(logs[1][1].interaction, interaction);
      assert.deepEqual(logs[1][1].responseBody, { detail: "Invalid interaction for [redacted]", schema_name: "[redacted]", token: "[redacted]" });
      process.env.NODE_ENV = "production";
      await assert.rejects(sendInteraction("conversation-1", interaction), ApiError);
      assert.equal(logs.length, 2);
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
    console.debug = debug; console.error = error;
  }
});

test("rendered metric controls preserve backend values and scope actual click/submit handlers", async () => {
  const { MetricBlock } = require("../components/conversation/MetricBlock.tsx");
  const { PursuitChoices } = require("../components/conversation/PursuitChoices.tsx");
  const { ChatInput } = require("../components/conversation/ChatInput.tsx");
  const nodes = element => !element || typeof element !== "object" ? [] :
    [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
  const requests = [];
  const send = interaction => sendInteraction("conversation-1", interaction);
  const props = {
    block: createInitialConversationUiState(response()).blocks[0], isActive: true, editable: true,
    disabled: false, pending: false, focusSignal: 0, draft: "around 12k", numericDraft: "0",
    onToggle() {}, onDraft() {}, onNumericDraft() {},
    onSendText: message => send(interactions.metricText("plans", message)),
    onAnswer: value => send(interactions.structuredAnswer("plans", value)),
    onAction: (action, metric) => send(interactions.action(action, metric)),
  };
  await withFetch(async (_url, options) => { requests.push(JSON.parse(options.body)); return Response.json(response()); }, async () => {
    for (const value of [false, true, 0, 15000, "enterprise"]) {
      const directive = question({ ui: { type: typeof value === "boolean" ? "boolean_choice" : "single_select", options: [{ label: "Presentation only", value }], allow_custom: true } });
      const tree = nodes(MetricBlock({ ...props, block: { ...props.block, question: directive } }));
      await tree.find(node => node.type === "button" && node.props.children === "Presentation only").props.onClick();
      assert.deepEqual(requests.at(-1), { type: "structured_answer", metric: "plans", value });
    }
    const tree = nodes(MetricBlock({ ...props, block: { ...props.block, question: question({ ui: { type: "number_input", options: [], allow_custom: true } }) } }));
    await tree.find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.deepEqual(requests.at(-1), { type: "structured_answer", metric: "plans", value: 0 });
    await tree.find(node => node.type === ChatInput).props.onSubmit("around 12k");
    assert.deepEqual(requests.at(-1), { type: "metric_text", metric: "plans", message: "around 12k" });
    for (const [label, action] of [["Repeat question", "repeat_question"], ["Why are you asking this?", "explain_question"]]) {
      await tree.find(node => node.type === "button" && node.props.children === label).props.onClick();
      assert.deepEqual(requests.at(-1), { type: "action", action, metric: "plans" });
    }
    for (const directive of [pursuit, { type: "pursuit_decision", metric: "plans", proposed_value: 1500, threshold: 1500 }]) {
      const buttons = nodes(PursuitChoices({ pursuit: directive, disabled: false, onAction: props.onAction })).filter(node => node.type === "button");
      const actions = directive.type === "pursuit_offer" ? ["accept_pursuit", "decline_pursuit"] : ["accept_pursuit_threshold", "keep_pursuit_preference", "continue_pursuit"];
      for (const [index, button] of buttons.entries()) {
        await button.props.onClick();
        assert.deepEqual(requests.at(-1), { type: "action", action: actions[index], metric: "plans" });
      }
    }
  });
});
