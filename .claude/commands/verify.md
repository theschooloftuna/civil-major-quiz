---
description: VERIFY phase - check the implementation against the spec's acceptance criteria
argument-hint: [feature slug]
---
You are running the VERIFY phase of this project's spec-driven development
process (see SDD-WORKFLOW.md).

Feature slug: $ARGUMENTS
Spec: `specs/$ARGUMENTS/spec.md`

Do this:
1. Re-read the spec's acceptance criteria and edge cases.
2. Run the full test suite, lint, and typecheck (commands are in CLAUDE.md).
   Report the results.
3. Go through each acceptance criterion individually and mark it PASS or FAIL
   with evidence — the test name that covers it, or the manual check you ran.
4. List every criterion or edge case that is unmet.

Outcome:
- If anything fails: summarize the gaps and recommend going back to the Plan
  phase. Do NOT mark the feature done.
- If everything passes: summarize the diff and draft a PR description that links
  the spec and lists the acceptance criteria as a checklist.
