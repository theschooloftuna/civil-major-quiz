---
description: PLAN phase - investigate the codebase and write an implementation plan (no code)
argument-hint: [feature slug]
---
You are running the PLAN phase of this project's spec-driven development
process (see SDD-WORKFLOW.md).

Feature slug: $ARGUMENTS
Spec: `specs/$ARGUMENTS/spec.md`

Do this:
1. Read CLAUDE.md and the spec. If any spec "Open questions" remain, resolve
   them with me first.
2. Use the read-only Explore subagent to investigate how the relevant parts of
   the codebase work today. Summarize what you found (where logic lives,
   patterns to reuse, anything surprising).
3. Produce `specs/$ARGUMENTS/plan.md` from `specs/_templates/plan.md`: approach
   and rationale, files to add/change, contract/data changes, test strategy
   mapping each acceptance criterion to a test, an ordered task checklist, and
   risks/rollout.

Hard rules:
- Do NOT write implementation code in this phase.
- Prefer reusing existing patterns over introducing new ones; flag it if you
  must deviate from the conventions in CLAUDE.md.
- End by showing me the plan and the open questions, and wait for my explicit
  approval before implementation.
