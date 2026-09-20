## Purpose

Defines merge-triggered deployment of the SafeIn5 backend to the **dev** Amazon EC2 instance from the `dev` branch, without using a container registry. Other environments are out of scope for this change.

## ADDED Requirements

### Requirement: Merge to dev deploys to the dev EC2 instance
On a successful push (merge) to the `dev` branch, the system MUST deploy the backend for that commit to the configured **dev** EC2 instance. The CD pipeline MUST NOT be configured to deploy from `qa`, `stage`, or `demo` branches in this change.

#### Scenario: Merge to dev deploys to the dev EC2 instance
- **WHEN** code is merged into the `dev` branch and the deploy pipeline succeeds
- **THEN** the API process on the configured **dev** EC2 instance runs that commit

#### Scenario: Non-dev branches are not CD triggers
- **WHEN** the deploy workflow definition is inspected
- **THEN** it lists only `dev` as a push trigger branch (not `qa`, `stage`, or `demo`)

### Requirement: Failed quality gates block deploy
The deploy pipeline MUST run (or reuse) lint, test, and build checks and MUST NOT deploy if those checks fail.

#### Scenario: Broken dev build does not deploy
- **WHEN** a push to `dev` fails unit tests in the pipeline
- **THEN** the pipeline does not update the dev EC2 instance

### Requirement: Deploy runs an identifiable git revision on the host
Each successful deploy MUST leave the target host running the exact git commit SHA that triggered the pipeline (sync/checkout of that SHA, then rebuild/restart). The system MUST NOT require publishing images to Amazon ECR or another container registry.

#### Scenario: Host runs the merged commit
- **WHEN** a deploy to dev succeeds for commit `abc123`
- **THEN** the application checkout (or equivalent runtime metadata) on the dev EC2 host corresponds to commit `abc123`

#### Scenario: No registry publish required
- **WHEN** a deploy completes successfully
- **THEN** success does not depend on an image existing in ECR or another registry

### Requirement: Post-deploy health verification
After updating the dev EC2 host, the pipeline MUST verify that the service health endpoint for that environment responds successfully, or mark the deploy as failed.

#### Scenario: Healthy deploy
- **WHEN** the new revision is running and `/api/v1/health` (or the environment's documented health URL) returns HTTP success with database ready
- **THEN** the deploy job succeeds

#### Scenario: Unhealthy deploy fails the job
- **WHEN** after host update the health check does not succeed within the configured timeout
- **THEN** the deploy job fails

### Requirement: Environment credentials stay out of the repository
Host endpoints and secrets for dev MUST be supplied via the GitHub Environment `dev` (or equivalent CI secrets), not committed in source control.

#### Scenario: Workflow references secrets by name
- **WHEN** a developer inspects the workflow files in the repository
- **THEN** they see secret/variable references (e.g. GitHub Environment secrets) rather than live SSH private keys or private host credentials
