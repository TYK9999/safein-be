# Table of Contents

[DevX AI Pods — Developer Onboarding [1](#devx-ai-pods-developer-onboarding)](#devx-ai-pods-developer-onboarding)

[1. MCP Setup (One-Time) [1](#mcp-setup-one-time)](#mcp-setup-one-time)

[2. How to Invoke a Tool [2](#how-to-invoke-a-tool)](#how-to-invoke-a-tool)

[3. Fresh Project (Greenfield / MVP) [2](#fresh-project-greenfield-mvp)](#fresh-project-greenfield-mvp)

[4. Existing Project (New Feature / Enhancement) [3](#existing-project-new-feature-enhancement)](#existing-project-new-feature-enhancement)

[5. Quick Reference — Which Path Am I On? [5](#quick-reference-which-path-am-i-on)](#quick-reference-which-path-am-i-on)

[6. During Development (After Specs) [5](#during-development-after-specs)](#during-development-after-specs)

[7. Artifacts Flow [5](#artifacts-flow)](#artifacts-flow)

[8. Troubleshooting [5](#troubleshooting)](#troubleshooting)

[Related Docs [6](#_Toc234923910)](#_Toc234923910)

# DevX AI Pods — Developer Onboarding

**Talentica Software \| Confidential**

Quick guide to set up the AI Pods MCP in Cursor and run the development workflow — from requirements through specs. This covers planning and implementation prep only (not testing agents).

## 1. MCP Setup (One-Time)

### 1.1 Add the MCP server

Open **Cursor Settings → MCP** and add the `ai-pods` server to your `mcp.json`:

    "ai-pods": {
      "url": "http://13.127.35.169:8000/mcp",
      "headers": {
        "X-API-Key": "<your-api-key>",
        "X-User-Id": "Your Name"
      }
    }

| **Field**   | **Value**                                  |
|-------------|--------------------------------------------|
| `X-API-Key` | Get from your team lead / DevX admin       |
| `X-User-Id` | Your full name (used for session tracking) |

### 1.2 Verify it works

1.  Restart Cursor (or reload MCP servers).
2.  In a new chat, confirm **ai-pods** appears under MCP tools.
3.  Ask the agent: *“List the ai-pods MCP tools”* — you should see tools like `gather-business_get_instructions`, `prd-questions_get_prd_questions`, etc.

## 2. How to Invoke a Tool

In Cursor chat, tell the agent which MCP tool to run. Examples:

    Run the gather-business_get_instructions MCP tool and follow its instructions.
    Run create-specifications_get_specs_tasks and generate the specs folder.

The agent will call the tool, receive step-by-step instructions, and guide you through the workflow interactively.

> **Tip:** Each workflow tool asks **one question at a time**. Answer each question before the agent moves on.

## 3. Fresh Project (Greenfield / MVP)

Use this when building a **new product from scratch** — no existing codebase to analyze.

### Workflow (run in this order)

| **Step** | **MCP Tool** | **Output** |
|----|----|----|
| 1 | `prd-questions_get_prd_questions` | Guided Q&A to capture business context |
| 2 | `prd-format_get_prd_format` | Business PRD document (`BUSINESS_PRD.md`) |
| 3 | `prd-technical_get_prd_technical_questions` | Guided Q&A for architecture & technical design |
| 4 | `create-specifications_get_specs_tasks` | `specifications/` folder with numbered spec files + `progress.md` |

### What you get at the end

    project-root/
    ├── BUSINESS_PRD.md          # Business requirements (workshop output)
    ├── TECHNICAL_PRD.md         # Technical architecture & design
    ├── specifications/
    │   ├── 001-setup.md
    │   ├── 002-<feature>.md
    │   └── ...
    └── progress.md              # Tracker table for spec completion

### Prompt to start

    I am starting a fresh/greenfield project. Run prd-questions_get_prd_questions
    and help me create the Business PRD step by step.

After the Business PRD is approved, continue:

    Business PRD is done. Run prd-technical_get_prd_technical_questions
    to create the Technical PRD.

Then:

    Run create-specifications_get_specs_tasks to generate implementation specs
    from the PRD files.

## 4. Existing Project (New Feature / Enhancement)

Use this when adding a feature to a **product that already has code**.

### 4a. First-time codebase onboarding (optional, one-time per repo)

Run once when the team first connects AI Pods to a repo:

| **Step** | **MCP Tool** | **Purpose** |
|----|----|----|
| 1 | `check-code_get_instructions` | Systematic codebase familiarization |
| 2 | `cursor_indexer_agent` | Index repo for fast symbol/context lookup |
| 3 | `cursor_archeologist_agent` | Deep archaeology — patterns, conventions, history |

### 4b. Feature development workflow (run in this order)

| **Step** | **MCP Tool** | **Output** |
|----|----|----|
| 1 | `gather-business_get_instructions` | `BUSINESS_REQUIREMENTS.md` |
| 2 | `gather-technical_get_instructions` | `TECHNICAL_REQUIREMENTS.md` |
| 3 | `prd-technical_get_prd_technical_questions` | `TECHNICAL_PRD.md` (formal tech PRD) |
| 4 | `create-specifications_get_specs_tasks` | `specifications/` folder + `progress.md` |

> **Order matters.** Each step builds on the previous artifact. Do not skip ahead.

### What you get at the end

    project-root/
    ├── BUSINESS_REQUIREMENTS.md   # Feature-level business requirements
    ├── TECHNICAL_REQUIREMENTS.md  # Feature-level technical requirements
    ├── TECHNICAL_PRD.md           # Formal technical PRD
    ├── specifications/
    │   ├── 001-setup.md
    │   ├── 002-<feature>.md
    │   └── ...
    └── progress.md

### Prompt to start

    I need to add a new feature to this existing project.
    Run gather-business_get_instructions and follow the workflow.

After business requirements are done:

    BUSINESS_REQUIREMENTS.md is ready. Run gather-technical_get_instructions.

Then:

    Run prd-technical_get_prd_technical_questions to create the Technical PRD.

Finally:

    Run create-specifications_get_specs_tasks to generate implementation specs.

## 5. Quick Reference — Which Path Am I On?

| **Situation** | **Path** | **Start with** |
|----|----|----|
| Brand-new product, no code yet | **Fresh Project** (Section 3) | `prd-questions_get_prd_questions` |
| New feature on existing codebase | **Existing Project** (Section 4) | `gather-business_get_instructions` |
| First time connecting AI Pods to a repo | **Onboarding** (Section 4a) | `check-code_get_instructions` |

## 6. During Development (After Specs)

Once specs are generated and approved, developers implement against them. These MCP tools help during active development:

| **MCP Tool** | **When to use** |
|----|----|
| `PR_review_nodejs_agent` | Before merging — automated PR review (Node.js) |
| `pr-review_get_pr_review_instructions` | General PR review checklist |
| `cursor_jira_details_generator_agent` | Enrich JIRA tickets with implementation details |
| `cursor_spec_generator_agent` | Break specs into JIRA-ready stories/tasks |

## 7. Artifacts Flow

    Fresh Project:
      Business Q&A → Business PRD → Technical Q&A → Technical PRD → Specs → Code

    Existing Project:
      Business Requirements → Technical Requirements → Technical PRD → Specs → Code

Each artifact should be **reviewed and signed off** before moving to the next step.

## 8. Troubleshooting

| **Issue** | **Fix** |
|----|----|
| MCP server not visible | Restart Cursor; check `mcp.json` syntax |
| Tool returns auth error | Verify `X-API-Key` with your admin |
| Agent skips questions | Remind it: “Ask one question at a time per the MCP instructions” |
| `gather-technical` fails | Ensure `BUSINESS_REQUIREMENTS.md` exists first (Step 1 output) |
| Specs missing detail | Confirm both PRD files exist before running `create-specifications_get_specs_tasks` |
