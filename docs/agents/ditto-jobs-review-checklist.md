# Ditto Jobs Route Review Checklist

Last updated: 2026-04-22  
Use this checklist for both Preventive Review and Validation Review.

## Companion Artifacts
- Task intake template: `ditto-jobs-task-intake-template.md`
- Route-level Definition of Done appendix: `ditto-jobs-route-definition-of-done.md`
- Decision traceability log: `ditto-jobs-decision-log.md`
- Routing and review mode rules: `ditto-jobs-agent-routing.md`

## Review Modes

### Preventive Review
Run before implementation when route risk is high.

Use to check:
- whether acceptance criteria are specific enough to build against
- whether important states are missing before code starts
- whether likely responsiveness, accessibility, or contract traps are already visible
- whether the route direction is likely to drift in code

Expected output:
- risk list
- missing-state list
- acceptance criteria gaps
- preventive QA notes
- go / proceed with changes recommendation

### Validation Review
Run after implementation before any route/view is marked done.

Use to check:
- functional correctness
- defect severity
- accessibility
- responsive quality
- contract alignment
- design fidelity and premium feel in code
- route-specific Definition of Done compliance

Expected output:
- defect list by severity
- route-specific quality gaps
- design fidelity gaps
- go / no-go recommendation

## Quality Gates

### G1: Product Clarity and Journey
- Page purpose is obvious within seconds.
- Primary user action is unambiguous.
- Information hierarchy supports quick scanning.
- Route is not overbuilt for its objective.

### G2: Interaction States
- Loading states exist and are meaningful.
- Empty states exist and are useful.
- Error states exist and are actionable.
- Not-found states exist where applicable.
- Focus, hover, active, and disabled states are visible and correct.

### G3: Responsive and Visual System
- Mobile and desktop experiences are both intentional.
- Spacing, type scale, and component rhythm are consistent.
- Visual hierarchy is strong and aligned to route purpose.
- Visual system consistency is maintained with existing route patterns.
- Built UI feels premium, restrained, and designed in code.

### G4: Copy and Content Quality
- Copy is concise, premium, and clear.
- Labels and helper text reduce confusion.
- Error messages are specific and non-generic.

### G5: API Contract and Data Integrity
- UI data assumptions match the contract layer.
- No fake data is hardcoded inside components.
- Service layer calls stable endpoints as if backend exists.
- Response shape usage is consistent across list/detail/metadata flows.
- Pagination/filter/search/deep-link behavior matches contract expectations.

### G6: Accessibility and Robustness
- Keyboard interaction is functional and logical.
- Focus order and focus visibility are reliable.
- Semantic structure and heading hierarchy are coherent.
- Edge cases (missing logo, hidden salary, closed role, long text) render safely.

## Severity Model
- P0 Critical: blocks core route usage, severe accessibility failure, broken data flow, or crash.
- P1 High: major UX regression, incorrect contract usage, strong conversion risk, or serious fidelity failure on a core path.
- P2 Medium: noticeable quality issue that does not block core usage.
- P3 Low: polish issue or minor inconsistency.

## Required Review Output Format
For each issue:
- ID
- Severity (P0/P1/P2/P3)
- Review Mode (Preventive / Validation)
- Route/View
- Exact location (screen/component/state)
- Repro steps or trigger condition
- Expected behavior
- Actual behavior or predicted risk
- Recommended fix

## Go / No-Go Rule
- Go: no unresolved P0/P1 issues; route meets checklist expectations and route-specific DoD.
- No-Go: any unresolved P0/P1 issue, missing checklist coverage, or clear premium/fidelity failure on a core route surface.
