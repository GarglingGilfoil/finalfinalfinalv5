# Task Intake

Date: 2026-04-23
Owner: Art Director and Brand Systems Lead

Route/View: CV Parsing
Type: Creative Review + Direction Reset

## Verdict

The current parsing page is below the quality bar.

It feels unfinished, visually under-authored, and not premium enough for Ditto Jobs. The composition is too generic, the heading treatment is weak, the chip choreography is too passive, and the overall screen reads like a partially-finished loader rather than a confident product moment.

This must not be treated as a small polish pass.

The team needs to spend materially more time upgrading both the design and the animation. The next pass should be approached as a proper redesign exploration with animation studies, not as a quick CSS tuning exercise.

## Research-Informed Best-Practice Findings

The direction below is informed by current platform guidance and design-system motion principles:

- Apple HIG says loading states should show something immediately and, if the wait is longer, give people something meaningful to look at rather than a blank or generic indicator.
- Apple HIG says status feedback should be integrated near the thing it describes, not detached from it.
- Apple HIG says custom motion should be purposeful, brief, and supportive rather than decorative or distracting.
- Apple HIG says typography must carry hierarchy through weight, size, and contrast, and weak/light type treatments quickly undermine legibility and polish.
- Material motion guidance says transitions should maintain a clear focal point and avoid overly complex movement paths.
- Material choreography guidance says staggered creation can guide focus, but only if the motion has a single readable story.
- Atlassian accessibility guidance reinforces that reduced motion, contrast, reflow, and simplicity are quality requirements, not cleanup tasks.

