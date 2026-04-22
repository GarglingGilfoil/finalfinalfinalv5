# Ditto Jobs Task Intake Template

Last updated: 2026-04-22  
Purpose: Standardize handoff before work starts so routing, implementation, and review stay focused.

## When To Use
- Use before any non-trivial task or route change.
- Required when activating more than one agent.
- Required for route-level work and any API contract changes.
- Required before Preventive Review on risky routes.

## Required Fields
- `Route/View`
- `Goal`
- `Constraints`
- `Acceptance Criteria`
- `Active Agent Set`

## Optional Fields
- `Current State`
- `Non-Goals`
- `Dependencies`
- `Open Risks`
- `Preventive Review Needed` (`Yes` / `No`)
- `Decision Log Trigger`

## Copy/Paste Intake Template
```md
# Task Intake

Date:
Owner:

Route/View:
Goal:
Constraints:
Acceptance Criteria:
Active Agent Set:

Current State:
Non-Goals:
Dependencies:
Open Risks:
Preventive Review Needed:
Decision Log Trigger:
```

## Completion Rule For Intake
- Intake is complete only when acceptance criteria are specific and testable.
- If criteria are vague, Orchestrator must refine intake before implementation.
- If route risk is high, intake must explicitly say whether Preventive Review is required.
- If the task may change UX, layout, acceptance criteria, or visual direction at the route level, note the decision-log trigger up front.

## Example (Route-Level)
```md
# Task Intake

Date: 2026-04-22
Owner: Principal Orchestrator

Route/View: CV / File Upload
Goal: Tighten the upload route so it remains calm, premium, and functionally complete while keeping the existing application flow intact.
Constraints:
- Keep route focused and single-purpose.
- No invented backend behavior.
- No broad cross-route changes.
- Keep company/job context intact.
Acceptance Criteria:
- Upload constraints and states are clear before interaction.
- Upload, replace, preview, and remove flows work safely.
- Continue is enabled only when at least one valid file remains.
- Desktop and mobile layouts both feel intentional.
- Built UI feels premium and restrained in code, not like a generic uploader.
Active Agent Set: Orchestrator + Senior Frontend Craft Lead + Art Director and Brand Systems Lead

Current State: Route exists and is in active refinement.
Non-Goals: Reworking unrelated application routes.
Dependencies: Upload state model, preview/delete behavior, route shell.
Open Risks: Dense saved-file state may still feel too heavy; visual drift during iteration.
Preventive Review Needed: No
Decision Log Trigger: Yes, if uploader hierarchy or route-level visual direction changes.
```
