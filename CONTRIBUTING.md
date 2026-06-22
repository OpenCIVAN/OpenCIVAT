# Contributing to OpenCIVAN

Thank you for your interest in contributing. This document covers everything you need to know to get a change merged.

---

## Navigation

| | |
|---|---|
| [Code of Conduct](#code-of-conduct) | [Ways to Contribute](#ways-to-contribute) |
| [Development Setup](#development-setup) | [Pull Request Workflow](#pull-request-workflow) |
| [Commit Style](#commit-style) | [Labels](#github-labels) |
| [Discussions](#github-discussions) | [Questions](#questions) |

---

## Code of Conduct

All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before engaging.

---

## Ways to Contribute

- **Bug reports** — open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Feature requests** — open an issue using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- **Documentation** — fix typos, improve explanations, add examples
- **Code** — fix bugs, add VTK features, improve VR interactions, add tests
- **Research use cases** — share how you use OpenCIVAN via the [research use case template](.github/ISSUE_TEMPLATE/research_use_case.md)
- **Translations** — TBD

---

## Development Setup

See **[docs/installation.md](docs/installation.md)** for the full setup guide.

Short version:

```bash
git clone https://github.com/<your-fork>/opencivan.git
cd opencivan
cp .env.example .env
./scripts/start.sh      # start Docker backend
npm install
npm start               # https://localhost:8081
```

For auth-free development:

```
DEV_BYPASS_AUTH=true    # in .env
```

Run tests:

```bash
npm run test:run        # single Vitest run
npm run test:coverage   # with coverage report
```

---

## Pull Request Workflow

OpenCIVAN uses a **fork-and-pull** model. Maintainers do not push directly to `main`.

### Step-by-step

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally.
   ```bash
   git clone https://github.com/<your-username>/opencivan.git
   cd opencivan
   git remote add upstream https://github.com/<org>/opencivan.git
   ```
3. **Create a branch** from `main` with a descriptive name.
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b fix/vtk-slice-plane-rotation
   ```
4. **Make your changes.** Keep commits small and focused.
5. **Test** your changes locally.
   ```bash
   npm run test:run
   ```
6. **Push** your branch to your fork.
   ```bash
   git push origin fix/vtk-slice-plane-rotation
   ```
7. **Open a Pull Request** against `main` on the upstream repository. Use the [pull request template](.github/pull_request_template.md).
8. **Respond to review** — maintainers may request changes or ask questions.
9. **Merge** — a maintainer will merge once the PR is approved and CI passes.

### PR guidelines

- One logical change per PR. Large refactors should be discussed in an issue first.
- All PRs require at least one approving review from a maintainer.
- CI must pass (lint, tests) before merge.
- Keep the PR description up to date if the scope changes during review.
- Do not force-push to a PR branch after review has started.

---

## Commit Style

OpenCIVAN follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`.

Examples:

```
feat(vtk): add VTKCutterFeature for plane-based cutting
fix(vr): correct teleport arc landing position in Quest 2
docs(installation): add MinIO bucket policy step
test(yjs): add cursor sync round-trip test
```

---

## Code Style

- **JavaScript / JSX**: follow the existing ESLint config (no new warnings).
- **SCSS**: follow BEM naming used in existing stylesheets.
- **Imports**: use path aliases (`@UI`, `@Core`, `@Services`, etc.) — see `CLAUDE.md`.
- **Dependency direction**: `UI → Services → Managers → Core → Utils`. Never reverse.
- **No new mock/placeholder code** in production paths.
- **Comments**: only when the *why* is non-obvious. No block comments explaining what the code does.

---

## GitHub Labels

Labels help contributors find relevant work. Maintainers apply them; contributors may suggest labels in issue comments.

| Label | Description |
|---|---|
| `good first issue` | Small, well-scoped issues suitable for new contributors |
| `help wanted` | Issues where extra hands are appreciated |
| `bug` | Confirmed bug |
| `feature` | New capability or enhancement |
| `documentation` | Documentation-only change |
| `research use case` | Contributed by a research team or domain user |
| `VTK.js` | Related to VTK.js rendering or feature pipeline |
| `WebXR` | Related to VR/XR mode, Quest 2, or immersive interactions |
| `collaboration` | Related to Y.js, presence, cursors, or voice |
| `networking` | WebSocket, REST API, or server-sync layer |
| `visualization` | Rendering, coloring, slicing, filters |
| `performance` | Latency, frame rate, memory |
| `security` | Auth, token handling, data access |
| `breaking change` | Introduces a backwards-incompatible change |
| `needs discussion` | Requires design discussion before implementation |
| `duplicate` | Already reported |
| `wontfix` | Out of scope or intentional |

---

## GitHub Discussions

Use [GitHub Discussions](../../discussions) for open-ended conversation.

| Category | Use for |
|---|---|
| **Announcements** | Release notes, major changes (maintainers post) |
| **Q&A** | Questions about setup, usage, APIs |
| **Research Use Cases** | Share how you use OpenCIVAN in research |
| **Contributor Onboarding** | Questions from new contributors, pair-programming requests |
| **Ideas** | Early-stage feature ideas not ready for a formal issue |
| **Show and Tell** | Demos, screenshots, visualizations built with OpenCIVAN |

---

## Questions

- General questions: [GitHub Discussions → Q&A](../../discussions)
- Bug reports: [GitHub Issues](../../issues)
- Security issues: see [SECURITY.md](SECURITY.md) (TBD) — do not open a public issue for vulnerabilities
