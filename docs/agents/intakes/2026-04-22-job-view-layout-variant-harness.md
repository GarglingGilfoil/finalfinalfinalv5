# Task Intake

Date: 2026-04-22
Owner: Principal Orchestrator

Route/View: Job View
Goal: Add a review harness that lets the team compare 5 materially different Job View layouts on the same route without changing the content model or touching header/footer.
Constraints:
- Keep header and footer untouched.
- Do not add any new content sections.
- Recommended jobs remain out of scope for layout switching.
- No backend or contract changes.
Acceptance Criteria:
- `/job/:jobId` supports a `layout` query param with variants `1` to `5`.
- Missing or invalid `layout` falls back to Layout 1.
- A compact review pagination control appears between the header and the Job View sheet.
- All 5 desktop variants preserve the same existing content blocks and the same apply flow.
- Every variant keeps one primary above-the-fold CTA and one lower repeat CTA.
- Mobile converges to one strong shared Job View pattern across all variants.
- Recommended jobs remain visually unchanged across variants.
Active Agent Set: Principal Orchestrator + Senior Frontend Craft Lead + Art Director and Brand Systems Lead

Current State: Job View is implemented as a single polished sheet and needs structured layout comparison before direction is locked.
Non-Goals: Reworking header, footer, recommended jobs, or job data contracts.
Dependencies: Current Job View blocks, routing model, and existing apply/auth route wiring.
Open Risks: Variants could drift into cosmetic-only differences or accidentally change content hierarchy on mobile.
Preventive Review Needed: No
Decision Log Trigger: Yes
