# Plan: [Feature name]

> The HOW. Produced from the approved spec during the Plan phase, after the
> Explore subagent has investigated the codebase. Approved by a human before
> implementation. Lives in `specs/<feature-slug>/plan.md`.

## Spec
Link: `specs/<feature-slug>/spec.md`

## Codebase findings
> What Explore learned about how the relevant code works today.
- [Where the relevant logic currently lives]
- [Patterns/abstractions to reuse]
- [Anything surprising that affects the approach]

## Approach
[The chosen design in a few sentences. Why this over alternatives.]

## Files to add / change
- `path/to/file` — [what changes and why]
- `path/to/new/file` — [new; responsibility]

## Contract / data changes
- [API signatures, schema migrations, event shapes — or "none"]

## Test strategy
- [Unit: which behaviors]
- [Integration / e2e: which flows]
- [How each acceptance criterion maps to a test]

## Task checklist
> Implement works these top-to-bottom, committing after each.
- [ ] [Task 1 — smallest shippable slice]
- [ ] [Task 2]
- [ ] [Task 3]
- [ ] Wire tests for every acceptance criterion
- [ ] Update docs / CLAUDE.md if conventions changed

## Risks & rollout
- [Risk + mitigation]
- [Feature flag? Migration order? Backout plan?]
