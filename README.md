# Kenzo frontend · V4

A guided qualification experience built with Next.js 16 and React 19. The V4
conversation response owns qualification, lead status, pursuit transitions and
completion. The browser keeps an observed session history and presents that state.

## Run

Configure the project's existing environment variables in `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_AGENCY_ID=<agency UUID>
NEXT_PUBLIC_API_SCHEMA_NAME=<agency schema>
```

Use the API origin with no `/api` prefix. These are public tenant identifiers,
not authentication secrets. The backend must allow the frontend origin and tenant
headers through CORS.

```sh
npm install
npm run dev
```

## Architecture

- `types/types.ts`: exact V4 response/directive fields, five discriminated
  interaction types, and separate presentation types.
- `lib/api.ts`: sole HTTP client, environment configuration, tenant headers,
  response validation, and start/message/explicit completion methods.
- `lib/api-errors.ts`: normalized network, HTTP and FastAPI detail errors.
- `lib/interactions.ts`: typed constructors for all five interaction surfaces.
- `lib/ui-directives.ts`: server-state projection and terminal precedence.
- `lib/conversation.ts`: pure acknowledged-response reducer; observed metric
  blocks, pursuit presentation, dedicated Ask Kenzo/general histories and drafts.
- `features/conversation/use-conversation.ts`: session loading, request locking,
  retry/error handling, draft persistence, and focus events.
- `components/conversation/`: metric cards, pursuit choices, secondary assistant
  panels, progress/navigation, and a distinct terminal experience.

Only observed questions, pursuit directives, and `current_metric` establish metric
blocks. An unknown focus target or unavailable metric does not create an editable
card. A focus directive expands and focuses an observed card while the actual
current metric remains visible. Progress uses remaining questions and the backend
completion flag, never an invented total or local acceptance inference.

Metric cards render `metric_question.ui` directly: supplied single/boolean choices,
numeric inputs, and text inputs. Options submit their typed `value` as
`structured_answer`; natural answers submit `metric_text`. `allow_custom` enables
natural text alongside options/numeric input. Descriptions and examples come from
the same directive. “Show examples” is a local disclosure with no request; repeat
is inside a secondary menu and explanation uses “Why are you asking this?”.

All directives in each response are processed. Pursuit actions are shown only from
backend pursuit directives; no local pursuit phase is invented after a click.
Ask Kenzo preserves question metadata, pursuit controls and metric drafts unless
the backend explicitly changes them or moves/closes the conversation. Other
qualification responses replace pursuit controls with their supplied directives.
Development-only API diagnostics log interactions and failed status/body, redact
tenant data from failed bodies, and never include request headers.

Hard disqualification is
informational while active. Zero remaining questions is not completion.
Completed/unqualified and abandoned/end responses disable messages even when
`next_action` says `continue_chat`. `auto_advance` is accepted safely without an
invented destination or automatic API calls. Booking requires a server-authorized
CTA or completed qualified/warm result with `can_proceed`.

## Sessions and recovery

A tenant-scoped, versioned **sessionStorage** snapshot stores the latest server
response (including both IDs), observed questions/exchanges, drafts and UI state.
Successful start caches this snapshot before routing. In-memory fallback keeps a
tab usable when browser storage is unavailable; the UI explains that refresh
recovery is unavailable then. Obsolete or corrupt snapshots are rejected.

Drafts clear only after an acknowledged response. Requests are serialized across
all surfaces. Errors leave the server snapshot/history and typed input intact;
Retry resends the same interaction, while editing the draft supersedes that retry.
404/409/410 close message submission locally without fabricating a backend status.

The API has no conversation GET/hydration endpoint. Recovery is limited to this
browser session, and the next interaction is authoritative. A connection loss
can occur after the server processed a request; V4 has no supplied idempotency key
or reconciliation endpoint, so retries cannot guarantee exactly-once processing.

Ask Kenzo is available throughout active qualification. After a terminal response,
its history remains reviewable but no new `/messages` requests are sent. Post-close
Q&A would require a separately supported backend service.

## Booking

The existing `/conversations/[conversationId]/booking` route is preserved. It is
currently a **scheduling placeholder**, with no scheduler, booking API or URL
configured in this repository. The lead ID is already stored from `/start` for a
future real integration. The frontend does not invent a booking URL or call
`/complete` during normal completion. `completeConversation` is available only
for an explicit/recovery integration; its unspecified response body is `unknown`.

## Visual continuity

The existing `app/globals.css` palette, typography and spacing remain the visual
reference: pink surface `#fff7fb`, purple primary `#8a19a2` / container `#a63abd`,
dark text `#241728`, muted text `#504250`, and outline `#d4c1d2`. Controls use the
existing 10–12px radii; metric cards use 16px and outer cards 20px. The Geist fonts,
subtle grid background, card shadow and all Kenzo illustrations are retained.
Desktop has observed-metric navigation; mobile uses the same cards in document
flow, with touch-sized stacked pursuit choices and secondary collapsible panels.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Contract tests cover all request types/actions, headers, errors, multi-directive
responses, missing focus targets, pursuit continuity, completion edge cases,
refresh snapshots, backend-driven controls and development diagnostics. Tests use HTTP doubles; production
has no mock responses. The existing `next/font/google` setup needs Google Fonts
network access at build time.

### Browser checks

`tests/browser.cjs` drives Chromium with intercepted API responses; it never
creates real leads. It covers desktop (1440px), mobile (390px and 320px),
refresh/draft recovery, contextual inputs, retry/duplicate prevention, pursuits,
focus/unavailable directives, terminal states and the existing booking route.
It also checks horizontal overflow and uncaught browser errors, and saves
screenshots to `/tmp/kenzo-v4-screenshots`.

Install Playwright separately (for example in `/tmp/kenzo-browser`) and its Chromium
browser, then start the app with test tenant settings:

```sh
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4311 \
NEXT_PUBLIC_API_AGENCY_ID=00000000-0000-4000-8000-000000000001 \
NEXT_PUBLIC_API_SCHEMA_NAME=kenzo_test \
npm run dev -- --hostname 127.0.0.1 --port 4310
```

In a second terminal, run `node tests/browser.cjs`. If Playwright was installed
outside this repository, set `PLAYWRIGHT_MODULE_PATH` to that installation's
`node_modules/playwright` directory and `PLAYWRIGHT_BROWSERS_PATH` to its browser
cache. No API server is needed for these checks.
