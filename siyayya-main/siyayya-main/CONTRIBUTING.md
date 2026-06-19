# Contributing to Siyayya

First off, thanks for taking the time to contribute!

## 1. Local Setup

1.  **Fork** the repository.
2.  **Clone** your fork locally.
3.  Install dependencies: `npm install`
4.  Copy `.env.example` to `.env` and fill in your Firebase/OAuth credentials.
5.  Start the dev server: `npm run dev`

## 2. Branching Strategy

We follow a simplified Git Flow model.

*   `main`: Production-ready code.
*   `develop`: Integration branch for active development.
*   `feature/*`: New features (e.g., `feature/dark-mode`).
*   `fix/*`: Bug fixes (e.g., `fix/auth-crash`).

**Workflow**: Create a feature branch off `develop`. When ready, submit a Pull Request targeting `develop`.

## 3. Commit Conventions

We use Conventional Commits to generate automated changelogs.

Format: `<type>(<scope>): <subject>`

Examples:
*   `feat(auth): add google sign in`
*   `fix(ui): resolve overflow issue on mobile nav`
*   `docs(readme): update setup instructions`

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## 4. Pull Request Process

1.  Ensure your branch is up-to-date with the target branch.
2.  Run tests locally: `npm run test`
3.  Ensure code is formatted: `npm run lint`
4.  Open a Pull Request using the provided GitHub template.
5.  All CI checks (GitHub Actions) must pass before review.
6.  Request a review from at least one core maintainer.

## 5. Code Review Expectations

*   **Reviewers**: Focus on logic, security (especially Firebase rules), and performance. Let the automated linters handle formatting nitpicks.
*   **Authors**: Respond to feedback promptly. If you disagree with a suggestion, explain your reasoning respectfully.

## 6. Testing Requirements

*   New utilities or hooks MUST have accompanying unit tests (Vitest).
*   Complex UI components MUST have React Testing Library coverage.
*   Major user journeys (e.g., new checkout flow) require an updated Playwright E2E test.
