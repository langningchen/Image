# VanishPic

VanishPic is an anonymous, governable temporary image host built for
Cloudflare Workers.

> VanishPic is temporary storage, not a permanent archive or backup service.
> Production images are deleted after they have not been viewed for the
> previous 7 days. Demo uploads always expire after 10 minutes.

## Description

> Anonymous, governable temporary image hosting for Cloudflare Workers, with
> inactivity-based expiry, R2 or GitHub storage, moderation, abuse controls,
> an admin dashboard, and a safe demo mode.

This short paragraph is suitable for the GitHub repository description.

## Features

- Upload without registration or sign-in. Image URLs use unpredictable random
  identifiers.
- Select, drag, or paste up to 20 images per batch. Uploads run with bounded
  concurrency, and one failed file does not cancel the rest of the batch.
- Allow public uploads or require one site-wide access password.
- Renew the fixed seven-day production lifetime only after a real image visit;
  homepage previews use `?preview=1` and do not count. A Cron Trigger cleans
  expired images every five minutes.
- Store image objects in Cloudflare R2 or, optionally, a GitHub repository.
- Configure R2 or a GitHub repository, branch, and fine-grained PAT from the
  first-login setup wizard.
- Delete violating images and optionally warn their upload source.
- Automatically ban after a configurable number of warnings; manually warn,
  temporarily ban, permanently ban, unban, or clear warnings.
- Optionally review uploads with Cloudflare Workers AI and choose the model,
  policy, and fail-open or fail-closed behavior.
- Run a safe demo where anyone may enter the dashboard and submit changes, but
  settings, bans, and administrator deletions are only simulated.
- Return stable API error codes and structured parameters; the English
  `next-intl` catalog turns those codes into user-facing messages.
- Use a responsive MUI interface with the default MUI palette and system,
  light, and dark appearance modes.
- Navigate the dashboard with top-level tabs. Site settings use summarized
  list sections with a left-hand table of contents for fast section jumps, and
  focused right-side editing drawers with consistent Cancel and Save actions.
- Review images, sources, and full audit details in on-demand MUI data grids.
- Receive operation feedback from one shared top-right notification center.

