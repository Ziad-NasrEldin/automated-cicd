# Provider configuration

Secret names and setup for each deployment provider.
The agent runbook is in [AGENT-ONBOARDING.md](AGENT-ONBOARDING.md).

Create repository or organization secrets prefixed by deployment scope (`PRODUCTION_` and optional `STAGING_`).
Credential values are read from environment variables when you pass `--apply-github true` and are never written to the generated workflow.

## Vercel

- `PRODUCTION_VERCEL_TOKEN`
- `PRODUCTION_VERCEL_ORG_ID`
- `PRODUCTION_VERCEL_PROJECT_ID`
- Optional staging equivalents prefixed with `STAGING_`

Disable Vercel native Git deployment when this workflow is the deployment owner.
The workflow verifies Vercel `READY` state, commit metadata, the immutable deployment URL, and the configured health URL separately.

## Coolify

- Secrets `PRODUCTION_COOLIFY_TOKEN` and `PRODUCTION_COOLIFY_WEBHOOK`
- Variable `PRODUCTION_COOLIFY_API_BASE`, ending in `/api/v1`
- Optional staging equivalents prefixed with `STAGING_`

Disable Coolify GitHub App auto-deploy so it does not race validation.

## Raw VPS

Create repository or organization secrets prefixed with `PRODUCTION_` and optional `STAGING_`:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_KNOWN_HOSTS`

The repository must own the deployment script passed through `--vps-deploy-script`.
The revision command is required and must print the deployed full commit SHA.
The production health URL is also required.

## GitHub only

Use provider `github`.
Validation runs, and deployment is intentionally skipped.

## Staging policy

When `--require-tested-staging true` is enabled, production requires:

1. The production branch contains the staging branch.
2. The production and staging Git trees are identical.
3. The exact staging SHA has a successful run of the generated caller workflow.

No approval request is required.
