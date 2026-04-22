# Ditto Jobs Agent Routing Matrix

Last updated: 2026-04-22  
This file defines default specialist routing, review mode selection, and execution rules for the Ditto Jobs rebuild.

## Activation Rules
- Use 1 to 3 agents by default.
- Use the Principal Orchestrator whenever more than one agent is active.
- Avoid full-team swarms.
- Keep scope route-by-route and task-by-task.
- Do not widen active agents unless the current route/task truly needs it.

## Operating Artifacts
- Intake before work: `ditto-jobs-task-intake-template.md`
- Completion criteria by route: `ditto-jobs-route-definition-of-done.md`
- Review gates and severity model: `ditto-jobs-review-checklist.md`
- Decision traceability: `ditto-jobs-decision-log.md`
- Canonical team definitions: `ditto-jobs-agent-team.md`

## Route Execution Standard
Every built route must be judged on both:
- functional correctness
- design fidelity and premium feel in code

Approved direction alone is not sufficient. A route can be technically correct and still fail review if the built UI feels flat, clumsy, or misaligned with approved hierarchy and restraint.

## Default Agent Bundles

| Task Type | Default Agents | Notes |
|---|---|---|
| New route direction | Orchestrator + Product/Journey Lead + Art Director | Lock page intent, hierarchy, and premium direction before code |
| Route implementation | Orchestrator + Senior Frontend Craft Lead + Frontend Architect | Default build trio for route code |
| Form-heavy route | Orchestrator + Product/Journey Lead + UX/Design Systems Lead | Use when state clarity, validation, and control behavior dominate |
| Contract-sensitive route | Orchestrator + API Contract and Mock Layer Engineer + Frontend Architect | Use when API shape, fixtures, handlers, or service boundaries can drift |
| Copy-critical route | UX Writer + Product/Journey Lead | Use for labels, helper text, validation, empty/error states |
| Premium polish pass | Orchestrator + Art Director + Senior Frontend Craft Lead | Use when structure is set and the task is fidelity, rhythm, restraint, and finish |
| Preventive Review | Orchestrator + QA Critic + route specialist(s) needed for the risk | Run before implementation for risky routes |
| Validation Review | Orchestrator + QA Critic + route specialist(s) needed for signoff | Run after implementation before route is marked done |
| Hard review | Orchestrator + QA Critic + Art Director + Product/Journey Lead + Senior Frontend Craft Lead (+ Frontend Architect as needed) | Default final route signoff set |

## Review Modes

### Preventive Review
Run before implementation when route risk is high.

Trigger examples:
- route introduces dense forms or multi-state interactions
- route has contract-sensitive behavior
- route has high visual fidelity risk
- route has accessibility or responsiveness traps
- route acceptance criteria are still soft or ambiguous

Primary focus:
- acceptance criteria quality
- missing states
- likely edge cases
- likely responsiveness traps
- likely contract mismatch

### Validation Review
Run after implementation before the route is marked done.

Primary focus:
- P0/P1 defects
- accessibility issues
- design fidelity gaps
- premium quality failures
- route-specific DoD compliance

## Hard Boundaries
- Research Lead does not approve architecture.
- Art Director does not define API contracts.
- UX and Design Systems Lead does not define backend entities.
- UX Writer does not define data structures.
- QA Critic does not author first-pass design direction.
- Frontend Architect does not rewrite product flow without Product/Journey input.
- Senior Frontend Craft Lead does not redefine product flow or API contracts without the relevant specialist.

## Route-by-Route Execution Policy
- Never run project-wide rewrites during route work unless explicitly approved.
- Activate only the agents required for the current route.
- Each route must have explicit acceptance criteria before implementation.
- Risky routes should pass Preventive Review before code begins.
- Every route must pass Validation Review before it is marked done.
- Each route must pass checklist gates and route-specific DoD before signoff.

Expected route order:
1. Job View
2. User Auth
3. CV / File Upload
4. Career and Education Confirmation
5. Job Application Success

## Decision Logging Rule
Log route-level decisions when they affect:
- UX behavior
- layout or composition
- acceptance criteria
- visual direction or fidelity rules
- architecture or contract behavior

Examples worth logging:
- a route uses guided progression rather than visible steppers
- a desktop layout keeps or removes a sticky rail
- a preview experience must be full-screen
- a PDF preview must not show a thumbnail rail

## Escalation and Conflict Handling
When disagreement occurs:
1. Orchestrator captures the exact decision conflict.
2. Each specialist provides one recommendation and one tradeoff.
3. Orchestrator issues a single final recommendation and acceptance criteria.
4. Team executes that recommendation unless a hard constraint changes.

## Lightweight Routing Playbook

### Tiny single-discipline task
- Use one specialist only.
- Skip Orchestrator unless scope expands.

### Multi-discipline task
- Assign Orchestrator first.
- Cap active specialists to the minimum required.
- Reassess every handoff to avoid drift.
- Log final recommendation when scope, UX, layout, architecture, contract, or acceptance criteria change.

### Review task
- Use the correct review mode, not a vague “review.”
- Preventive Review is for pre-build risk control.
- Validation Review is for post-build signoff.
- Hard review is reserved for route completion or severe disputed quality issues.
