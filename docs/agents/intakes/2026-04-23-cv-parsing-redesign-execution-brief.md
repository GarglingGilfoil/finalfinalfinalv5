# Task Intake

Date: 2026-04-23
Owner: Principal Orchestrator

Route/View: CV Parsing
Type: Redesign Execution Brief

## Governing Documents

This execution brief must be read together with:
- `docs/agents/intakes/2026-04-23-cv-parsing-creative-brief.md`
- `docs/agents/intakes/2026-04-23-cv-parsing-creative-reset-review.md`

These documents are the source of truth.

## Directive

Execute the parsing-page redesign as a serious art-direction and motion upgrade.

This is not a polish pass.
This is not a cleanup pass.
This is not a “make the current loader slightly nicer” pass.

The current implementation is below bar and reads as unfinished. The team must spend materially more time on the design quality, motion choreography, and typographic hierarchy.

## Design Goal

Ship a parsing screen that feels:
- premium
- authored
- calm
- intelligent
- personal
- visually resolved

The experience should feel like:
`We recognized you quickly and are now shaping your profile.`

It must not feel like:
- a generic orbit loader
- a fake parser
- a default pill cloud
- a half-finished placeholder

## Required Direction

Move from the current `quiet orbit` pattern to an `art-directed signal field` with:
- a stronger identity core
- a real heading lockup
- staged signal emergence
- tiered chip hierarchy
- recomposition over time

Required motion behaviors:
- identity core visible immediately
- first signal arrives quickly and confidently
- additional signals appear piece by piece
- lead/support/peripheral chip hierarchy
- chips may grow, shrink, reposition, soften, and swap over time
- one lead signal owns the focus at a time
- reduced-motion mode keeps the same story without drift-heavy motion

## Required UX / Composition Outcomes

- The heading must be intentionally designed and visually anchored to the cluster.
- The lower half of the panel must no longer feel empty or unresolved.
- The outer card must recede behind the scene.
- Desktop should feel composed, not sparse.
- Mobile should preserve the same concept with fewer visible signals.
- Skip must remain visible, obvious, and accessible.

## Preferred Copy Lockup

Use a stronger typographic lockup such as:
- Eyebrow: `CV received`
- Heading: `Building your profile`
- Support line: `Reading the clearest signals from your CV`

This can be refined, but the final result must feel intentional and premium.

## Agent Ownership

### Agent 1: UX / Behavior / Structure
Primary responsibility:
- `src/components/CvParsingSignalLoader.tsx`
- `src/lib/mock-cv-parsing-signals.ts`
- `src/pages/ApplicationParsingPage.tsx`

Responsibilities:
- redesign the interaction model and markup structure
- implement chip tiers and motion states in logic
- add clear data/state hooks for styling
- improve heading structure and content hierarchy
- keep the component future-friendly for backend-fed signals

Hard boundaries:
- Do not edit `src/app/styles.css`
- Do not revert or overwrite work from the styling agent

### Agent 2: Visual / Motion / Finish
Primary responsibility:
- `src/app/styles.css`

Responsibilities:
- redesign the visual system and animation treatment
- build a stronger composition, hierarchy, and motion feel
- make the heading lockup, identity core, and chip field feel premium
- support chip tier differences and recomposition states
- implement responsive and reduced-motion behavior cleanly

Hard boundaries:
- Do not edit TypeScript or TSX files
- Do not revert or overwrite work from the structure agent

## Shared Implementation Guardrails

- Front-end only. No backend calls.
- No progress bars, percentages, spinners, scanner beams, or AI theater.
- Do not make the motion busier in the name of creativity.
- Creativity must come from hierarchy, timing, transitions, typography, and composition.
- Keep the parsing route scoped to the existing application-step shell.
- Loop indefinitely until `Skip`.

## Required Deliverable Standard

The next implementation should feel materially more premium than the current one.

If the result still reads as “nice loader with pills,” it has failed.

## Review Gate

Before signoff, the next version must satisfy all of these:
- stronger heading presence
- stronger identity core
- more intentional chip hierarchy
- visible signal emergence story
- richer but restrained motion language
- cleaner composition on desktop and mobile
- reduced motion handled thoughtfully

The route is not done until it passes another creative review.
