## Purpose

Defines automated continuous integration for the SafeIn5 backend so changes targeting the dev branch are linted, tested, and built before they can be trusted for deployment.

## ADDED Requirements

### Requirement: Pull requests to dev run quality gates
The system MUST run install, lint, unit tests, and a production build for pull requests targeting the `dev` branch.

#### Scenario: PR to dev fails on test failure
- **WHEN** a pull request targeting `dev` contains failing unit tests
- **THEN** the CI pipeline fails and reports the failure on the pull request

#### Scenario: PR to dev passes when quality gates succeed
- **WHEN** a pull request targeting `dev` passes lint, tests, and build
- **THEN** the CI pipeline succeeds

### Requirement: CI does not deploy
The continuous integration path MUST NOT deploy application changes to any EC2 environment.

#### Scenario: PR workflow has no deploy step
- **WHEN** a pull request CI workflow completes successfully
- **THEN** no deployment to EC2 is performed by that workflow
