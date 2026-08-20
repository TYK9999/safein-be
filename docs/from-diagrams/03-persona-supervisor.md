# Persona 2: Supervisor

Source: persona design notes.

## Role in system

- Recipient / actioner in the Corporate Layer
- Operates within the SIGNAL loop (Navigate / Alert steps) and the Corporate Workflow state machine

## Core actions

- Receives signals routed to them (SIGNAL step: Navigate — “route insights to the right people”)
- Reviews and acknowledges signals (“PULSE Reviewed” step — worker / reviewer reviews the moment)
- Manages the workflow lifecycle: **New → Assigned → Acknowledged → Actioned → Closed**
- Must be assigned before action can be taken
- Provides evidence before closure (configurable requirement)
- Views dashboard with basic leading indicators (signal counts, classification breakdown, trends)
- Handles escalation tracking when signals are flagged

## Goals / responsibilities

- Act on Behaviour Signals within a defined timeframe (Mandatory Human Factors Question: “Who acts on Behaviour Signals and within what timeframe?”)
- Review trend / pattern data rather than individual blame reports — e.g. Scenario 1 (PPE Non-Compliance): “Supervisor receives trend insight rather than individual blame report”
- Maintain full audit trail for every state change
- Ensure closure notification is returned to the workforce once resolved (Scenario: Unsafe Scaffold Access)
- Track response and closure times to prevent the “Report Black Hole Risk” scenario

## Tools / objects they interact with

- Review Task
- Assignment
- Evidence
- Audit Log
- Corporate dashboard (leading indicators, site / team feed)

## Operational environment requirement

- Corporate environments “require audit trails, workflows, escalation ownership, and structured governance” — explicitly distinguished from the simpler Community UX

## System's stance toward them (ethical principle)

- Should receive trend / pattern insight, not individual-level blame data
- Expected to close the loop — visible acknowledgement and closure workflows are a **mandatory** UX requirement, not optional
