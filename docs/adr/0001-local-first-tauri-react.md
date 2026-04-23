# ADR 0001 - Local-first Tauri and React

## Status

Accepted.

## Decision

Quantara uses Tauri 2, Rust, React 19, TypeScript strict and SQLite as the baseline application
architecture.

## Consequences

The UI remains fast and familiar for desktop operators, while storage and OS integrations stay local.
Cloud services are optional integration points and not required for normal operation.
