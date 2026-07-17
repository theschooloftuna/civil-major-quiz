# Spec-Driven Development with Claude Code

A repeatable process that keeps the productivity of agentic coding while
reinstating engineering discipline. The spec is the source of truth; the agent
implements against it; nothing ships until it's verified against the spec.

## What goes where

```
your-repo/
├── CLAUDE.md                     # project constitution (read every session)
├── SDD-WORKFLOW.md               # this file
├── specs/
│   ├── _templates/
│   │   ├── spec.md               # copy this to start a feature spec
│   │   └── plan.md               # copy this for the implementation plan
│   └── <feature-slug>/
│       ├── spec.md               # the WHAT/WHY + acceptance criteria
│       └── plan.md               # the HOW + task checklist
└── .claude/
    ├── settings.json             # hooks: lint/test/secret-scan gates
    └── commands/
        ├── specify.md            # /specify <feature>
        ├── plan.md               # /plan <slug>
        ├── implement.md          # /implement <slug>
        └── verify.md             # /verify <slug>
```

## One-time setup

1. Drop these files into your repo root (merge `CLAUDE.md` with whatever you
   already have; run `/init` first if you don't have one).
2. Fill in the bracketed placeholders in `CLAUDE.md` — especially the build,
   test, and lint commands. The whole process leans on those being correct.
3. Review `.claude/settings.json` and point the hook commands at your real
   scripts. Verify the hook schema with `/hooks` inside Claude Code, since the
   exact keys evolve between versions.
4. Commit the scaffold so your whole team shares the same process.

## The per-feature loop

| Phase | Command | What happens | Your job |
|-------|---------|--------------|----------|
| 1. Specify | `/specify <feature>` | Claude interviews you and writes `specs/<slug>/spec.md`. No code. | Answer questions, edit, approve the spec. |
| 2. Plan | `/plan <slug>` | Plan mode + Explore subagent investigate the codebase, then write `plan.md`. No code. | Review the design and task list, resolve open questions, approve. |
| 3. Implement | `/implement <slug>` | Works the plan one task at a time, small commits, runs tests/lint after each. | Review diffs. If Claude flags the plan is wrong, decide the fix. |
| 4. Verify | `/verify <slug>` | Checks every acceptance criterion PASS/FAIL with evidence; preps a PR. | Merge when green, or send it back to Plan. |

On a failed verify, loop back to **Plan** — refine the spec or plan, don't patch
blindly.

## Habits that keep it working

- **`/clear` between phases.** Context bloat degrades agents. Your spec and plan
  files are the durable memory, so clearing the chat loses nothing.
- **Human-in-the-loop at the phase boundaries.** Specify and Plan both end
  waiting for your approval on purpose — that's where you catch ambiguity before
  it becomes code.
- **Small commits during Implement** so you can bisect and roll back cheaply.
- **Hooks, not vigilance.** Let PostToolUse run your formatter/typecheck and
  PreToolUse veto secrets or dangerous shell commands, instead of trusting
  yourself to remember.
- **Parallel work via git worktrees.** Run separate agents on separate
  worktrees so they don't fight over the same files.
- **Specs are living artifacts.** Keep them lightweight; don't over-specify
  early. Treat them as the contract, update them when the contract changes.

## Why this beats vibe coding

Vibe coding optimizes a single prompt and documents (maybe) later. SDD makes the
spec an executable build gate: the work is planned before it's written, scoped
to that plan while it's written, and validated against acceptance criteria
before it merges. The agent does the typing; you own the intent and the review.