Research references:
- [Apple HIG: Loading](https://developer.apple.com/design/human-interface-guidelines/loading)
- [Apple HIG: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Material Motion](https://m1.material.io/motion/material-motion.html)
- [Material Choreography](https://m1.material.io/motion/choreography.html)
- [Atlassian Accessibility Foundations](https://atlassian.design/foundations/accessibility)

## Full Creative Review

### 1. The current screen lacks authorship

It is clean, but it does not look designed enough. It looks like a placeholder that has been made tasteful, not a resolved premium experience. The current composition could belong to almost any SaaS app.

### 2. The motion is too ambient and not narrative

The chips drift, but they do not tell a story. We need the system to feel like it is recognizing the candidate in real time. Right now the motion is mostly atmospheric, not meaningful.

### 3. The heading treatment is weak

The current heading/status usage is too small, too distant, and too apologetic. It feels like accessory text rather than a designed part of the scene. The page needs a proper typographic lockup with hierarchy and presence.

### 4. The identity core is still too generic

Even with the monogram option, the center still feels too much like a placeholder circle. It needs a more intentional identity treatment with a stronger sense of visual gravity and refinement.

### 5. The chip system is too flat

The chips currently feel like evenly weighted labels. A premium experience needs tiers:
- one lead signal
- two to three supporting signals
- one or two quieter peripheral signals

Without scale hierarchy, the field feels static and generic.

### 6. The layout is still too card-like

The outer container still reads too strongly. The user should remember the central scene, not the rounded panel.

### 7. The lower half still underperforms

There is still too much dead space relative to the amount of meaningful content. The composition needs to feel more vertically intentional and more tightly orchestrated.

### 8. The current chips do not transform enough

For this concept to feel intelligent, the signals need to grow, shrink, reposition, swap, and recompose in a calm but designed way. A fixed orbit with mild drift is not enough.

### 9. The screen feels too polite

It is restrained, but not memorable. It does not yet communicate confidence, taste, or product maturity. It needs a more assertive visual point of view.

### 10. The overall result reads as unfinished

This is the most important point. The current page does not look like a final front-end prototype ready to show backend as a strong target. It looks mid-process.

## Direction Reset

Do not continue iterating the current approach in tiny increments.

The recommended move is to shift from a `quiet orbit` concept to an `art-directed signal field` concept with stronger hierarchy and field recomposition.

### Recommended animation concept: Signal Bloom + Field Recomposition

This is the new recommended direction.

The scene should work like this:

1. Immediate state
   - identity core visible instantly
   - heading lockup already present
   - no chips yet, or one very faint pre-signal

2. Signal bloom
   - first signal arrives cleanly and confidently
   - not just faded in, but introduced with a slight scale-up and positional settle

3. Progressive build
   - additional signals appear one by one
   - each new signal takes a meaningful authored position
   - visible field reaches only 4 to 5 signals

4. Stable field
   - one lead signal becomes dominant
   - supporting chips shrink slightly and move outward
   - the dominant chip can move closer to center or nearer to the heading lockup

5. Recomposition cycle
   - every few seconds, the field subtly reorganizes
   - one background chip exits
   - one new chip enters
   - lead emphasis transfers
   - chips are allowed to grow, shrink, and change position

This gives us a calmer but far more designed feeling than simple orbit drift.

## Motion Guidance

Required motion qualities:
- soft
- premium
- deliberate
- asymmetrical
- hierarchical
- readable

Required motion behaviors:
- staged appearance
- scale hierarchy
- positional transition
- signal replacement
- focus transfer
- minimal breathing on the identity core

Encouraged behaviors:
- active chip can enlarge slightly and move inward
- inactive chips can contract slightly and soften
- incoming chips can arrive from a blurred or lower-opacity state
- outgoing chips can shrink and dissolve rather than just vanish

Forbidden behaviors:
- fake scanner beams
- random floating chaos
- uniform orbiting
- spinner logic
- percentage theater
- flashing glow
- dramatic bounce
- exaggerated springiness
- fake AI visual noise

## Heading and Typography Direction

This needs a real typographic solution, not just a muted status line.

### Recommended structure

- Eyebrow: small, calm, optional
  - Example: `CV received`
- Primary heading: clear and confident
  - Example: `Building your profile`
- Secondary line: understated support
  - Example: `Reading the clearest signals from your CV`

### Rules

- The heading lockup should sit above or around the cluster, not far below it.
- The primary heading needs more size, more weight, and more visual intention.
- Avoid weak gray body-copy styling for the main message.
- Keep the copy short, but make it feel designed.
- Type should help anchor the composition, not trail behind it.

## Visual Direction

### Identity core

- Make the center feel more premium and more personal.
- Prefer a refined monogram treatment over a generic profile icon.
- Add one stronger halo or inner ring system, not several muddy effects.
- The center should feel like the gravity point of the scene.

### Chips

- Chips should not all be the same size.
- Use at least three chip states:
  - lead
  - support
  - peripheral
- Chip shape, padding, and typography should feel more bespoke and less like default tags.
- The active chip should be meaningfully different, but still elegant.

### Composition

- Tighten the whole system.
- Push the main cluster upward slightly.
- Reduce dead space.
- Make the whole page feel like one designed moment, not a sparse card with loose elements.

## Instructions To The Team

### UX and Design Systems Lead

- Do not make small iterative tweaks to the current composition.
- Produce at least 2 to 3 serious layout studies before implementation.
- Explore heading placement, identity-core treatment, and chip hierarchy intentionally.
- Define exact chip states, motion states, and desktop/mobile composition maps before the implementation pass.
- Spend more time than the last round on the typography and spatial system.

Required deliverables:
- one preferred composition direction
- one backup direction
- clear state diagram for signal behavior
- approved copy lockup for heading and support line

### Senior Frontend Craft Lead

- Treat this as a redesign pass, not a cleanup pass.
- Prototype a stronger animation system where chips can grow, shrink, reposition, and transition between prominence states.
- The scene must feel authored, not procedurally drifted.
- Tune easing, timing, and scale changes carefully.
- Build for reduced motion from the start, not at the end.

Required implementation work:
- support variable chip size states
- support positional transitions between states
- support one active lead chip and secondary/peripheral tiers
- support graceful enter/exit choreography
- preserve the same concept on mobile with fewer visible elements

### Principal Orchestrator

- Do not sign off on the next pass unless it feels materially more premium and more intentional than the current version.
- Require screenshots or capture clips of at least 2 motion candidates before convergence.
- Require a second review after implementation.
- Make it explicit that more time must be spent here. This route needs a genuine design and motion upgrade, not a fast pass.

## Time and Quality Expectation

This work needs more time.

That instruction is explicit.

The next pass should include:
- concept exploration
- heading/Typography exploration
- animation exploration
- chosen-direction build
- refinement review

If the team only has time for minor CSS edits, they should not proceed yet. That level of effort will not get this route to the required quality.

## Review Standard

The next version should pass all of these tests:

- Does it feel premium on first impression?
- Does it feel like Ditto recognized the candidate quickly?
- Does the heading feel designed, not incidental?
- Does the motion tell a story rather than just add atmosphere?
- Do the chips behave like an intentional system with hierarchy?
- Would we be comfortable showing this to backend as the target product experience?

If the answer to any of those is no, the design is still not ready.
