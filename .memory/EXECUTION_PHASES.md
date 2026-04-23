# Execution Phases

## Current Phase

Phase A - Foundations.

## Objectives

- Scaffold repository and workspace.
- Add desktop shell with sidebar, topbar, routing and base store.
- Add centralized token system with light and dark themes.
- Add shared contracts and initial accounting domain logic.
- Add Tauri/Rust skeleton, migrations and CI minimum.
- Initialize persistent memory files.

## Deliverables

- pnpm workspace with app and packages.
- Token source of truth in `packages/ui-tokens/src/tokens.css`.
- React shell aligned with legacy visual patterns.
- Accounting domain utilities for tariff priority and SAL totals.
- SQLite migration baseline.
- CI and test skeletons.

## Dependencies

- Node 24.11.0 and pnpm 10.33.0.
- Rust/Cargo toolchain compatible with Tauri 2.
- Future phases require real import/export fixtures and client sample data.

## Status

Phase A foundation bootstrap complete for this session. The repository scaffold, shell UI,
centralized tokens, accounting domain baseline, Tauri skeleton, CI files and tests are in place and
verified.

## Decisions Taken

- Domain logic stays outside React components.
- Token file is the only palette and theme source of truth.
- OS rows are included in SAL but excluded from tender/subcontract discounts.
- AI/OCR import is deferred until Phase C/D service boundaries are ready.

## Blockers

- No blocker currently known.

## Next Steps

- Phase B: expand dashboard widgets for alerts, forecast, timeline, map and charts.
- Phase C preparation: design contract, tariff insertion and SAL accounting screens from the
  contabilità scaletta.
- Add real import/export fixtures before implementing Excel/PDF pipelines.