The planned public demo is
[vanishpic.langningchen.com](https://vanishpic.langningchen.com).

## One-command deployment

Prerequisites:

- Node.js 20 or newer
- pnpm
- A Cloudflare account

Run:

```bash
./scripts/deploy.sh
```

Alternatively:

```bash
pnpm deploy:setup
```

The guided deployment:

1. securely asks for and confirms the administrator password;
2. installs the exact locked dependencies;
3. opens Wrangler login when no Cloudflare session is available;
4. creates or reuses the `image-metadata` D1 database and `image-data` R2
   bucket;
5. updates the D1 ID in `wrangler.toml` and applies remote migrations;
6. generates independent random values for `SESSION_SECRET`,
   `IP_HASH_SECRET`, and `CONFIG_ENCRYPTION_KEY`;
7. builds the OpenNext Worker and deploys all four sensitive values as
   encrypted Cloudflare Worker secrets.

The administrator password is never printed or cached. It is placed in a
mode-`0600` temporary secrets file only for the Wrangler deployment request,
then that temporary directory is deleted. Generated secrets are cached in the git-ignored
`.vanishpic-deploy-secrets.json` file with mode `0600`, so another deployment
does not unexpectedly invalidate sessions, change source identities, or make
an encrypted GitHub PAT unreadable. Back up this file securely.

If the cache is lost for an existing Worker, restore it before deploying.
Intentional rotation requires:

```bash
pnpm deploy:setup --rotate-secrets
```

After rotation, sign in again and re-enter any previously stored GitHub PAT.

When deployment finishes, open the printed URL, visit `/admin`, sign in with
the password you chose, and complete the graphical storage setup:

- **R2** verifies the `IMAGE_BUCKET` binding and is the recommended option.
- **GitHub** asks for the owner, repository, branch, and a fine-grained PAT
  with Contents read/write access to that repository.

## Architecture

| Component | Responsibility |
| --- | --- |
| Next.js App Router | Pages, admin dashboard, and Route Handlers |
| OpenNext for Cloudflare | Builds the Next.js application as a Worker |
| D1 | Image metadata, settings, warnings, bans, and moderation events |
| R2 | Recommended image object storage |
| GitHub Contents API | Optional storage; its PAT is encrypted before D1 storage |
| Workers AI | Optional image content review |
| Cron Trigger | Removes expired images, expired bans, and old audit events |

Image bytes are never stored in D1. A production image is deleted after seven
days without a real visit. When an image is requested, the Worker checks expiry
before serving it, so an already expired image cannot be revived by a late
visit. Homepage thumbnails use `?preview=1`; the Worker serves them without
updating `last_accessed_at` or the view count. Production access timestamps are
written at most once per hour to reduce D1 writes.

Image storage follows a hexagonal boundary. Application code depends on the
`ImageStoragePort`; R2 and GitHub are independent adapters selected by the
composition service. A future backend can be added without changing upload,
delivery, or cleanup use cases.

```text
lib/storage/
├── ports/image-storage.ts
├── adapters/r2-image-storage.ts
├── adapters/github-image-storage.ts
├── config.ts
└── service.ts
```

## R2 or GitHub

R2 is recommended for new deployments. Deleting an R2 object releases object
storage and does not create Git history.

GitHub storage preserves the original project's convenient repository workflow,
but it has an unavoidable limitation: deleting a file creates another commit,
while old blobs may remain in repository history. Automatic cleanup removes
files from the current branch and intentionally does not rewrite Git history.
For a storage repository that needs old blobs removed, deploy the history purge
workflow described below. Do not use GitHub storage for a high-volume,
long-running public image host.

## GitHub image-history purge

`scripts/purge-deleted-image-history.sh` and
`.github/workflows/purge-deleted-image-history.yml` are designed to be deployed
to the **target GitHub image-storage repository**, not only this Worker source
repository. Copy both files to that repository while preserving their paths,
then commit them to its default branch. The workflow runs daily at 03:17 UTC
and can also be started manually.

By default it rewrites the repository's default branch. If VanishPic stores
images on another branch, set the target repository Actions variable
`IMAGE_STORAGE_BRANCH` to that branch, or provide `branch` when manually
dispatching the workflow.

The script finds files under `images/` whose deletion commit is at least seven
days old and which are still absent from the current branch. It removes those
paths from the branch history with `git-filter-repo`, then force-pushes the
rewritten selected storage branch. Files still present in the branch are never
selected.
The Worker continues to use ordinary GitHub Contents API deletes; history is
only rewritten by this scheduled job.

Before enabling it, allow the repository's `GITHUB_TOKEN` to have **Read and
write** workflow permissions and ensure the selected storage branch permits
force pushes by GitHub Actions. Do not protect that branch against this
workflow. A history rewrite changes commit IDs: collaborators must rebase/reset
their local branch or clone again. The supplied job rewrites only the selected
storage branch; old image blobs can still be reachable from other branches,
tags, forks, or GitHub caches. Remove or rewrite those refs separately when
complete eradication is required.

For a private repository on GitHub Free, the current included allowance is
2,000 Linux runner minutes per month. This job has no build step and normally
takes about 1-5 minutes, including a full clone and `git-filter-repo`, so a
daily run is roughly 30-155 minutes/month (about 1.5%-7.8% of the allowance).
Even a 30-minute daily run uses about 900 minutes/month. Large repositories can
take longer, so monitor the Actions billing page; public repositories using
standard GitHub-hosted runners do not consume this quota. GitHub's current
[Actions billing documentation](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
lists the applicable plan allowances.

## Manual deployment

The guided script is preferred. For manual deployment, create the resources,
copy the returned D1 ID into `wrangler.toml`, apply migrations, and set all four
secrets before deploying:

```bash
pnpm install
pnpm exec wrangler login
pnpm exec wrangler r2 bucket create image-data
pnpm exec wrangler d1 create image-metadata
pnpm db:migrate:remote
pnpm exec wrangler secret put ADMIN_PASSWORD
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put IP_HASH_SECRET
pnpm exec wrangler secret put CONFIG_ENCRYPTION_KEY
pnpm deploy
```

Use a different, long random value for every generated secret. Do not rotate
`CONFIG_ENCRYPTION_KEY` without re-entering the GitHub PAT afterward.

## Local development

```bash
cp .dev.vars.example .dev.vars
pnpm install
pnpm db:migrate:local
pnpm dev
```

`.dev.vars` is ignored by Git. Use development-only values and never reuse
production secrets.

Quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Biome treats unused imports and variables as errors. It also rejects the
`@mui/material` and `@mui/icons-material` barrel imports; every component and
icon uses its individual module path. Product UI components do not contain
custom CSS, `sx`, inline `style`, or custom `className` overrides.

## Demo mode

Set the Worker environment variables to:

```toml
[vars]
DEMO_MODE = "true"
MAX_UPLOAD_MIB = "10"
```

Demo mode is enforced on the server:

- `/admin` needs no password, so anyone can view and submit its forms.
- Settings, storage setup, source governance, and administrator deletion APIs
  return `simulated: true` without changing D1, storage, or GitHub.
- Upload access is always public.
- Every new upload gets a fixed 10-minute expiry that visits cannot renew.
- Uploaded image bytes are really stored in the demo R2 bucket, so a public demo
  should use dedicated D1 and R2 resources.

## Runtime settings

Administrators can change:

- the public site name, upload heading, description, notice, and footer;
- whether recent uploads, clipboard paste, uploader deletion, expiry times,
  and view counts are available;
- batch size, upload concurrency, and browser history limits;
- public or shared-password upload access;
- no inactivity-retention control: production images always expire after seven
  days without a real visit;
- the per-source hourly upload limit;
- delete-only or delete-and-warn violation handling;
- the number of warnings before automatic banning;
- temporary or permanent automatic ban duration;
- Workers AI review, model, policy, and failure behavior;
- the site notice and moderation-log retention.

`MAX_UPLOAD_MIB` is a deployment variable and is constrained by the server to
1–25 MiB.

## Security and privacy

- Expiry, bans, and upload authorization are always enforced by the Worker API.
- API failures use
  `{ "ok": false, "error": { "code": "...", "params": {} } }`; APIs do not
  return localized prose.
- Admin and shared-password login attempts are rate-limited by source.
- Session cookies use `HttpOnly`, `Secure`, and `SameSite=Strict`.
- The service stores a keyed source hash and a masked IP for abuse controls,
  not user accounts.
- Upload validation detects the real image format from a strict magic-byte
  allowlist instead of trusting browser MIME metadata. Safe filenames and
  response types are normalized to the detected format; SVG and non-image
  files are rejected.
- An uploader's deletion token stays in that browser; D1 stores only its
  SHA-256 digest.
- AI review is an aid, not a guarantee. Administrators should still review the
  moderation log and respond to reports.

## License

GNU General Public License v3.0
