# Quantara

Quantara is a local-first desktop management system for technical accounting, SAL workflows,
tariffs, materials, documents, validation, professional exports, backups and release notes.

The current implementation is in Phase A - Foundations:

- Tauri 2 desktop shell with React 19, TypeScript strict and Vite 6.
- Centralized token system for light and dark themes.
- Legacy-compatible enterprise layout with sidebar, top toolbar, KPI cards, dense tables and a
  contextual detail panel.
- Initial accounting domain contracts for contracts, tariff priority resolution, SAL rows, labor
  surcharges, OS handling and net total calculation.

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @quantara/desktop tauri:dev
```

## Architecture

The repository is split by responsibility:

- `domain`: business types and rules.
- `application`: orchestration services.
- `infrastructure`: storage, filesystem, imports, exports and OS integration.
- `presentation`: React screens, components, selectors and stores.
- `shared-types/contracts`: runtime-safe contracts shared across layers.

Normal operation must remain offline-first. Imports and exports are interoperability channels, not
the center of the product.
