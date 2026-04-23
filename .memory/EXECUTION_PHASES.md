# Execution Phases

## Current Phase

Phase B - Dashboard System.

## Objectives

- Expand the project dashboard with dense operational widgets.
- Preserve legacy visual patterns: KPI row, health, forecast, alerts, map, timeline and data table.
- Keep widgets modular and token-driven.
- Verify light/dark theme behavior and no horizontal overflow with the right inspector open.

## Deliverables

- `AlertListCard`
- `ForecastCard`
- `BudgetDistributionCard`
- `MapCard`
- `TimelineCard`
- `OperationsMetricStrip`
- Updated E2E smoke coverage for Phase B widgets.

## Dependencies

- Phase A shell and token system.
- Legacy screenshots for dashboard parity.
- Real project datasets are still needed before replacing demo data.

## Status

Phase B dashboard expansion in progress. Core dashboard widgets are implemented and visually
checked at 1440x900 with the right inspector open.

## Decisions Taken

- Domain logic stays outside React components.
- Token file is the only palette and theme source of truth.
- OS rows are included in SAL but excluded from tender/subcontract discounts.
- AI/OCR import is deferred until Phase C/D service boundaries are ready.
- Dashboard widgets remain presentation-level components fed by typed dashboard data.
- The dashboard uses two-column composition under the fixed right inspector to avoid cramped
  three-column layouts on common desktop widths.

## Blockers

- No blocker currently known.

## Next Steps

- Finish Phase B with any remaining chart/detail polish requested after review.
- Phase C preparation: design contract, tariff insertion and SAL accounting screens from the
  contabilità scaletta.
- Add real import/export fixtures before implementing Excel/PDF pipelines.
