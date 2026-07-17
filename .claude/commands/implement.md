---
description: IMPLEMENT phase - work the approved plan in small, verifiable steps
argument-hint: [feature slug]
allowed-tools: Edit, Write, Bash
---
You are running the IMPLEMENT phase of this project's spec-driven development
process (see SDD-WORKFLOW.md).

Feature slug: $ARGUMENTS
Spec: `specs/$ARGUMENTS/spec.md`
Plan: `specs/$ARGUMENTS/plan.md`

Do this:
1. Read CLAUDE.md, the spec, and the plan.
2. Work the plan's task checklist top-to-bottom, ONE task at a time. After each
   task:
   - run the test and lint/typecheck commands listed in CLAUDE.md,
   - make a single small, focused commit using the project's commit format,
   - tick the task off in `plan.md`.
3. Add or update tests so every acceptance criterion in the spec is covered.

Hard rules:
- Stay strictly scoped to the approved plan.
- If you discover the plan is wrong or incomplete, STOP immediately and tell me
  what's wrong and your proposed change. Do NOT redesign on your own.
- Do not weaken or delete tests to make a build pass.
