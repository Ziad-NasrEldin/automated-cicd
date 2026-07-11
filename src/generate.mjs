const providers = new Set(["vercel", "coolify", "vps", "github"]);

function generateCaller(options) {
  validateOptions(options);
  const branches = [options.productionBranch, options.stagingBranch].filter(Boolean);
  const stagingExpression = options.stagingBranch
    ? `\${{ github.ref_name == '${options.productionBranch}' && 'production' || 'staging' }}`
    : "production";
  const healthExpression = options.stagingBranch
    ? `\${{ github.ref_name == '${options.productionBranch}' && '${options.productionHealth ?? ""}' || '${options.stagingHealth ?? ""}' }}`
    : options.productionHealth ?? "";

  return `name: Branch CI and deployment

on:
  push:
    branches:
${branches.map((branch) => `      - ${yamlString(branch)}`).join("\n")}
  workflow_dispatch:

permissions:
  actions: read
  contents: read

concurrency:
  group: deploy-\${{ github.ref_name }}
  cancel-in-progress: \${{ github.ref_name != '${options.productionBranch}' }}

jobs:
  deploy:
    if: github.ref_name == '${options.productionBranch}'${options.stagingBranch ? ` || github.ref_name == '${options.stagingBranch}'` : ""}
    uses: Ziad-NasrEldin/automated-cicd/.github/workflows/deploy.yml@v1
    with:
      provider: ${options.provider}
      environment: ${yamlString(stagingExpression)}
      production-branch: ${yamlString(options.productionBranch)}
      staging-branch: ${yamlString(options.stagingBranch ?? "")}
      require-tested-staging: ${Boolean(options.requireTestedStaging)}
      caller-workflow-file: deploy.yml
      node-version: ${yamlString(options.nodeVersion ?? "22")}
      install-command: ${yamlString(options.installCommand)}
      validation-command: ${yamlString(options.validationCommand)}
      healthcheck-url: ${yamlString(healthExpression)}
${options.provider === "coolify" ? `      coolify-api-base: ${yamlString(scopedExpression(options, "COOLIFY_API_BASE", "vars"))}\n` : ""}${options.provider === "vps" ? `      vps-deploy-script: ${yamlString(options.vpsDeployScript ?? "scripts/deploy.sh")}
      vps-revision-command: ${yamlString(options.vpsRevisionCommand ?? "")}
` : ""}${secretBlock(options)}
`;
}

function validateOptions(options) {
  if (!providers.has(options.provider)) {
    throw new Error(`provider must be one of: ${[...providers].join(", ")}`);
  }
  for (const field of ["productionBranch", "installCommand", "validationCommand"]) {
    if (!options[field]) throw new Error(`${field} is required`);
  }
  if (options.requireTestedStaging && !options.stagingBranch) {
    throw new Error("stagingBranch is required when requireTestedStaging is enabled");
  }
  if (options.provider === "vps" && !options.vpsRevisionCommand) {
    throw new Error("vpsRevisionCommand is required for vps deployments");
  }
  if (options.provider === "vps" && !options.productionHealth) {
    throw new Error("productionHealth is required for vps deployments");
  }
  if (options.provider === "vps" && options.stagingBranch && !options.stagingHealth) {
    throw new Error("stagingHealth is required for staged vps deployments");
  }
}

function secretBlock(options) {
  const names = {
    vercel: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    coolify: ["COOLIFY_TOKEN", "COOLIFY_WEBHOOK"],
    vps: ["VPS_HOST", "VPS_USER", "VPS_SSH_KEY", "VPS_KNOWN_HOSTS"],
    github: []
  }[options.provider];

  if (names.length === 0) return "";
  return `    secrets:\n${names.map((name) => `      ${name}: ${scopedExpression(options, name, "secrets")}`).join("\n")}\n`;
}

function scopedExpression(options, name, context) {
  if (!options.stagingBranch) return `\${{ ${context}.PRODUCTION_${name} }}`;
  return `\${{ github.ref_name == '${options.productionBranch}' && ${context}.PRODUCTION_${name} || ${context}.STAGING_${name} }}`;
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

export { generateCaller, validateOptions };
