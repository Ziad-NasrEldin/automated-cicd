# Automated CI/CD

Public reusable GitHub Actions for branch-push CI/CD across personal and organization-owned repositories.

Agents onboarding a repository should follow [the agent onboarding runbook](docs/AGENT-ONBOARDING.md).

## What it supports

- Vercel production and preview deployments.
- Coolify deployments with terminal-status and exact-commit verification.
- Raw VPS deployment through a repository-owned deployment script.
- CI-only repositories with no deployment provider.
- Production-only repositories.
- Optional staging branches with exact-tree and successful-staging promotion enforcement.
- Environment-specific health checks.

Production deployment means automatic after validation and promotion policy pass.
It does not mean deploying every branch.

## Onboard a repository

Run this from the target repository:

```bash
npx github:Ziad-NasrEldin/automated-cicd -- \
  --provider coolify \
  --production-branch Rhiss \
  --staging-branch staging \
  --require-tested-staging true \
  --install-command "npm ci" \
  --validation-command "npm run lint && npm test && npm run build" \
  --production-health "https://example.com/health" \
  --staging-health "https://dev.example.com/health"
```

The command creates `.github/workflows/deploy.yml`.
It refuses to overwrite an existing workflow unless `--force true` is provided.

To create the GitHub environments and upload repository credentials in the same command, authenticate GitHub CLI and pass `--apply-github true --github-repo owner/repository`.
Credential values are read from environment variables and are never written to the generated workflow.

```bash
PRODUCTION_COOLIFY_TOKEN=... \
PRODUCTION_COOLIFY_WEBHOOK=... \
PRODUCTION_COOLIFY_API_BASE=https://coolify.example.com/api/v1 \
STAGING_COOLIFY_TOKEN=... \
STAGING_COOLIFY_WEBHOOK=... \
STAGING_COOLIFY_API_BASE=https://coolify.example.com/api/v1 \
npx github:Ziad-NasrEldin/automated-cicd -- \
  --provider coolify \
  --production-branch main \
  --staging-branch staging \
  --require-tested-staging true \
  --validation-command "npm test && npm run build" \
  --production-health https://example.com/health \
  --staging-health https://dev.example.com/health \
  --apply-github true \
  --github-repo owner/repository
```

## Provider configuration

### Vercel

Create repository or organization secrets, prefixed by deployment scope:

- `PRODUCTION_VERCEL_TOKEN`
- `PRODUCTION_VERCEL_ORG_ID`
- `PRODUCTION_VERCEL_PROJECT_ID`
- Optional staging equivalents prefixed with `STAGING_`

Disable Vercel native Git deployment when this workflow is the deployment owner.
The workflow verifies Vercel `READY` state, commit metadata, the immutable deployment URL, and the configured health URL separately.

### Coolify

Create repository or organization configuration, prefixed by deployment scope:

- Secrets `PRODUCTION_COOLIFY_TOKEN` and `PRODUCTION_COOLIFY_WEBHOOK`
- Variable `PRODUCTION_COOLIFY_API_BASE`, ending in `/api/v1`
- Optional staging equivalents prefixed with `STAGING_`

Disable Coolify GitHub App auto-deploy so it does not race validation.

### Raw VPS

Create repository or organization secrets prefixed with `PRODUCTION_` and optional `STAGING_`:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_KNOWN_HOSTS`

The repository must own the deployment script passed through `--vps-deploy-script`.
The revision command is required and must print the deployed full commit SHA.
The production health URL is also required.

### GitHub only

Use provider `github`.
Validation runs, and deployment is intentionally skipped.

## Staging policy

When `--require-tested-staging true` is enabled, production requires:

1. The production branch contains the staging branch.
2. The production and staging Git trees are identical.
3. The exact staging SHA has a successful run of the generated caller workflow.

No approval request is required.

## Versioning

Generated callers reference `@v1`.
Breaking changes require a new major release.
