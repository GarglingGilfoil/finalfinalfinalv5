# Task Intake

Date: 2026-04-23
Owner: Art Director and Brand Systems Lead

Route/View: CV Parsing
Type: Motion Craft Correction Brief
Status: Ready for Agent Execution

## Context

The core creative direction remains correct.

This is not a concept reset.
This is not a full redesign restart.

This is a focused correction pass to address motion quality, chip-entry behavior, avatar vitality, and the overall sense of life in the signal field.

The user feedback is valid:
- the animation feels glitchy
- the pills do not feel correctly sized when they appear
- the text insertion currently reads as awkward assembly
- the avatar needs premium outward blue pulses and subtle breathing
- the chips need more color, movement, and life

The signed-off HIG-grounded brief still holds and should not be weakened.

## Direction Update

Shift the execution emphasis from:
`signal bloom + field recomposition`

to:
`signal bloom + premium pulse + stable footprints`

That means:
- chips must feel pre-composed before they appear
- the avatar becomes the living heartbeat of the scene
- color enters as controlled signal tint, not decoration
- movement becomes smoother, quieter, and more finished
- the scene should feel less like animated DOM and more like a premium product surface

## Priority Fixes

### 1. Fix chip glitchiness first

- Chips must not appear to discover their size after entering.
- Do not animate chip formation in a way that exposes width calculation or text insertion.
- Do not use reveal logic that makes the label feel like it is being injected into an unstable shape.
- Incoming chips must feel fully formed from frame one.

Required feel:
- footprint exists
- chip arrives
- chip settles
- text reads cleanly inside a stable object

### 2. Rebuild chip entry and exit behavior

- Replace any reveal treatment that causes chip-formation glitches.
- Entry should use restrained opacity, slight scale, and short positional settle.
- Exit should soften and shrink cleanly.
- Recomposition must never read like re-render churn.

### 3. Make the avatar a living center

- Add soft outward blue pulses from the outer ring.
- Pulses must be elegant, low-amplitude, and slow.
- The avatar can breathe subtly through a restrained grow/shrink cycle.
- The ring system should feel premium and branded, not sci-fi.

### 4. Give the chips more life

- Increase tonal differentiation by signal type.
- Keep the palette controlled and premium.
- Lead chip should carry the strongest presence.
- Support chips should feel noticeably alive but quieter.
- Peripheral chip should remain present and intentional, not washed out.

### 5. Upgrade the motion language

- Motion must remain purposeful.
- No return to ambient drift as the primary behavior.
- Chips may:
  - grow when promoted
  - contract when demoted
  - shift position when hierarchy changes
  - settle after entry
- One meaningful motion event at a time.

## What Must Not Regress

- do not regress to generic loader energy
- do not reintroduce orbit-for-orbit’s-sake motion
- do not overpopulate the signal field
- do not lose the desktop rule: `1 lead / 2 support / 1 peripheral`
- do not lose the mobile rule: `1 lead / 2 support`
- do not let shell chrome dominate again
- do not turn chip color into toy-pill styling
- do not let reduced-motion mode become an afterthought
- do not weaken the heading lockup

## File-Level Direction

### `src/components/CvParsingSignalLoader.tsx`

- Separate chip shell behavior from label reveal behavior.
- Add explicit avatar pulse layers and breathing hooks if needed.
- Preserve current scene-phase and tier logic.
- Avoid remount patterns that create unstable visual transitions.

### `src/lib/mock-cv-parsing-signals.ts`

- Add optional visual metadata only if it genuinely helps craft.
- Do not expand the signal set.
- Keep the first-read and rotation logic as-is.

### `src/pages/ApplicationParsingPage.tsx`

- No creative rewrite required.
- Preserve current route mounting and skip behavior.

### `src/app/styles.css`

- Most of the upgrade belongs here.
- Replace the chip reveal treatment with stable-footprint entry.
- Introduce outward blue pulses around the avatar ring.
- Add subtle avatar breathing.
- Increase chip vitality through tint, depth, and hierarchy-aware motion.
- Keep reduced-motion behavior deliberate and calm.

## Acceptance Bar

This pass is successful only if:
- chips appear fully composed
- pill size no longer glitches on entry or recomposition
- avatar feels alive through elegant outward pulses and slight breathing
- chips carry more personality, color, and life without becoming noisy
- the screen remains a refined signal surface rather than a flashy loader
- the static frame is still strong
- the motion feels smooth, expensive, and intentional

## Agent Instruction

This is a craft upgrade pass.

It is not a light CSS tweak.
It is not a concept rewrite.

The team must spend real time improving motion quality and visual finish.
If the result still feels glitchy, pale, or mechanically animated, it should be sent back again.
