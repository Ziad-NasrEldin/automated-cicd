# Automated CI/CD

One command to give a repo real branch-push deploys — Vercel, Coolify, a VPS, or CI-only — without hand-writing the workflow every time.

For anyone who keeps standing up apps and does not want a new deploy file from scratch each time.

- Onboard a repo with one `npx` command
- Deploy on the branches you mean (production, optional staging), not every push
- Verify the commit that actually landed, plus a health check
- Works on personal and org repos

**Try it** from the repo you want to onboard:

```bash
npx github:Ziad-NasrEldin/automated-cicd -- \
  --provider vercel \
  --production-branch main \
  --validation-command "npm test && npm run build"
```

That writes `.github/workflows/deploy.yml`. It will not overwrite an existing workflow unless you pass `--force true`.

Full flags, Coolify/VPS setup, and the agent runbook: [docs/AGENT-ONBOARDING.md](docs/AGENT-ONBOARDING.md).
Provider secrets and Coolify/Vercel/VPS configuration: [docs/providers.md](docs/providers.md).

---

Built by [Ziad Ahmed](https://github.com/Ziad-NasrEldin) at [MaVoid](https://mavoid.com).

[Website](https://mavoid.com) · [LinkedIn](https://linkedin.com/in/ziad-ahmed-634202332) · [GitHub](https://github.com/Ziad-NasrEldin)
