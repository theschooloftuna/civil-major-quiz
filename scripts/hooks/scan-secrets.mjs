#!/usr/bin/env node
// PreToolUse hook (Write|Edit): block writes that look like they contain a
// real secret. Best-effort pattern match, not a substitute for a real
// secret scanner — it exists to catch obvious accidents.

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

  const toolInput = input.tool_input || {};
  const filePath = String(toolInput.file_path || "");
  const content = String(toolInput.content ?? toolInput.new_string ?? "");

  if (!content) process.exit(0);

  // Files that legitimately contain example/placeholder secret-shaped text.
  if (/\.env\.example$/.test(filePath)) process.exit(0);
  if (/(^|\/)(specs|scripts\/hooks)\//.test(filePath)) process.exit(0);

  const placeholder =
    /(your[_-]?|example|changeme|replace|placeholder|xxxx|<[^>]*>|dummy|fake|test[_-]?key)/i;

  const patterns = [
    { label: "AWS access key ID", re: /AKIA[0-9A-Z]{16}/ },
    { label: "private key block", re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
    { label: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
    { label: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
    { label: "Stripe live key", re: /sk_live_[A-Za-z0-9]{16,}/ },
    { label: "Anthropic API key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
    { label: "OpenAI API key", re: /sk-[A-Za-z0-9]{32,}/ },
    {
      label: "hardcoded secret/password/token assignment",
      re: /(secret|api[_-]?key|password|passwd|token)\s*[:=]\s*['"][A-Za-z0-9/+_=-]{20,}['"]/i,
    },
  ];

  for (const { label, re } of patterns) {
    const match = content.match(re);
    if (match && !placeholder.test(match[0])) {
      console.error(
        `scan-secrets: blocked write to ${filePath || "(unknown file)"} — looks like a ${label}.\n` +
          `If this is a false positive, rename the variable so it doesn't match "${label}" heuristics, ` +
          `or move real secrets to an untracked .env file instead.`
      );
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
