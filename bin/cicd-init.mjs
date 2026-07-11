#!/usr/bin/env node
import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { generateCaller } from "../src/generate.mjs";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const root = resolve(args.root ?? process.cwd());
const output = resolve(root, ".github/workflows/deploy.yml");
if (await exists(output) && args.force !== "true") {
  throw new Error(`${output} already exists. Pass --force true to replace it.`);
}
const caller = generateCaller({
  provider: args.provider,
  productionBranch: args.productionBranch ?? "main",
  stagingBranch: args.stagingBranch,
  requireTestedStaging: args.requireTestedStaging === "true",
  nodeVersion: args.nodeVersion ?? "22",
  installCommand: args.installCommand ?? "npm ci",
  validationCommand: args.validationCommand,
  productionHealth: args.productionHealth,
  stagingHealth: args.stagingHealth,
  vpsDeployScript: args.vpsDeployScript,
  vpsRevisionCommand: args.vpsRevisionCommand
});

await mkdir(resolve(root, ".github/workflows"), { recursive: true });
await writeFile(output, caller, "utf8");
console.log(`Created ${output}`);
if (args.applyGithub === "true") {
  configureGithub(args);
}
printRequiredConfiguration(args.provider);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = values[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  npx github:Ziad-NasrEldin/automated-cicd -- \\
    --provider <vercel|coolify|vps|github> \\
    --production-branch <branch> \\
    --validation-command <command> [options]

Options:
  --root <path>
  --force <true|false>
  --apply-github <true|false>
  --github-repo <owner/repository>
  --staging-branch <branch>
  --require-tested-staging <true|false>
  --node-version <version>
  --install-command <command>
  --production-health <url>
  --staging-health <url>
  --vps-deploy-script <path>
  --vps-revision-command <remote command>`);
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function configureGithub(options) {
  if (!options.githubRepo) throw new Error("--github-repo is required with --apply-github true");
  const scopes = options.stagingBranch ? ["PRODUCTION", "STAGING"] : ["PRODUCTION"];
  const environments = options.stagingBranch ? ["production", "staging"] : ["production"];
  const secretNames = {
    vercel: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    coolify: ["COOLIFY_TOKEN", "COOLIFY_WEBHOOK"],
    vps: ["VPS_HOST", "VPS_USER", "VPS_SSH_KEY", "VPS_KNOWN_HOSTS"],
    github: []
  }[options.provider];

  const requiredVariables = scopes.flatMap((scope) => [
    ...secretNames.map((name) => `${scope}_${name}`),
    ...(options.provider === "coolify" ? [`${scope}_COOLIFY_API_BASE`] : [])
  ]);
  for (const variableName of requiredVariables) {
    if (!process.env[variableName]) throw new Error(`${variableName} must be set in the environment`);
  }

  for (const environment of environments) {
    runGh(["api", "--method", "PUT", `repos/${options.githubRepo}/environments/${environment}`]);
  }
  for (const scope of scopes) {
    for (const name of secretNames) {
      const variableName = `${scope}_${name}`;
      const value = process.env[variableName];
      runGh(["secret", "set", variableName, "--repo", options.githubRepo], value);
    }
    if (options.provider === "coolify") {
      const variableName = `${scope}_COOLIFY_API_BASE`;
      const value = process.env[variableName];
      runGh(["variable", "set", variableName, "--repo", options.githubRepo, "--body", value]);
    }
  }
  console.log(`Configured GitHub environments and repository credentials for ${options.githubRepo}`);
}

function runGh(args, input) {
  const result = spawnSync("gh", args, { encoding: "utf8", input, stdio: input ? ["pipe", "pipe", "pipe"] : "pipe" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `gh ${args.join(" ")} failed`);
  }
}

function printRequiredConfiguration(provider) {
  const requirements = {
    vercel: "Repository secrets per environment: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID",
    coolify: "Repository secrets per environment: COOLIFY_TOKEN, COOLIFY_WEBHOOK. Variable: COOLIFY_API_BASE",
    vps: "Repository secrets per environment: VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_KNOWN_HOSTS",
    github: "No deployment secrets required"
  };
  console.log(requirements[provider]);
}
