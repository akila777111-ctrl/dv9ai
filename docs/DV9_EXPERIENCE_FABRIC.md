# DV9 EXPERIENCE FABRIC / GALLERY COCKPIT

Status: DESIGN + IMPLEMENTATION CONTRACT
Owner: DV9 OWNER
Core principle: ONE CORE / MANY SURFACES

## 1. Goal

DV9 must not have a separate brain for the website, Telegram, media, animation, or future mobile UI.

The target architecture is:

COR GPT / HYDRA CORE
  -> canonical state + events + receipts
  -> EXPERIENCE FABRIC
     -> WEB GALLERY COCKPIT
     -> TELEGRAM ADAPTER
     -> MOTION / STORY ADAPTER
     -> VOICE / CALL ADAPTER
     -> FUTURE MOBILE / DESKTOP ADAPTERS

Every surface renders the same verified system state through its own presentation adapter.

The Experience Fabric is NOT a second decision-making core. It is the projection, interaction, and presentation organ attached to the canonical core.

## 2. Problem in the current repository

Current web UI hard-codes module descriptions in `src/App.jsx`.
Current Telegram runtime keeps its own bot definitions, system prompts, commands, and direct AI-provider request path in `api/telegram.js`.

This is useful as an early implementation, but it creates duplicated truth:

- website knows one module map;
- Telegram knows another bot-role map;
- prompts are surface-local;
- status is surface-local;
- future media/animation would create a third copy.

The migration target is to move canonical identity, organ state, permissions, actions, and prompts behind one Core Gateway / Projection Layer.

## 3. Non-negotiable laws

1. ONE CORE TRUTH
   A surface never invents canonical system state.

2. SURFACES DO NOT OWN BUSINESS LOGIC
   Website, Telegram, voice, and motion render or submit intents; HYDRA/Core decides.

3. ONE EVENT CONTRACT
   Every organ speaks through a shared event envelope.

4. ONE ORGAN REGISTRY
   Organ names, capabilities, status, owner gates, and presentation metadata come from one registry.

5. OWNER > SURFACE
   A button or bot message cannot bypass OWNER_REQUIRED.

6. FAIL CLOSED
   Missing core state is rendered as UNKNOWN / OFFLINE, never guessed as healthy.

7. RECEIPT FIRST
   Consequential actions produce a receipt reference that can be shown on every surface.

8. PRESENTATION MAY DIFFER; MEANING MAY NOT
   Telegram can be concise and the web can be visual, but both must represent the same underlying state.

## 4. Canonical Core Event

Suggested contract:

```js
{
  event_id: "evt_...",
  event_type: "organ.status.changed",
  timestamp: "ISO-8601",
  source: "HYDRA|HYDRUNYA|NIXA|COBRA|FORGE|CORGPT|...",
  scope: "owner|project|organ|task|finance|media",
  subject_id: "...",
  severity: "INFO|NOTICE|WARNING|CRITICAL",
  owner_required: false,
  correlation_id: "...",
  receipt_ref: null,
  payload: {}
}
```

All adapters consume this contract or stable projections derived from it.

## 5. Canonical Organ Registry

Each organ should have one registry record:

```js
{
  id: "nixa",
  title: "NIXA",
  kind: "communication",
  status: "ONLINE|DEGRADED|OFFLINE|UNKNOWN",
  health: 0,
  capabilities: ["signal", "communication"],
  owner_gate_classes: [],
  presentation: {
    short_label: "NIXA",
    icon_key: "signal",
    gallery_group: "organs",
    priority: 50
  }
}
```

The presentation object contains display hints only. It must not contain authority or hidden business rules.

## 6. Projection Layer

The Experience Fabric should expose stable view models rather than forcing every surface to rebuild domain state from raw events.

Suggested projection:

```js
{
  projection_id: "organ:nixa",
  type: "organ",
  title: "NIXA",
  status: "ONLINE",
  status_text: "Communication layer healthy",
  primary_metric: null,
  secondary_metrics: [],
  attention: "NONE|LOW|MEDIUM|HIGH|OWNER_REQUIRED",
  last_event_at: "ISO-8601",
  actions: [
    { id: "open", label: "Open", authority: "READ" }
  ],
  media: [],
  receipt_ref: null
}
```

The website, Telegram, and future surfaces request the same projections.

## 7. Surface Adapters

### 7.1 Web Gallery Adapter

Turns projections into rich visual cards, timelines, galleries, filters, and action panels.

### 7.2 Telegram Adapter

Turns the same projections into short text, buttons, status summaries, and owner-safe actions.

Telegram-specific text length or keyboard formatting belongs here, not in Core.

### 7.3 Motion / Story Adapter

