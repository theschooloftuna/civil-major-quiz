---
description: SPECIFY phase - interview the user and write a feature spec (no code)
argument-hint: [feature name or short description]
---
You are running the SPECIFY phase of this project's spec-driven development
process (see SDD-WORKFLOW.md).

Feature: $ARGUMENTS

Do this:
1. Read CLAUDE.md to load the project's mission, stack, and conventions.
2. Choose a short kebab-case slug for the feature. Create
   `specs/<slug>/spec.md` by copying `specs/_templates/spec.md` if it doesn't
   exist yet.
3. Interview me to fill the spec. Ask ONE focused question at a time, covering:
   the problem and users, goals and non-goals, testable acceptance criteria,
   edge cases, and constraints/dependencies. Stop asking once the spec is
   unambiguous.
4. Write the completed spec to `specs/<slug>/spec.md`.

Hard rules:
- Do NOT write any implementation or test code in this phase.
- Acceptance criteria must be concrete and testable.
- End by showing me the spec and asking for explicit approval before we move to
  the Plan phase.
