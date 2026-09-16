/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser integration runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const origin = process.env.KENZO_TEST_ORIGIN || "http://127.0.0.1:4310";
const api = "http://127.0.0.1:4311";
const output = process.env.KENZO_SCREENSHOTS || "/tmp/kenzo-v4-screenshots";
fs.mkdirSync(output, { recursive: true });
const firstQuestion = { type: "metric_question", metric: "team_plans", question: "What would you like to achieve?", examples: ["Build a team", "Launch a product"], ui: { type: "single_select", options: [{ label: "Launch", value: "launch" }, { label: "Grow", value: 15000 }], allow_custom: true } };
function response(changes = {}) {
  return { conversation_id: "browser-conversation", lead_id: "browser-lead", response: firstQuestion.question,
    conversation_status: "active", lead_status: "pending", qualification_complete: false,
    remaining_question_count: 2, can_proceed: false, next_action: "continue_chat", current_metric: "team_plans",
    ui_directives: [firstQuestion], ...changes };
}
async function waitFor(check, label) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw Error(`Timed out: ${label}`);
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "horizontal overflow");
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const queue = []; const requests = [];
      await page.route(`${api}/**`, async route => {
        const req = route.request();
        if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type,x-agency-id,x-schema-name",
        } });
        requests.push({ url: req.url(), body: req.postDataJSON(), headers: req.headers() });
        const item = req.url().endsWith("/start") ? { body: response() } : queue.shift();
        assert.ok(item, "unexpected API request");
        if (item.delay) await new Promise(resolve => setTimeout(resolve, item.delay));
        if (item.abort) return route.abort("failed");
        await route.fulfill({ status: item.status || 200, contentType: "application/json", body: JSON.stringify(item.body), headers: { "access-control-allow-origin": origin } });
      });
      await page.goto(`${origin}/conversations/start`);
      await page.getByLabel("Name", { exact: true }).fill("Hashim");
      await page.getByLabel("Email address", { exact: true }).fill("hashim@example.com");
      await page.screenshot({ path: `${output}/start-${viewport.width}.png`, fullPage: true });
      await page.getByRole("button", { name: "Start with Kenzo" }).click();
      await page.waitForURL("**/conversations/browser-conversation");
      await page.getByRole("heading", { name: firstQuestion.question }).waitFor();
      const metricInput = () => page.getByRole("textbox", { name: "Your response about Team Plans" });
      await metricInput().fill("Our draft should survive");
      await page.reload();
      await waitFor(async () => await metricInput().inputValue() === "Our draft should survive", "draft restore");
      assert.equal(requests.length, 1, "refresh must not invent GET or restart calls");

      // Examples are local; options submit typed backend data, never their labels.
      const examples = page.locator("details").filter({ has: page.locator("summary", { hasText: "Show examples" }) });
      await examples.locator("summary").click();
      await examples.getByText("Build a team", { exact: true }).waitFor();
      assert.equal(requests.length, 1);
      assert.equal(await metricInput().inputValue(), "Our draft should survive");
      await examples.locator("summary").click();
      assert.equal(await examples.getAttribute("open"), null);
      queue.push({ body: response({ ui_directives: [], response: "Thanks for your preference." }) });
      await page.getByRole("button", { name: "Grow", exact: true }).click();
      await page.getByText("Thanks for your preference.", { exact: true }).waitFor();
      assert.deepEqual(requests.at(-1).body, { type: "structured_answer", metric: "team_plans", value: 15000 });
      await metricInput().fill("Our draft should survive");

      // Repeat stays in a secondary disclosure and includes its metric and type.
      const more = page.locator("details").filter({ has: page.locator("summary", { hasText: "More question actions" }) });
      assert.equal(await more.getByRole("button", { name: "Repeat question" }).isVisible(), false);
      await more.locator("summary").click();
      queue.push({ body: response({ ui_directives: [], response: "Here is your question again." }) });
      await more.getByRole("button", { name: "Repeat question", exact: true }).click();
      await page.getByText("Here is your question again.", { exact: true }).waitFor();
      assert.deepEqual(requests.at(-1).body, { type: "action", action: "repeat_question", metric: "team_plans" });

      // Agency questions are separate from metric text and retain draft/current context.
      await page.getByRole("button", { name: "Ask Kenzo", exact: true }).click();
      queue.push({ body: response({ ui_directives: [], response: "Yes, we work with SaaS companies." }), delay: 250 });
      await page.getByRole("textbox", { name: "Ask Kenzo", exact: true }).fill("Do you work with SaaS?");
      await page.getByRole("form", { name: "Ask Kenzo", exact: true }).getByRole("button").click();
      await page.getByText("Kenzo is checking the agency knowledge…", { exact: true }).waitFor();
      await page.getByText("Yes, we work with SaaS companies.", { exact: true }).waitFor();
      assert.deepEqual(requests.at(-1).body, { type: "ask_kenzo", message: "Do you work with SaaS?" });
      assert.equal(await metricInput().inputValue(), "Our draft should survive");
      await page.getByRole("heading", { name: firstQuestion.question }).waitFor();

      // Rejected answers retain draft, do not create accepted history, and retry sends once.
      queue.push({ status: 503, body: { detail: "Temporary failure" } });
      await metricInput().fill("We want to grow");
      await metricInput().press("Enter");
      await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
      assert.equal(await metricInput().inputValue(), "We want to grow");
      const offer = { type: "pursuit_offer", metric: "team_plans", threshold: 1500, minimum_viable_threshold: 1000 };
      queue.push({ body: response({ remaining_question_count: 0, ui_directives: [offer], response: "Would you be open to discussing your preference?" }), delay: 300 });
      const beforeRetry = requests.length;
      await page.getByRole("button", { name: "Retry", exact: true }).dblclick();
      await page.getByRole("button", { name: "I'm open to discussing it", exact: true }).waitFor();
      assert.equal(requests.length, beforeRetry + 1);
      assert.equal(await metricInput().inputValue(), "");
      await page.getByText("0 questions remaining", { exact: true }).waitFor();
      await page.screenshot({ path: `${output}/pursuit-${viewport.width}.png`, fullPage: true });
      await noOverflow(page);

      // Pursuit text persists through a response without directives.
      queue.push({ body: response({ remaining_question_count: 0, ui_directives: [], response: "Tell me what works for you." }) });
      await page.getByRole("button", { name: "I'm open to discussing it", exact: true }).click();
      await page.getByText("Tell me what works for you.", { exact: true }).waitFor();
      assert.deepEqual(requests.at(-1).body, { type: "action", action: "accept_pursuit", metric: "team_plans" });
      await metricInput().fill("That's still too expensive");
      queue.push({ body: response({ ui_directives: [{ type: "pursuit_decision", metric: "team_plans", proposed_value: null, threshold: null }], response: "Which preference would you like to use?" }) });
      await metricInput().press("Enter");
      await page.getByRole("button", { name: "Accept the proposed value", exact: true }).waitFor();
      assert.deepEqual(requests.at(-1).body, { type: "metric_text", metric: "team_plans", message: "That's still too expensive" });
      assert.ok(!(await page.locator("main").innerText()).includes("null"));
      queue.push({ body: response({ current_metric: "availability", remaining_question_count: 1,
        ui_directives: [{ ...firstQuestion, metric: "availability", question: "When would you like to start?", ui: { type: "text_input", options: [], allow_custom: false } }], response: "When would you like to start?" }) });
      await page.getByRole("button", { name: "Keep my current preference", exact: true }).click();
      await page.getByRole("heading", { name: "When would you like to start?" }).waitFor();
      assert.equal(await page.locator('[id="metric-team_plans"] button').first().getAttribute("aria-expanded"), "false");
      // Multiple directives focus existing history without replacing the real current metric.
      await page.getByRole("button", { name: "Something else to share?" }).click();
      queue.push({ body: response({ current_metric: "availability", ui_directives: [{ type: "focus_metric", metric: "team_plans" }, { type: "hard_disqualification" }], response: "Let's revisit your plans." }) });
      await page.getByRole("textbox", { name: "General message" }).fill("Can we revisit the plans?");
      await page.getByRole("textbox", { name: "General message" }).press("Enter");
      await waitFor(async () => await metricInput().evaluate(el => el === document.activeElement), "focus directive input");
      assert.equal(await page.getByRole("textbox", { name: "Your response about Availability" }).isVisible(), true);
      assert.equal(await metricInput().isEnabled(), true, "hard disqualification is not terminal while active");
      // Unknown focus and unavailable metrics do not create fake blocks.
      queue.push({ body: response({ current_metric: "availability", ui_directives: [{ type: "focus_metric", metric: "missing" }, { type: "metric_not_available_yet", metric: "future" }], response: "That question is not available yet." }) });
      await page.getByRole("textbox", { name: "General message" }).fill("What about another question?");
      await page.getByRole("textbox", { name: "General message" }).press("Enter");
      await page.getByText("That question is not available yet.", { exact: true }).waitFor();
      assert.equal(await page.locator('[id="metric-missing"], [id="metric-future"]').count(), 0);
      // Context actions are literal actions, and long agency text wraps at every breakpoint.
      queue.push({ body: response({ current_metric: "availability", ui_directives: [], response: "A".repeat(800) }) });
      await page.locator('[id="metric-availability"]').getByRole("button", { name: "Why are you asking this?", exact: true }).click();
      await page.getByText("A".repeat(800), { exact: true }).waitFor();
      assert.equal(requests.at(-1).body.action, "explain_question");
      await noOverflow(page);
      await page.screenshot({ path: `${output}/qualification-${viewport.width}.png`, fullPage: true });
      // Terminal success, no automatic /complete, existing booking route.
      const finish = viewport.width === 320
        ? response({ conversation_status: "completed", lead_status: "unqualified", qualification_complete: true, remaining_question_count: 0, ui_directives: [], response: "Thanks for your time.", next_action: "continue_chat" })
        : response({ conversation_status: "completed", lead_status: viewport.width === 390 ? "warm" : "qualified", qualification_complete: true, remaining_question_count: 0, can_proceed: true, ui_directives: [{ type: "qualification_complete" }, { type: "show_booking_cta" }], response: "You're ready for the next step." });
      queue.push({ body: finish });
      await page.getByRole("textbox", { name: "Your response about Availability" }).fill("Next month");
      await page.getByRole("textbox", { name: "Your response about Availability" }).press("Enter");
      await page.locator("#conversation-terminal").waitFor();
      assert.equal(await page.getByRole("button", { name: "Send response" }).count(), 0);
      assert.equal(requests.filter(r => r.url.endsWith("/complete")).length, 0);
      await noOverflow(page);
      await page.screenshot({ path: `${output}/complete-${viewport.width}.png`, fullPage: true });
      if (viewport.width !== 320) {
        const booking = page.getByRole("link", { name: "Choose a meeting time →" });
        assert.equal(await booking.getAttribute("href"), "/conversations/browser-conversation/booking");
        await booking.click(); await page.waitForURL("**/booking");
      } else assert.equal(await page.getByRole("link", { name: "Choose a meeting time →" }).count(), 0);
      assert.equal(queue.length, 0);
      assert.deepEqual(errors, []);
      assert.ok(requests.every(r => r.headers["x-agency-id"] && r.headers["x-schema-name"]));
      console.log(`PASS ${viewport.width}px: start, refresh, Ask Kenzo, errors/retry, pursuit, focus, hard failure, terminal, overflow`);
      await context.close();
    }
    // Additional terminal/error paths in independent fresh sessions.
    for (const mode of ["abandoned", "conversation_end", "conflict", "decline", "accept_threshold", "continue_pursuit"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      let calls = 0;
      await page.route(`${api}/**`, async route => {
        const isStart = route.request().url().endsWith("/start");
        if (!isStart) calls++;
        let body = response();
        if (isStart && ["decline", "accept_threshold", "continue_pursuit"].includes(mode)) body.ui_directives = [mode === "decline"
          ? { type: "pursuit_offer", metric: "team_plans", threshold: null, minimum_viable_threshold: null }
          : { type: "pursuit_decision", metric: "team_plans", proposed_value: 1500, threshold: 1500 }];
        if (!isStart) {
          if (mode === "abandoned") body.conversation_status = "abandoned";
          if (mode === "conversation_end") body.ui_directives = [{ type: "conversation_end" }];
          if (mode === "conflict") body = { detail: "Already complete" };
          if (mode === "decline") assert.equal(route.request().postDataJSON().action, "decline_pursuit");
          if (mode === "accept_threshold") assert.equal(route.request().postDataJSON().action, "accept_pursuit_threshold");
          if (mode === "continue_pursuit") assert.equal(route.request().postDataJSON().action, "continue_pursuit");
        }
        await route.fulfill({ status: !isStart && mode === "conflict" ? 409 : 200, contentType: "application/json", body: JSON.stringify(body), headers: { "access-control-allow-origin": origin } });
      });
      await page.goto(`${origin}/conversations/start`);
      await page.getByLabel("Name", { exact: true }).fill("Hashim");
      await page.getByLabel("Email address", { exact: true }).fill("hashim@example.com");
      await page.getByRole("button", { name: "Start with Kenzo" }).click();
      await page.waitForURL("**/conversations/browser-conversation");
      if (["decline", "accept_threshold", "continue_pursuit"].includes(mode)) {
        const label = { decline: "Prefer to continue as-is", accept_threshold: "Use 1,500", continue_pursuit: "Continue discussing" }[mode];
        await page.getByRole("button", { name: label, exact: true }).click();
        await waitFor(() => calls === 1, mode);
        await page.getByRole("textbox", { name: "Your response about Team Plans" }).waitFor();
      } else {
        await page.getByRole("button", { name: "Something else to share?" }).click();
        await page.getByRole("textbox", { name: "General message" }).fill("I don't want to continue.");
        await page.getByRole("textbox", { name: "General message" }).press("Enter");
        await page.locator("#conversation-terminal").waitFor();
        assert.equal(await page.getByRole("button", { name: "Send response" }).count(), 0);
        await page.reload(); await page.locator("#conversation-terminal").waitFor();
        assert.equal(calls, 1);
      }
      console.log(`PASS ${mode}`);
      await context.close();
    }
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
