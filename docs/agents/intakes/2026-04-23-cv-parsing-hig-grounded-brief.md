# Task Intake

Date: 2026-04-23
Owner: Principal Orchestrator

Route/View: CV Parsing
Type: Apple HIG Grounded Creative / UX Brief
Status: Creative Director Signed Off

## Objective

Define the CV parsing route as a premium, identity-led information scene that feels calm, intelligent, and immediately useful.

This is not a fake parser.
This is not a dashboard.
This is not a spinner with tags.

It is a composed signal surface that communicates:
`We recognized you quickly and we’re shaping your profile.`

## Research Basis

This brief is grounded in Apple’s official Human Interface Guidelines and should be interpreted through those principles during implementation and review.

Primary source pages:
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/?locale=en_us)
- [Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data)
- [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## Apple HIG Translation

### 1. Signals are information, not decoration

The `Charting data` guidance is directly applicable even though this route is not literally a chart.

The parsing scene is an information-display surface.
Therefore:
- the most important signal must be visually dominant
- supporting signals must be clearly secondary
- peripheral signals must recede
- the user should understand what matters at a glance

If all chips have the same weight, the design is failing.

### 2. Reveal detail gradually

Apple’s guidance to keep information simple and reveal detail progressively maps directly to the parsing route.

The scene must not appear fully composed at once.

Required information sequence:
1. identity core
2. primary heading lockup
3. first lead signal
4. support signals
5. stable field
6. subtle recomposition over time

This is the core story of the route.

### 3. Headline and support copy are interpretive tools

Apple’s `Charting data`, `Feedback`, and `Typography` guidance all reinforce the same idea:
people need descriptive text near the visual system to understand what they are seeing.

Therefore:
- the heading is not optional decoration
- the support line is not helper copy drifting elsewhere
- both must be part of the same visual moment as the signal field

### 4. Motion must be purposeful

Apple’s `Motion` guidance is explicit:
- do not add motion for its own sake
- do not rely on motion alone to communicate meaning
- make custom motion supportive, not distracting

Therefore:
- no ambient drift as the main behavior
- no fake scan logic
- no generic orbit for its own sake
- every movement must mean reveal, emphasis transfer, or recomposition

### 5. Typography must create the hierarchy

Apple’s `Typography` guidance sharpens the brief:
- hierarchy must come through size, weight, placement, and contrast
- weak or pale type immediately lowers perceived quality

Therefore:
- the primary heading must have real authority
- the eyebrow must feel intentional, not ornamental
- the support line must be subordinate but clearly legible

### 6. Layout must support readability and continuity

Apple’s `Layout` guidance emphasizes consistency, adaptability, and readable structure.

Therefore:
- the scene must feel composed on desktop
- mobile must preserve the same concept with fewer visible elements
- the lower half must not become unresolved dead space
- the route must not feel like a generic card floating in a shell

### 7. Accessibility is part of the concept

Apple’s `Accessibility` guidance means:
- meaning cannot live only in animation
- controls must be comfortably tappable
- visual hierarchy must also be understandable non-visually
- reduced motion must preserve the same narrative

Therefore:
- a non-visual equivalent of the visible signal story is required
- `Skip` must remain comfortably tappable
- reduced-motion mode must still read as a deliberate scene

## Creative Direction

### Core idea

This route should feel like an elegant signal composition, not a loading utility.

The user should feel:
- quickly understood
- calmly guided
- confident that the system has recognized something real

### Visual intent

- one strong identity core
- one clear heading lockup
- one lead signal
- two support signals
- one restrained peripheral signal on desktop only

The scene should feel authored, not generated.

### Motion intent

- identity visible immediately
- first signal arrives with confidence
- support signals join one by one
- emphasis transfers subtly
- one background signal occasionally exits while another enters
- the field recomposes without resetting
- movement must correspond to reveal, hierarchy change, or replacement
- movement must not exist as ambient decoration by itself

### Tone

- premium
- minimal
- calm
- legible
- intelligent
- human

Not:
- playful
- gimmicky
- over-animated
- scanner-like
- technical theater

## Experience Structure

### Required scene phases

1. `Intro`
   - identity core and heading lockup visible
   - no full signal field yet

2. `Bloom`
   - lead signal appears
   - first reveal should feel intentional and confident

3. `Build`
   - support signals join one by one
   - total field remains restrained

4. `Stable`
   - the scene settles into a composed state
   - one lead signal owns focus

5. `Recompose`
   - one non-lead signal yields
   - one new signal enters
   - emphasis may transfer
   - no full scene reset

## Content Rules

### Signal set

Preferred first-read set:
- `Front End Developer`
- `Cape Town`
- `React`
- `BComm Degree`
- `Technology`

Rotation set:
- `Advertising Industry`
- `Digital Agency`
- `JavaScript`
- `Team Lead`

### Visibility rules

- Desktop stable state: `1 lead`, `2 support`, `1 peripheral`
- Mobile stable state: `1 lead`, `2 support`
- On larger screens, a fifth signal may appear only during transition or recomposition, not as the default stable field
- Never show the whole phrase set at once
- Because this is a small information surface, visible signals should be fewer and larger rather than numerous and tiny

### Hierarchy rules

Every visible signal must have a role:
- `lead`
- `support`
- `peripheral`

If the scene cannot clearly communicate those roles in a static frame, it is not resolved.

Static-frame approval rule:
- if the scene does not feel clear, premium, and hierarchical in a still frame, it is not approved for animation polish

## Copy Direction

Recommended lockup:
- Heading: `Building your profile`
- Support line: `Reading the clearest signals from your CV`

Rules:
- an eyebrow is optional, not assumed
- only use an eyebrow if it clearly improves hierarchy
- keep copy short
- no marketing fluff
- no “AI thinking” language
- no scanner language
- no technical theatre

## Interaction / State Rules

- Loop indefinitely until `Skip`
- No progress bars
- No percentages
- No fake completion logic
- No terminal patterns
- No auto-dismiss

Precondition:
- the actual parsing state must be reachable for review
- auth gating must not mask the intended parsing surface during creative QA

## Choreography Constraints

- Only one new signal may enter at a time
- Only one non-lead signal may exit at a time
- No more than one major hierarchy shift may happen per recomposition cycle
- The lead signal may move inward or scale up slightly during emphasis transfer
- The whole field must not drift continuously as a substitute for choreography
- Support and peripheral signals may soften, contract, or yield when the lead changes

## Timing Guardrails

- Identity core and heading lockup visible immediately
- First lead signal appears within about `0.6s` to `1.0s`
- Support signals join one by one over the next about `1.5s` to `3.0s`
- The first recomposition should not happen earlier than about `5s`
- Recomposition should feel calm and readable, not busy or constant

## Accessibility Rules

- Motion must not be the only way to understand the scene
- Provide a non-visual equivalent for the recognized-signal story, not just a generic loading announcement
- `Skip` must meet comfortable control sizing
- Reduced motion must preserve reveal order and hierarchy shifts while minimizing spatial travel
- Signal count must reduce intentionally on smaller screens

## Shell and Container Rules

- The parsing scene must visually overpower inherited shell chrome
- Surrounding panel treatment must recede behind the scene
- The route must not read as a card-inside-card composition
- The user’s memory of the screen should be the identity core and signal field, not the surrounding container

## Agent Guidance

This brief is not yet ready for implementation briefing.

It must first be reviewed and refined by the Creative Director.

Only after Creative Director signoff should the team be briefed.

## Success Criteria

The route is successful only if:
- the scene reads as information, not decoration
- one signal clearly leads
- the heading has real authority
- the motion feels purposeful
- the static frame still makes sense without motion
- the route feels premium and complete
- the route is reachable in the correct state for review
