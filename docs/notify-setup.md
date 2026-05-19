# Commit notification email — one-time setup

This repo emails a summary of what shipped to `main` after every push, via the
`.github/workflows/notify.yml` workflow. Sender is a Google Workspace mailbox
authenticated through the Gmail API with an OAuth2 refresh token.

This document is the one-time setup. After it's done, edits to recipients are
just PRs against `.github/notify-recipients.json`.

## 1. Create / reuse a Google Cloud project

1. https://console.cloud.google.com → pick or create a project.
2. APIs & Services → Library → search **Gmail API** → **Enable**.

## 2. Create an OAuth client

1. APIs & Services → **OAuth consent screen**.
   - User Type: **Internal** (only works if the project is inside your
     Workspace org; otherwise pick **External** and add the sender as a test
     user).
   - App name, support email — fill anything reasonable.
   - Scopes: leave default; we'll request scope at token-mint time.
2. APIs & Services → **Credentials** → **Create Credentials** → **OAuth client
   ID**.
   - **Application type: Web application** (NOT Desktop — Desktop clients
     can't redirect to the OAuth Playground and you'll hit
     `Error 400: redirect_uri_mismatch`).
   - Name: `commit-notifier`.
   - **Authorized redirect URIs** → add:
     `https://developers.google.com/oauthplayground`
3. Copy the **Client ID** and **Client secret**.

## 3. Mint a refresh token (once)

The cleanest way is the Google OAuth Playground:

1. Open https://developers.google.com/oauthplayground/
2. Click the gear icon (top right) → **Use your own OAuth credentials** → paste
   client ID + secret → close.
3. In the left list, paste this scope into the input at the bottom:
   `https://www.googleapis.com/auth/gmail.send`
   → click **Authorize APIs**.
4. Sign in **as the Workspace sender account** (e.g.
   `notifier@empowered-careers.com`). This account becomes the `From:` address.
   Grant access.
5. On the next screen click **Exchange authorization code for tokens**.
6. Copy the **Refresh token**. Save it — it isn't shown again.

## 4. Add GitHub repo secrets

Settings → Secrets and variables → Actions → **New repository secret**. Add:

| Name                  | Value                                      |
| --------------------- | ------------------------------------------ |
| `GMAIL_CLIENT_ID`     | from step 2                                |
| `GMAIL_CLIENT_SECRET` | from step 2                                |
| `GMAIL_REFRESH_TOKEN` | from step 3                                |
| `GMAIL_SENDER`        | the email address that signed in at step 3 |

## 5. Add recipients

Edit `.github/notify-recipients.json`:

```json
{
  "to": ["someone@example.com", "another@example.com"],
  "cc": []
}
```

Commit and push. **If `to[]` is empty, the workflow exits without sending.**

## 6. Test

- Push a small commit to `main` (e.g. tweak this file).
- Actions tab → **Notify on ship** → confirm the run succeeded.
- Confirm the email landed.

## Suppressing a single push

Add `[skip notify]` anywhere in any commit message in the push; the workflow
detects it and exits without sending.

## Local dry-run

```bash
GITHUB_EVENT_PATH=/path/to/sample-event.json \
GITHUB_REPO=3lokai/empowered \
GMAIL_SENDER=notifier@empowered-careers.com \
node scripts/notify-commit.mjs --dry-run
```

You can grab a real event payload from any past Actions run: the run page →
job log → expand "Set up job" → the `GITHUB_EVENT_PATH` file content is in
`github.event` context, or download the run logs.

## Caveats

- **Quota:** Workspace Gmail sending limit is 2,000 messages/day per user.
  Plenty for commit traffic.
- **Refresh token revocation:** if the Workspace user revokes app access from
  https://myaccount.google.com/permissions, the token dies and emails fail.
  Re-do step 3 to mint a new one. Consider using a dedicated alias (e.g.
  `notifier@…`) so a personal account change can't break the pipeline.
- **OAuth consent screen "in testing":** if it stays in testing mode (External
  type, unverified), refresh tokens expire after 7 days. Either publish the
  app or keep it Internal.
