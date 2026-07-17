#!/usr/bin/env node
// PreToolUse hook (Bash): catch catastrophic shell commands before they run.
// This is a safety net, not a substitute for reviewing commands yourself.
// Exit 2 = block. Exit 1 = allow but warn (surfaced to Claude, not fatal).

import fs from "node:fs";

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

  const command = String((input.tool_input || {}).command || "");
  if (!command) process.exit(0);

  const blockPatterns = [
    { label: "recursive delete of root/home", re: /\brm\s+(-\w*r\w*f\w*|-\w*f\w*r\w*)\s+(\/|~\/?|\$HOME\/?)(\s|$)/ },
    { label: "recursive delete with wildcard root", re: /\brm\s+(-\w*r\w*f\w*|-\w*f\w*r\w*)\s+\/\*/ },
    { label: "fork bomb", re: /:\(\)\s*\{\s*:\s*\|\s*:\s*&?\s*\}\s*;\s*:/ },
    { label: "filesystem format", re: /\bmkfs(\.\w+)?\b/ },
    { label: "raw disk write", re: /\bdd\b[^\n]*\bof=\/dev\/(disk|sd|nvme|hd)/ },
    { label: "raw disk redirect", re: />\s*\/dev\/(disk|sd|nvme|hd)/ },
    { label: "world-writable recursive chmod on root", re: /\bchmod\s+(-R|--recursive)\s+([0-7]*7[0-7]*|a\+w|ugo\+w)\s+\// },
  ];

  const warnPatterns = [
    { label: "force push to a shared branch", re: /\bgit\s+push\s+[^\n]*--force[^\n]*\b(main|master)\b/ },
    { label: "force push (short flag)", re: /\bgit\s+push\s+[^\n]*\s-f\b/ },
    { label: "git reset --hard", re: /\bgit\s+reset\s+--hard\b/ },
    { label: "git clean -f", re: /\bgit\s+clean\s+[^\n]*-\w*f/ },
    { label: "skipping git hooks", re: /--no-verify\b/ },
    { label: "piping a remote script into a shell", re: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba)?sh\b/ },
  ];

  for (const { label, re } of blockPatterns) {
    if (re.test(command)) {
      console.error(
        `veto-dangerous-bash: blocked — command looks like "${label}".\n` +
          `Command: ${command}\n` +
          `If this is intentional, run it yourself outside Claude Code.`
      );
      process.exit(2);
    }
  }

  for (const { label, re } of warnPatterns) {
    if (re.test(command)) {
      console.error(
        `veto-dangerous-bash: warning — command looks like "${label}". Proceeding, but double-check this is intended.\n` +
          `Command: ${command}`
      );
      process.exit(1);
    }
  }

  process.exit(0);
}

main();
