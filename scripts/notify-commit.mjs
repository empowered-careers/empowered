#!/usr/bin/env node
// Sends a "what shipped" email after a push to main.
// Reads recipients from .github/notify-recipients.json and commit data from
// the GitHub Actions event payload. Sends via Gmail API using an OAuth2
// refresh token. Pass --dry-run to print the email to stdout instead of sending.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { google } from "googleapis";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function groupFilesByTopDir(files) {
  const groups = new Map();
  for (const f of files) {
    const top = f.includes("/") ? f.split("/")[0] : "(root)";
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(f);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function renderCommitText(commit, repo) {
  const lines = [];
  const [subject, ...rest] = commit.message.split("\n");
  lines.push(`• ${subject}`);
  lines.push(
    `  ${commit.author?.name ?? "unknown"} — ${commit.id.slice(0, 7)}`
  );
  lines.push(`  https://github.com/${repo}/commit/${commit.id}`);
  const body = rest.join("\n").trim();
  if (body) lines.push("", body);
  const files = [
    ...(commit.added ?? []),
    ...(commit.modified ?? []),
    ...(commit.removed ?? []),
  ];
  if (files.length) {
    lines.push("", "  Files changed:");
    for (const [top, list] of groupFilesByTopDir(files)) {
      lines.push(`    ${top}/ (${list.length})`);
      for (const f of list.slice(0, 10)) lines.push(`      ${f}`);
      if (list.length > 10) lines.push(`      …and ${list.length - 10} more`);
    }
  }
  return lines.join("\n");
}

function renderCommitHtml(commit, repo) {
  const [subject, ...rest] = commit.message.split("\n");
  const body = rest.join("\n").trim();
  const files = [
    ...(commit.added ?? []),
    ...(commit.modified ?? []),
    ...(commit.removed ?? []),
  ];
  const filesHtml = files.length
    ? `<div style="margin-top:8px"><strong>Files changed:</strong><ul style="margin:4px 0 0 16px;padding:0">${groupFilesByTopDir(
        files
      )
        .map(
          ([top, list]) =>
            `<li><code>${escapeHtml(top)}/</code> (${list.length})<ul style="margin:2px 0 0 16px;padding:0">${list
              .slice(0, 10)
              .map((f) => `<li><code>${escapeHtml(f)}</code></li>`)
              .join("")}${
              list.length > 10 ? `<li>…and ${list.length - 10} more</li>` : ""
            }</ul></li>`
        )
        .join("")}</ul></div>`
    : "";
  return `
    <div style="margin-bottom:24px;padding:12px 16px;border-left:3px solid #ddd">
      <div style="font-weight:600;font-size:15px">${escapeHtml(subject)}</div>
      <div style="color:#666;font-size:13px;margin-top:2px">
        ${escapeHtml(commit.author?.name ?? "unknown")} —
        <a href="https://github.com/${repo}/commit/${commit.id}" style="color:#0366d6;text-decoration:none">${commit.id.slice(0, 7)}</a>
      </div>
      ${body ? `<pre style="margin:8px 0 0;white-space:pre-wrap;font-family:inherit;font-size:13px;color:#333">${escapeHtml(body)}</pre>` : ""}
      ${filesHtml}
    </div>`;
}

function buildEmail({ commits, repo, before, after, to, cc, from }) {
  const firstSubject = commits[0].message.split("\n")[0];
  const subject = truncate(
    `[${repo.split("/")[1]}] ${commits.length} commit${commits.length === 1 ? "" : "s"}: ${firstSubject}`,
    140
  );
  const compareUrl = `https://github.com/${repo}/compare/${before}...${after}`;

  const textBody = [
    `${commits.length} commit${commits.length === 1 ? "" : "s"} shipped to main.`,
    "",
    ...commits.map((c) => renderCommitText(c, repo)),
    "",
    `Full diff: ${compareUrl}`,
  ].join("\n");

  const htmlBody = `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:680px">
      <p style="font-size:14px;color:#333">${commits.length} commit${commits.length === 1 ? "" : "s"} shipped to <code>main</code>.</p>
      ${commits.map((c) => renderCommitHtml(c, repo)).join("")}
      <p style="font-size:13px;color:#666">
        <a href="${compareUrl}" style="color:#0366d6">View full diff on GitHub →</a>
      </p>
    </div>`;

  const boundary = `b_${Date.now().toString(36)}`;
  const headers = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    cc.length ? `Cc: ${cc.join(", ")}` : null,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join("\r\n");

  const body =
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
    `${textBody}\r\n\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
    `${htmlBody}\r\n\r\n` +
    `--${boundary}--`;

  return { subject, raw: `${headers}\r\n\r\n${body}` };
}

async function main() {
  const recipients = readJson(
    resolve(repoRoot, ".github/notify-recipients.json")
  );
  const to = recipients.to ?? [];
  const cc = recipients.cc ?? [];
  if (to.length === 0) {
    console.log("No recipients configured; skipping.");
    return;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error(
      "GITHUB_EVENT_PATH not set; this must run in GitHub Actions."
    );
    process.exit(1);
  }
  const event = readJson(eventPath);
  const commits = event.commits ?? [];
  if (commits.length === 0) {
    console.log("No commits in push event; skipping.");
    return;
  }
  if (commits.some((c) => c.message.includes("[skip notify]"))) {
    console.log("Found [skip notify] in a commit message; skipping.");
    return;
  }

  const repo = required("GITHUB_REPO");
  const before = process.env.BEFORE_SHA ?? "";
  const after = process.env.AFTER_SHA ?? "";
  const from = required("GMAIL_SENDER");

  const { subject, raw } = buildEmail({
    commits,
    repo,
    before,
    after,
    to,
    cc,
    from,
  });

  if (dryRun) {
    console.log("--- DRY RUN ---");
    console.log(`Subject: ${subject}`);
    console.log("---");
    console.log(raw);
    return;
  }

  const oauth2 = new google.auth.OAuth2(
    required("GMAIL_CLIENT_ID"),
    required("GMAIL_CLIENT_SECRET")
  );
  oauth2.setCredentials({ refresh_token: required("GMAIL_REFRESH_TOKEN") });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
  console.log(`Sent message id=${res.data.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
