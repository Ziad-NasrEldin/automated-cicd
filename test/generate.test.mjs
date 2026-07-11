import assert from "node:assert/strict";
import test from "node:test";
import { generateCaller } from "../src/generate.mjs";

test("generates a production-only Vercel caller", () => {
  const workflow = generateCaller({
    provider: "vercel",
    productionBranch: "main",
    installCommand: "npm ci",
    validationCommand: "npm test",
    productionHealth: "https://example.com/api/health"
  });

  assert.match(workflow, /provider: vercel/);
  assert.match(workflow, /- "main"/);
  assert.doesNotMatch(workflow, /- "staging"/);
  assert.match(workflow, /environment: "production"/);
  assert.match(workflow, /healthcheck-url: "https:\/\/example.com\/api\/health"/);
  assert.match(workflow, /VERCEL_TOKEN: \$\{\{ secrets\.PRODUCTION_VERCEL_TOKEN \}\}/);
});

test("generates staging promotion enforcement for Coolify", () => {
  const workflow = generateCaller({
    provider: "coolify",
    productionBranch: "Rhiss",
    stagingBranch: "staging",
    requireTestedStaging: true,
    installCommand: "npm ci",
    validationCommand: "npm test",
    productionHealth: "https://example.com/health",
    stagingHealth: "https://dev.example.com/health"
  });

  assert.match(workflow, /- "Rhiss"/);
  assert.match(workflow, /- "staging"/);
  assert.match(workflow, /require-tested-staging: true/);
  assert.match(workflow, /github\.ref_name == 'Rhiss'/);
  assert.match(workflow, /dev\.example\.com/);
  assert.match(workflow, /COOLIFY_TOKEN: \$\{\{ github\.ref_name == 'Rhiss'/);
  assert.match(workflow, /secrets\.STAGING_COOLIFY_TOKEN/);
});

test("rejects tested staging without a staging branch", () => {
  assert.throws(
    () => generateCaller({
      provider: "coolify",
      productionBranch: "main",
      requireTestedStaging: true,
      installCommand: "npm ci",
      validationCommand: "npm test"
    }),
    /stagingBranch is required/
  );
});

test("rejects unsupported providers", () => {
  assert.throws(
    () => generateCaller({
      provider: "unknown",
      productionBranch: "main",
      installCommand: "npm ci",
      validationCommand: "npm test"
    }),
    /provider must be one of/
  );
});

test("requires revision and health proof for raw VPS deployments", () => {
  const base = {
    provider: "vps",
    productionBranch: "main",
    installCommand: "npm ci",
    validationCommand: "npm test"
  };

  assert.throws(() => generateCaller(base), /vpsRevisionCommand is required/);
  assert.throws(
    () => generateCaller({ ...base, vpsRevisionCommand: "cat /srv/app/REVISION" }),
    /productionHealth is required/
  );
  assert.throws(
    () => generateCaller({
      ...base,
      stagingBranch: "staging",
      vpsRevisionCommand: "cat /srv/app/REVISION",
      productionHealth: "https://example.com/health"
    }),
    /stagingHealth is required/
  );
});
