# Contributing to DineOps

- **Goal:** Describe how to contribute code, run tests, and open high-quality PRs.

- **Getting started:**
  - Fork the repo and create a feature branch from `main` (branch name: `feature/desc` or `fix/issue-number-desc`).
  - Run tests locally: backend `./mvnw test`, frontend `cd frontend && npm run test`.

- **Code style & checks:**
  - Backend: follow existing Java formatting and Lombok usage conventions.
  - Frontend: run `npm run lint` and keep TypeScript strictness green.
  - Enable repository hooks once: `git config core.hooksPath .githooks`.
  - Pre-commit hook runs `frontend` type-check (`npm run typecheck`) before commit.

- **Running & testing:**
  - Provide unit tests for new features. Integration or e2e tests are welcome.
  - Run linters and tests before opening a PR.

- **Pull Request process:**
  - Open PR against `main`. Include description, related issue (if any), screenshots, and testing steps.
  - CI must pass (unit tests + lint). Add reviewers and address comments.

- **Commit messages:** Keep messages imperative and concise. Follow `type(scope): summary` when useful (e.g., `feat(auth): add 2fa flag`).

- **Community:** For design or architecture changes, open an issue first to discuss.

---

## Documentation map for contributors
- Project index: `docs/GITHUB_HANDOFF_INDEX.md`
- Developer setup: `DEVELOPER.md`
- Launch/runbooks: `docs/LAUNCH_CHECKLIST.md`, `docs/ROLLBACK_RUNBOOK.md`
- Known issues: `docs/KNOWN_ISSUES.md`
