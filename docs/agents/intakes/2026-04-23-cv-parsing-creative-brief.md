# Task Intake

Date: 2026-04-23
Owner: Art Director and Brand Systems Lead

Route/View: CV Parsing
Goal: Re-direct the parsing route into a premium, minimal, identity-led loading state that communicates immediate recognition of the candidate through progressive signal emergence, not fake document parsing.
Constraints:
- Front-end only prototype.
- No backend calls.
- No fake parser theater, no progress bars, no percentages, no terminal or scanner language.
- Keep the route inside the existing application-step shell and preserve the existing `Skip` behavior.
- Do not widen scope into the career editor or unrelated routes.
- Keep the screen visually sparse and motion restrained.
Acceptance Criteria:
- The loading screen feels calm, premium, personal, and intentional.
- The center of the screen is a strong identity core, not a generic loading widget.
- Signals appear piece by piece rather than loading all at once.
- Only a small set of short signals is visible at any one time.
- One signal is subtly emphasized at a time without harsh glow or scale jumps.
- The screen loops cleanly until `Skip` is clicked.
- Desktop and mobile both preserve the same concept without chip crowding.
- Reduced-motion mode still feels polished and complete.
Active Agent Set: Art Director and Brand Systems Lead + UX and Design Systems Lead + Senior Frontend Craft Lead

Current State: The route already exists and has a looping fake-signal prototype, but it still feels too generic, too pre-baked, and too card-like for the intended premium direction.
Non-Goals:
- Building real CV parsing.
- Showing final parsed profile output.
- Simulating document extraction line by line.
- Introducing new route flow complexity.
Dependencies:
- Existing application-step shell.
- Existing parsing route and `Skip` continuation.
- Existing Ditto Jobs visual system and button/card primitives.
Open Risks:
- The current implementation can drift back toward a decorative generic loader if the staged reveal is not treated as a core requirement.
- Mobile can feel cramped if chip count is not deliberately reduced.
- The panel can dominate the experience if the identity core is not made stronger.
Preventive Review Needed: Yes
Decision Log Trigger: Yes, route-level visual direction and motion behavior are being explicitly redefined.

## Art Direction Brief

### Core Idea
This page should feel like:
"We recognized you quickly."

It must not feel like:
"Look at this elaborate animation pretending to parse a PDF."

This is an identity-led loading state, not a parser simulation. The screen should be almost blank. The strongest visual idea is a centered candidate identity core with a small constellation of extracted signals appearing around it over time.

### Primary Narrative
The experience should unfold in this order:
1. The user lands on a calm, nearly empty screen.
2. The central identity core is already present.
3. A first signal appears quickly.
4. Additional signals emerge one by one.
5. The screen settles into a quiet orbit of 4 to 5 visible terms.
6. The active emphasis moves subtly across the visible signals.
7. The loop continues indefinitely until `Skip`.

The page should never present a fully loaded arrangement in the first moment.

### Composition Rules
- Build around one strong centered identity core.
- Prefer a monogram-style candidate placeholder or a refined profile placeholder over a generic icon-only circle.
- Tighten the cluster. The avatar and signals should feel like one composed object, not separate pieces dropped into a large empty card.
- Keep the visual weight in the upper-middle of the stage. Do not let the lower half become a dead zone.
- Place status copy close to the cluster so it reads as part of the same moment.
- The outer route panel should recede. The content should feel authored; the container should not be the star.

### Signal Rules
- Visible signals must be short, crisp, and believable.
- Default visible count:
  - Desktop: 5
  - Mobile: 4
- Never show the full phrase set immediately.
- Use a stronger default first-read set:
  - `Front End Developer`
  - `Cape Town`
  - `React`
  - `BComm Degree`
  - `Technology`
- Rotate these in later:
  - `Advertising Industry`
  - `Digital Agency`
  - `JavaScript`
  - `Team Lead`
- Signals should feel like discovered candidate attributes, not taxonomy tags.

### Motion Rules
- Motion must be soft, calm, and confidence-building.
- Required behavior:
  - staged appearance of chips
  - subtle focus transfer between visible chips
  - gentle ambient drift only
  - occasional chip replacement after the stable state is reached
- Forbidden behavior:
  - spinners
  - bounce
  - fake OCR
  - scan beams
  - counting percentages
  - terminal effects
  - flashing active states
  - dramatic scaling or neon glow

### Status Copy
- Use one understated line only.
- Prefer one of:
  - `Reading key signals from your CV`
  - `Building your profile`
- Status lines may rotate slowly, but they must stay quiet and secondary.

## Instructions To Other Agents

### UX and Design Systems Lead
- Convert the above direction into a strict interaction pattern with minimal state.
- Define the visible-signal rules and the reveal cadence clearly enough that the implementation does not guess.
- Preserve one reusable component interface so real backend-fed signals can replace mock values later.
- Keep the screen functionally simple: no progress model, no completion logic beyond `Skip`.

Required interaction spec:
- State 1: identity core only.
- State 2: first signal enters.
- State 3: additional signals appear one by one until the visible set is full.
- State 4: stable orbit with one subtly active signal.
- State 5: occasional replacement of one background signal while maintaining the same overall layout.

### Senior Frontend Craft Lead
- Rebuild the current parsing surface to match this exact direction, not a broader interpretation.
- Remove visual heaviness from the current implementation.
- Make the cluster feel more deliberate, more compact, and more premium.
- Ensure the first render is sparse and that chips are introduced progressively.
- Keep positions stable and authored. Do not randomize layout on each render.
- Reduce the mobile chip count in logic, not by hiding arbitrary chips with CSS after the fact.
- Respect reduced motion by preserving the reveal sequence and focus changes with little or no drift.

Implementation guardrails:
- CSS transitions and keyframes are preferred over heavy motion tooling.
- The active chip should be only slightly brighter, sharper, or more elevated.
- The component must stay easy to feed with real signal data later.

### Principal Orchestrator
- Use this brief as the governing creative source of truth for the next parsing-page pass.
- Reject implementations that become busier, more explanatory, or more literal.
- Require a design-fidelity review before signoff.

## Concrete Implementation Recommendation

### Preferred Visual Structure
- One centered identity circle or monogram.
- One very soft ambient halo behind it.
- Four to five signal chips in a loose ellipse around it.
- One understated line of status copy below the cluster.
- `Skip` always visible, quiet but clear.

### Preferred Timing
- Identity core visible immediately.
- First chip appears after about `0.8s` to `1.2s`.
- Additional chips appear every about `1.4s` to `2.0s`.
- Once the visible set is full, keep the arrangement stable.
- Shift active emphasis every about `1.8s` to `2.4s`.
- Swap one background signal every about `5s` to `7s`.
- Do not reset the whole composition between cycles.

### Accessibility Requirements
- Preserve sufficient contrast in all chip states.
- `Skip` must remain keyboard accessible and obvious.
- Reduced motion must remove drift-heavy behavior but keep staged emergence.
- No meaning should depend on motion alone.

## Review Standard

The next version should be judged against this question:
"Does this feel like the system recognized the candidate immediately?"

If the answer is merely "it looks like a nice loader," the direction is still wrong.
