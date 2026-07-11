# Automated CI/CD Agent Guide

## Purpose

This repository owns public reusable GitHub Actions workflows and a small onboarding CLI for branch-driven CI/CD.

## Contracts

- Keep credentials in target repository or organization secrets.
- Trigger deployment from branch pushes, with optional manual recovery runs restricted to configured branches.
- Validate before deploying.
- Prove provider completion, deployed revision identity when supported, and public health separately.
- Production promotion from staging must require the same Git tree and a successful staging workflow for that commit.
- Keep generated caller workflows thin and deterministic.
- Preserve compatibility with Node.js 22 or newer.

## Verification

Run `npm test` and `npm run check` after changing the generator or reusable workflow.
