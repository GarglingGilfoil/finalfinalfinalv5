# Ditto Jobs Route Definition of Done (Appendix)

Last updated: 2026-04-22  
Purpose: Define route-specific completion criteria tied directly to the review checklist.

## How This Appendix Works
A route is done only if:
1. All global checklist gates in [ditto-jobs-review-checklist.md](/Users/lutherdelport/Desktop/FINAL%20REBUILD/docs/agents/ditto-jobs-review-checklist.md) pass.
2. All route-specific Definition of Done (DoD) criteria below pass.
3. No unresolved P0/P1 issues remain.
4. Validation Review confirms both functional correctness and design fidelity.
5. Built output still feels premium, restrained, and intentional in code.

## Checklist Gate Mapping
- `G1`: Product Clarity and Journey
- `G2`: Interaction States
- `G3`: Responsive and Visual System
- `G4`: Copy and Content Quality
- `G5`: API Contract and Data Integrity
- `G6`: Accessibility and Robustness

## Route 1: Job View
Required gate focus:
- Must pass `G1` to `G6` entirely.

Route-specific DoD:
- Job headline block exposes role, company, location, and primary apply action.
- Salary display follows contract flags correctly (show/hide/range formatting).
- Description sections support both short and long content safely.
- Related jobs logic works with both non-empty and empty related sets.
- Closed/expired role state is explicit and non-broken.
- Layout preserves scanability and premium hierarchy on mobile and desktop.

## Route 2: User Auth
Required gate focus:
- Must pass `G1`, `G2`, `G3`, `G4`, and `G6`.
- `G5` required where auth API calls/contracts are involved.

Route-specific DoD:
- Sign-in and sign-up intent are obvious and reversible.
- Validation, error, and recovery messaging is concise and actionable.
- Keyboard navigation and focus order are reliable end-to-end.
- Success handoff returns users to intended next step cleanly.
- Built surfaces feel trustworthy and premium rather than generic auth boilerplate.

## Route 3: CV / File Upload
Required gate focus:
- Must pass `G1` to `G6` entirely.

Route-specific DoD:
- Upload constraints are clear before interaction.
- Progress, success, and failure states are explicit.
- Retry, replace, preview, and remove flows are predictable and safe.
- Missing-file and invalid-file edge cases do not break flow.
- Built upload UI feels calm, guided, and product-grade rather than like a generic uploader.

## Route 4: Career and Education Confirmation
Required gate focus:
- Must pass `G1` to `G6` entirely.

Route-specific DoD:
- Existing parsed/imported data is editable without confusion.
- Required vs optional fields are clearly differentiated.
- Validation errors are field-specific and non-generic.
- Continue action is disabled/enabled in line with validation state.
- Form density stays readable and premium on mobile and desktop.

## Route 5: Job Application Success
Required gate focus:
- Must pass `G1`, `G2`, `G3`, `G4`, and `G6`.
- `G5` required for any dynamic confirmation content.

Route-specific DoD:
- Success confirmation is immediate and unambiguous.
- Next actions are clear (view jobs, track status, return home).
- Confirmation copy and metadata match the completed action context.
- No dead-end state on mobile or desktop.
- Final screen maintains confidence and momentum instead of feeling like a generic confirmation dump.

## Route Completion Record Template
```md
Route:
Review date:
Reviewer set:
Review mode: Validation

Global checklist result:
- G1:
- G2:
- G3:
- G4:
- G5:
- G6:

Route-specific DoD result:
- Criterion 1:
- Criterion 2:
- Criterion 3:
- Criterion 4:
- Criterion 5:

Open issues by severity:
- P0:
- P1:
- P2:
- P3:

Final decision: Go / No-Go
```