This is the basis for the user's "cartoons" / animated DV9 content.

It does NOT invent a separate DV9 story universe.
It consumes verified project and organ data and can create:

- storyboards;
- explainer scenes;
- animated status stories;
- concept sequences;
- captions;
- scene manifests;
- render jobs for a future video engine.

A motion manifest may look like:

```js
{
  story_id: "story_...",
  source_projection_refs: ["project:hydrosuit"],
  title: "HYDROSUIT GUARDIAN",
  scenes: [
    {
      order: 1,
      purpose: "problem",
      narration: "...",
      visual_brief: "...",
      duration_s: 5
    }
  ],
  factuality: "VERIFIED|CONCEPT|MIXED",
  owner_required: true
}
```

Concept content must be visually marked as CONCEPT when it is not a deployed capability.

### 7.4 Voice / Call Adapter

Consumes the same contact/project/task context and the Voice Presence Layer.
A completed call emits CALL_RECEIPT back into Core so web and Telegram immediately show the same result.

## 8. Gallery Cockpit

The main owner UI should feel like a living gallery, not an admin spreadsheet.

### 8.1 Top Core Rail

Persistent compact strip:

- CORE heartbeat;
- current HYDRA state;
- HYDROCOOL resource state;
- OWNER_REQUIRED count;
- active workers;
- queue depth;
- last receipt integrity state.

It must remain readable on a phone.

### 8.2 Gallery Navigation

Primary filters:

- ALL
- LIVE
- NEEDS ME
- ORGANS
- PROJECTS
- IDEAS
- MONEY
- CALLS
- MEDIA
- DEVICES

This is a projection filter, not separate pages with duplicated data.

### 8.3 Gallery Card Anatomy

Every card uses the same hierarchy:

1. identity;
2. status / state;
3. one meaningful primary signal;
4. latest event;
5. next action;
6. receipt / evidence when applicable.

Optional card zones:

- live preview;
- progress;
- media thumbnail;
- money signal;
- owner gate;
- timeline.

Cards should not show ten metrics merely because data exists.

### 8.4 Card classes

#### ORGAN CARD
Shows health, activity, queue, last event, open action.

#### PROJECT CARD
Shows stage, latest proof, next milestone, blockers, associated organs.

#### IDEA CARD
Shows raw idea -> strategist status -> proof needed -> patent/commercial path.

#### MONEY CARD
Shows VERIFIED money events only: opportunity, expected/confirmed amount, proof state, owner gate.
No fictional revenue counters.

#### CALL CARD
Shows person/organization, goal, state, next call/follow-up, receipt summary.

#### MEDIA CARD
Shows image/video/storyboard/concept asset, source project, factuality marker, publish state.

#### DEVICE CARD
Shows node, connectivity, resource governor state, trusted/untrusted, last seen.

## 9. Visual language

Target character: precise, premium, technological, calm.

Avoid:

- random neon rainbow;
- cyberpunk noise for its own sake;
- tiny telemetry everywhere;
- fake 3D controls;
- decorative gauges without decision value;
- different visual language for every module.

Prefer:

- dark obsidian / graphite base;
- high-contrast typography;
- soft layered surfaces;
- generous spacing;
- subtle depth;
- one semantic state accent at a time;
- motion only when it communicates change;
- large touch targets;
- mobile-first card rhythm.

Semantic colors must be centralized as design tokens and used consistently for ONLINE / WARNING / CRITICAL / OWNER_REQUIRED / UNKNOWN.

## 10. Design Tokens

Create one token module, for example:

`src/design/tokens.js`

Token groups:

- color.surface.*
- color.text.*
- color.state.*
- spacing.*
- radius.*
- shadow.*
- typography.*
- motion.*
- zIndex.*

Components must consume tokens instead of scattering raw values across CSS.

## 11. Component architecture

Suggested target tree:

```text
src/
  core-client/
    client.js
    projections.js
    contracts.js
  design/
    tokens.js
  experience/
    GalleryCockpit.jsx
    CoreRail.jsx
    GalleryFilters.jsx
    GalleryGrid.jsx
    cards/
      OrganCard.jsx
      ProjectCard.jsx
      IdeaCard.jsx
      MoneyCard.jsx
      CallCard.jsx
      MediaCard.jsx
      DeviceCard.jsx
  adapters/
    webProjectionAdapter.js
```

Server/core target:

```text
src/core/
  organRegistry.js
  eventContract.js
  projectionStore.js
  actionRouter.js
  ownerGate.js
```

Exact paths may adapt to existing architecture after repository audit; the boundary is more important than folder names.

## 12. Core Gateway

Surfaces should converge on a small stable interface:

READ:

