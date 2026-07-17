#!/usr/bin/env node
// PostToolUse hook (Write|Edit): auto-fix formatting/lint issues on the file
// that was just touched. Scoped to a single file so it stays fast — full
// project lint/typecheck/test runs happen explicitly in /implement and
// /verify (see CLAUDE.md commands).

import fs from "node:fs";
import { spawnSync } from "node:child_process";

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const raw = readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = String((input.tool_input || {}).file_path || "");
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) process.exit(0);
  if (!fs.existsSync(filePath)) process.exit(0);

  const result = spawnSync("pnpm", ["exec", "eslint", "--fix", filePath], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  // eslint exit code 1 = lint errors remain, 2 = eslint itself failed to run.
  if (result.status === 1 || result.status === 2) {
    console.error(
      `format-and-lint: eslint found issues in ${filePath} after autofix:\n` +
        (result.stdout || result.stderr || "").trim()
    );
    process.exit(2);
  }

  process.exit(0);
}

main();
