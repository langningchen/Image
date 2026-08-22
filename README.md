# Image

A very simple online image hosting service.

## Deploy the image service

1. Clone this repository.
2. [Create a GitHub Personal Access Token](https://github.com/settings/tokens/new) with access to repository contents. A classic token can use the `repo` scope.
3. [Create a dedicated private repository](https://github.com/new?name=image-data&description=Store%20data%20for%20Image&visibility=private) to store the images.
4. Install dependencies with `npm install`.
5. Create the access-time KV namespace:

   ```sh
   npx wrangler kv namespace create IMAGE_ACCESS
   ```

6. Copy the returned namespace ID into `wrangler.toml` by uncommenting and completing this block:

   ```toml
   [[kv_namespaces]]
   binding = "IMAGE_ACCESS"
   id = "YOUR_KV_NAMESPACE_ID"
   ```

7. Configure the GitHub credentials and target repository:

   ```sh
   npx wrangler secret put GithubPAT
   npx wrangler secret put GithubOwner
   npx wrangler secret put GithubRepo
   ```

8. Build and deploy the Worker, its static assets, and the daily Cron Trigger:

   ```sh
   npm run deploy
   ```

Cron Triggers use UTC and may take several minutes to propagate after deployment. To exercise the scheduled handler locally with `wrangler dev`, request `http://localhost:8787/cdn-cgi/handler/scheduled`.

## Purge deleted files from Git history

Deleting a file normally leaves its content in Git history. This repository includes a second cleanup stage under `target-repository/`:

- `scripts/purge-deleted-image-history.sh` finds root-level image files that are absent from `HEAD` and whose latest deletion commit is at least seven days old. It removes those paths from the branch's entire history with `git-filter-repo`.
- `.github/workflows/purge-deleted-image-history.yml` runs the script every day at `04:23 UTC` and performs a lease-protected force-push only when history changed.

Deploy these two files **in the dedicated target image repository**, not only in this application repository. From a checkout of this project, copy them into a checkout of the target repository:

```sh
cp -R target-repository/.github /path/to/image-data/
mkdir -p /path/to/image-data/scripts
cp target-repository/scripts/purge-deleted-image-history.sh /path/to/image-data/scripts/
chmod +x /path/to/image-data/scripts/purge-deleted-image-history.sh
```

Commit and push the copied files in the target repository. Then:

1. Open the target repository's **Settings → Actions → General** and set **Workflow permissions** to **Read and write permissions**.
2. Ensure the default branch permits this workflow to force-push. Branch protection or rulesets that reject force-pushes must be adjusted for this dedicated repository.
3. Keep the target repository dedicated to image storage, with one active branch and no tags that retain old image objects. The supplied workflow rewrites and pushes only the branch on which it runs.
4. Run **Purge deleted image history → Run workflow** once to verify the setup.

The push uses `--force-with-lease`. If an upload changes the target branch while cleanup is running, the push fails safely instead of overwriting that upload; the next daily run can retry. History rewrites change commit IDs and invalidate old clones, so do not install this workflow in a general-purpose source repository. GitHub may also take time to compact unreachable server-side objects, so displayed repository size may not fall immediately.

## License

This project is licensed under the terms of the GNU General Public License v3.0.