- `GET /api/core/summary`
- `GET /api/core/gallery?filter=...`
- `GET /api/core/projection/:id`
- `GET /api/core/events?after=...`

INTENT:

- `POST /api/core/intents`

Example intent:

```js
{
  intent_id: "intent_...",
  surface: "web|telegram|voice",
  actor: "owner",
  action: "project.open",
  subject_id: "hydrosuit",
  parameters: {}
}
```

The surface submits intent. Core checks authority and returns a receipt/result.

## 13. Telegram migration

Current Telegram code should not be rewritten all at once.

Migration steps:

1. keep webhook/security/access logic;
2. extract BOT_DEFINITIONS identity into canonical organ/surface registry;
3. replace local `botPrompt()` composition with Core prompt/context projection;
4. replace direct domain-state formatting with projection renderer;
5. route non-trivial actions as Core intents;
6. retain Telegram transport-specific splitting, keyboards, webhook validation, and sendMessage logic in Telegram adapter.

Do not break working webhook behavior merely to achieve architectural purity.

## 14. Website migration

Current hard-coded module cards are replaced incrementally:

1. build GalleryCockpit with fixture projections;
2. preserve current GatewayStatus during transition;
3. introduce Core client;
4. switch gallery to live projections;
5. delete duplicated hard-coded module truth only after live source is tested;
6. keep graceful UNKNOWN/OFFLINE fallback.

## 15. Media / "cartoons" integration

The system should treat media as a first-class artifact.

Each generated media artifact records:

- artifact_id;
- source project/idea;
- source projection/receipt refs;
- media type;
- concept vs verified state;
- prompt/brief provenance;
- generation state;
- approval state;
- publication destinations;
- final asset reference.

This allows one concept to appear consistently on:

- website gallery;
- Telegram preview;
- animation/video;
- pitch material;
- future app.

## 16. Calendar / task integration

Calendar and HYDRUNYA are not decorative widgets.

A gallery card can show a next event or deadline from the canonical task/calendar projection.
Any change request becomes an intent and must preserve the authoritative connector/calendar result.

## 17. Cognitive load / HYDROCOOL UI mode

Experience Fabric consumes HUMAN_LOAD state.

When load is high:

- collapse low-priority cards;
- prioritize OWNER_REQUIRED + TODAY;
- suppress non-critical animation;
- reduce simultaneous notifications;
- show one recommended next action.

This is presentation throttling, not censorship of system state.

## 18. Security and privacy

- No secrets in gallery projections.
- No bot tokens or provider keys in client code.
- Owner-only projections stay owner-only.
- Public site projection is a separate sanitized projection, not a CSS-hidden owner view.
- External/public media must use explicitly approved artifact states.
- Every consequential action routes through Core authorization.

## 19. Phase plan

### Phase A — contracts + fixtures

- event contract;
- organ registry;
- projection schema;
- fixture gallery data;
- tests.

### Phase B — Gallery Cockpit

- design tokens;
- CoreRail;
- filters;
- core card components;
- responsive mobile/desktop layout;
- accessibility checks.

### Phase C — live Core projections

- Core Gateway read endpoints;
- gallery consumes live projections;
- fail-closed states;
- receipts visible.

### Phase D — Telegram convergence

- shared identity/context;
- projection rendering;
- intent routing;
- preserve working transport/security.

### Phase E — Media / Motion

- media artifact registry;
- storyboard manifest;
- gallery preview;
- Telegram preview;
- future renderer connector.

## 20. Acceptance criteria

1. The website and Telegram read organ identity from the same canonical registry.
2. A status change appears consistently on web and Telegram without duplicating domain rules.
3. Gallery data comes from projections, not hard-coded module descriptions.
4. Telegram transport remains independently testable.
5. No direct client secret exposure.
6. OWNER_REQUIRED cannot be bypassed by any surface.
7. Public projections cannot contain owner-only fields.
8. Gallery works at phone width first.
9. One component/token language is used across gallery cards.
10. Media artifacts include provenance and concept/verified marking.
11. A CALL_RECEIPT can appear in both web gallery and Telegram summary.
12. HYDROCOOL high human-load state reduces visual noise without hiding critical events.
13. Build, lint, and test suite remain green.

## 21. Definition of done for first usable slice

A first useful slice is complete when the owner can open one Gallery Cockpit and see:

- Core health;
- at least four canonical organs;
- active projects/ideas fixtures or live projections;
- OWNER_REQUIRED items;
- latest events;
- Telegram network state;
- one media/concept card;
- one safe action routed as an intent;

and the exact same organ identity/status can be rendered by Telegram from the shared source.

This first slice does not require deployment, autonomous financial actions, or a full video generator.
