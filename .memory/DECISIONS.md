# Decisions

## 2026-04-23 - Phase A scope

Decision: keep the first implementation to foundations, shell continuity and core accounting rules.

Rationale: the requested product is broad; building import AI, OCR, exports and persistence before the
domain and shell exist would create unstable coupling.

## 2026-04-23 - Token source of truth

Decision: all raw, semantic and component UI tokens live in `packages/ui-tokens/src/tokens.css`.

Rationale: palette and theme rework must be possible from one file without editing individual
components.

## 2026-04-23 - Accounting totals

Decision: OS safety costs are stored as SAL rows but excluded from tender and subcontract discounts,
then added to the final SAL total.

Rationale: this follows the client accounting scaletta and avoids silent economic distortion.
