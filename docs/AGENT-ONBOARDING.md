# Agent Runbook: Onboard a Repository to Automatic CI/CD

Use this runbook when asked to add automatic CI/CD to a repository.
Do not copy a large workflow from another application.
Generate a thin caller for the public reusable workflow at `Ziad-NasrEldin/automated-cicd@v1`.

## Success criteria

The task is complete only when all of the following are true:

- The target repository has a generated `.github/workflows/deploy.yml`.
- Pushes to each configured deployment branch start validation automatically.
- Provider-native auto-deployment is disabled when it would race GitHub Actions.
- Validation passes before deployment begins.
- The provider reports terminal deployment success.
- The deployed revision matches the pushed Git commit when the provider supports revision proof.
- The public health endpoint succeeds.
- Staging and production proof are reported separately.
- Unrelated target-repository changes remain untouched.

## 1. Inspect the target repository

Run these checks before changing files:

```bash
pwd
git status --short --branch
git remote -v
git branch --show-current
rg --files -g 'AGENTS.md' -g 'package.json' -g 'vercel.json' -g '*compose*.yml' -g '*compose*.yaml' -g 'Dockerfile*'
```

Read every applicable `AGENTS.md` file.
Identify and preserve unrelated dirty changes.
Do not assume the default branch is the production branch.

Record:

- GitHub owner and repository.
- Production branch.
- Optional staging branch.
- Provider: `vercel`, `coolify`, `vps`, or `github`.
- Install command.
- Complete validation command.
- Production health URL.
- Optional staging health URL.
- Whether production must require a tested staging revision.

## 2. Establish the validation command

Use the repository's actual quality gates.
The validation command should normally include linting, typechecking, tests, and a production build.

Run the exact command locally before generating CI:

```bash
<install-command>
<validation-command>
```

Fix failures that are required for clean CI only when they are within the user's requested scope.
Do not weaken validation to make the workflow pass.

## 3. Prepare provider configuration

### Vercel

Collect the production and optional staging values for:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Disable Vercel Git deployment when GitHub Actions will own deployment.
The reusable workflow verifies Vercel `READY` state, exact commit metadata, immutable deployment URL reachability, and the configured health URL.

### Coolify

Collect the production and optional staging values for:

- `COOLIFY_TOKEN`
- `COOLIFY_WEBHOOK`
- `COOLIFY_API_BASE`

`COOLIFY_API_BASE` must end in `/api/v1`.
Disable the Coolify application's GitHub App auto-deploy setting.
Confirm the Coolify application tracks the configured branch.

### Raw VPS

Collect the production and optional staging values for:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_KNOWN_HOSTS`

The target repository must contain its deployment script.
The remote revision command must print only the deployed full Git SHA.
Both revision and public health proof are mandatory.

### GitHub only

No deployment credentials are required.
Validation still runs automatically on configured branch pushes.

## 4. Run one-command onboarding

Run the toolkit from the target repository.
Use environment-variable prefixes `PRODUCTION_` and optional `STAGING_` for provider credentials.

Example for Coolify with staging:

```bash
PRODUCTION_COOLIFY_TOKEN='...' \
PRODUCTION_COOLIFY_WEBHOOK='...' \
PRODUCTION_COOLIFY_API_BASE='https://coolify.example.com/api/v1' \
STAGING_COOLIFY_TOKEN='...' \
STAGING_COOLIFY_WEBHOOK='...' \
STAGING_COOLIFY_API_BASE='https://coolify.example.com/api/v1' \
npx github:Ziad-NasrEldin/automated-cicd -- \
  --provider coolify \
  --production-branch main \
  --staging-branch staging \
  --require-tested-staging true \
  --install-command 'npm ci' \
  --validation-command 'npm run lint && npm run typecheck && npm test && npm run build' \
  --production-health 'https://example.com/health' \
  --staging-health 'https://dev.example.com/health' \
  --apply-github true \
  --github-repo owner/repository
```

Use `--force true` only after inspecting an existing `.github/workflows/deploy.yml` and intentionally replacing it.
Never use `--force true` as a default.

## 5. Inspect the generated caller

Confirm the caller contains only the intended branches and provider.

```bash
sed -n '1,240p' .github/workflows/deploy.yml
actionlint .github/workflows/deploy.yml
git diff --check
```

Verify that production and staging use their correctly scoped secret names.
Verify that manual recovery runs are restricted to the configured branches.

## 6. Commit and push intentionally

Stage only the onboarding files and any directly required fixes.

```bash
git status --short
git diff -- .github/workflows/deploy.yml
git add .github/workflows/deploy.yml
git commit -m 'Adopt reusable branch CI/CD'
git push origin <deployment-branch>
```

Do not include unrelated user changes in the commit.

## 7. Monitor GitHub Actions

Use GitHub AXI for agent-driven GitHub operations:

```bash
gh-axi run list --repo=owner/repository --limit 5
gh-axi run view <run-id> --repo=owner/repository
gh-axi run watch <run-id> --repo=owner/repository
```

If validation fails, inspect the failed job logs and fix the actual repository problem.
Do not manually trigger the provider while validation is failing.

## 8. Prove deployment independently

GitHub Actions success is necessary but is not the entire proof.

For every deployment, record:

- GitHub run ID and conclusion.
- Pushed full commit SHA.
- Provider deployment ID or URL.
- Provider terminal status.
- Provider-reported deployed commit SHA when available.
- Public health response.
- Runtime or container status when applicable.

For Vercel, verify the immutable deployment URL and stable production URL separately.
For Coolify, verify queue completion, deployed commit, container state, and health endpoint.
For raw VPS, verify the remote revision command and health endpoint.

## 9. Promote staging to production

When tested staging is required:

1. Push the candidate to the staging branch.
2. Wait for successful validation, deployment, revision proof, and health proof.
3. Test the staging application.
4. Merge or fast-forward that exact tree into production.
5. Push production.
6. Verify production independently.

Production CI rejects a different tree or a staging SHA without a successful staging workflow.
No approval request is required by this toolkit.

## 10. Report the result

The final handoff must separate proven state from remaining blockers.

Use this format:

```text
Repository: owner/repository
Provider: vercel | coolify | vps | github
Branches: staging -> production, or production only
Commit: <full SHA>
GitHub run: <run ID>, <conclusion>
Provider deployment: <ID or URL>, <terminal status>
Revision proof: <provider SHA or remote SHA>
Health proof: <URL and response>
Provider-native auto-deploy: disabled | not applicable
Remaining blockers: none | exact blocker
```

Never claim that a push deployed successfully when only Git completed.
Never use web health as proof that a separate collector or worker deployed.

## Updating the toolkit

Generated callers use the stable `@v1` reference.
Do not point application repositories at `main`.
Breaking toolkit changes require a new major reference.

