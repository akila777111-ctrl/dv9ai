# CODEX PROMPT — DV9 EXPERIENCE FABRIC / GALLERY COCKPIT

You are the DV9 PRINCIPAL FRONTEND + SYSTEMS ENGINEER.

Work in the existing repository and preserve working behavior.

Read first:

- `docs/DV9_EXPERIENCE_FABRIC.md`
- `src/App.jsx`
- `src/App.css`
- `src/components/GatewayStatus.jsx`
- `api/telegram.js`
- existing tests and package scripts

## Mission

Build the first safe vertical slice of ONE CORE / MANY SURFACES.

The website, Telegram, future motion/media, and voice must not each become separate brains.
The Experience Fabric is a presentation/projection organ attached to the canonical DV9 core.

## Hard constraints

- Do not deploy.
- Do not push.
- Do not merge.
- Do not expose secrets.
- Do not weaken Telegram webhook/access controls.
- Do not enable paid AI calls automatically.
- Do not invent live system state.
- Use fixtures only when clearly marked as fixtures/concept/demo.
- Preserve fail-closed behavior.
- Keep OWNER_REQUIRED enforceable at Core/action-router level, not only in UI.
- Prefer pure modules and tests before wiring UI.

## Step 1 — audit

Report:

- current frontend structure;
- current Telegram boundary;
- existing status/data sources;
- duplicated module/role truth;
- safest insertion point for shared registry + projections;
- tests that cover current behavior.

Do not change code until the audit is complete.

## Step 2 — canonical contracts

Implement a minimal pure-JS contract layer for:

- CoreEvent;
- OrganRegistryEntry;
- GalleryProjection;
- Intent;
- Receipt reference validation.

Add focused tests.

Do not over-engineer persistence in this phase.

## Step 3 — canonical organ registry

Create one shared registry for at least:

- HYDRA
- HYDRUNYA
- NIXA
- COBRA
- HYDROCOOL
- FORGE
- COR GPT / cognitive core entry as appropriate to current naming rules
- Telegram surfaces currently represented in `api/telegram.js`

Separate canonical capabilities/authority from presentation hints.

Do not silently rename existing public bot identities unless required by an explicit compatibility mapping.

## Step 4 — projection fixtures

Create deterministic projection fixtures derived from the registry.
They must be explicitly marked DEMO/FIXTURE where no live data exists.

Projection types for first slice:

- organ;
- project;
- idea;
- call;
- media;
- device;
- money.

Money fixture must not claim real income.

## Step 5 — design system

Introduce centralized tokens.

Target visual character:

- premium;
- calm;
- technical;
- dark obsidian/graphite base;
- strong typography;
- layered cards;
- minimal semantic accents;
- mobile-first;
- no random cyberpunk clutter;
- no decorative gauges without decision value.

Implement reusable primitives rather than one-off CSS for each card.

## Step 6 — Gallery Cockpit

Build:

- CoreRail;
- GalleryFilters;
- GalleryGrid;
- OrganCard;
- ProjectCard;
- IdeaCard;
- CallCard;
- MediaCard;
- DeviceCard;
- MoneyCard.

Main filters:

ALL / LIVE / NEEDS ME / ORGANS / PROJECTS / IDEAS / MONEY / CALLS / MEDIA / DEVICES

Each card should prioritize:

identity -> status -> primary signal -> latest event -> next action -> evidence/receipt.

Do not dump raw telemetry.

## Step 7 — preserve GatewayStatus

Do not delete working GatewayStatus until equivalent live projection behavior exists.
During migration it may remain in the page or be wrapped into the new cockpit.

## Step 8 — Telegram convergence slice

Do not rewrite the whole Telegram endpoint.

Extract or import shared identity/registry data safely while preserving:

- token/secret resolution;
- constant-time secret comparison;
- owner access control;
- message splitting;
- Telegram API transport;
- webhook behavior;
- AI disabled/preview gates.

The target first slice is that web gallery and Telegram can render at least the same canonical organ identity/status source.

Do not move provider secrets client-side.

## Step 9 — Core intent stub

Implement a safe in-memory or pure testable intent router boundary for ONE non-consequential read/open action.

Example:

`project.open` or `projection.open`

Do not implement financial, legal, destructive, external-send, deploy, or secret-changing actions in this slice.

## Step 10 — human-load presentation

Add presentation handling for HYDROCOOL/HUMAN_LOAD fixture states:

- GREEN: normal gallery;
- YELLOW: reduce low-priority visual noise;
- RED: prioritize OWNER_REQUIRED + TODAY and suppress non-critical motion.

This affects presentation only; it must not hide critical state.

## Step 11 — media card

Add one concept-media projection demonstrating how a future animation/story artifact is shown.

It must visibly state CONCEPT/DEMO and include provenance/source reference fields.

Do not add a video generator in this task.

## Step 12 — quality gates

Run:

- existing test suite;
- new focused tests;
- lint;
- build.

Fix regressions without weakening existing safety checks.

## Final report

Return exactly these sections:

STATUS
BASELINE
ARCHITECTURE_FOUND
DUPLICATED_TRUTH_FOUND
CHANGED_FILES
CORE_CONTRACTS
GALLERY_IMPLEMENTED
TELEGRAM_CONVERGENCE
SAFETY_GATES
TESTS
LINT
BUILD
SCREEN_WIDTH_CHECKS
KNOWN_LIMITS
BEST_NEXT_CHANGE

If a live Core source does not yet exist, say so clearly and keep the UI on labeled fixtures rather than fabricating state.
