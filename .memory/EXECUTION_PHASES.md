# Execution Phases

## Current Phase

Phase C - Projects, SAL and Contabilita.

## Objectives

- Add operational screens for project contract setup, tariff insertion, SAL detail and
  accounting exports.
- Preserve legacy patterns: persistent shell, dense data tables, KPI strips and contextual panels.
- Keep ribassi and OS treatment aligned with shared domain utilities.
- Verify sidebar stays fixed while workspace content scrolls.

## Deliverables

- Project contract screen.
- Tariff insertion screen.
- Generic SAL list/overview screen.
- Contabilita export screen.
- Updated E2E smoke coverage for Phase C navigation.

## Dependencies

- Phase A shell and token system.
- Phase B dashboard data and accounting demo records.
- Real project datasets are still needed before replacing demo data.

## Status

Phase C started. Core project, tariff, generic SAL and contabilita routes now render operational
demo-data screens instead of placeholders.

## Decisions Taken

- Domain logic stays outside React components.
- Token file is the only palette and theme source of truth.
- OS rows are included in SAL but excluded from tender/subcontract discounts.
- AI/OCR import is deferred until Phase C/D service boundaries are ready.
- Dashboard widgets remain presentation-level components fed by typed dashboard data.
- The dashboard uses two-column composition under the fixed right inspector to avoid cramped
  three-column layouts on common desktop widths.
- Sidebar is viewport-fixed; workspace content owns vertical scrolling.
- Navigation label is `Panoramica` for the selected project overview; `Progetti` remains the
  contract/project management area.

## Blockers

- No blocker currently known.

## Next Steps

- Expand Phase C forms from static demo panels into editable flows.
- Add validation for contract/tariff insertion.
- Add dedicated SAL detail route after generic SAL workflow stabilizes.
- Add real import/export fixtures before implementing Excel/PDF pipelines.
