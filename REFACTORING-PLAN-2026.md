# Piano di Refactoring Quantara 2026 — Versione 0.2.50

> Segui in ordine. Ogni fase termina con `npm run typecheck && cargo build`.
> Al completamento di ogni fase, aggiorna CHANGELOG.md.

---

## FASE 0 — Quick Wins (3 ore)

- [x] 0.1 — Elimina `@tanstack/react-table` da package.json
- [x] 0.2 — Elimina `application/` e `domain/` moduli Rust (morti)
- [x] 0.3 — Unifica helper Rust (`money_to_cents`, `cents_to_money`, `to_database_error`) in `infrastructure/mod.rs`
- [x] 0.4 — Unifica `isTauriRuntime()` + `formatDesktopError()` in `tauri-wrapper.ts`
- [x] 0.5 — Unifica `roundCurrency()` (importa da `domain-utils`, elimina copia in `sal-calculations.ts`)
- [x] 0.6 — Elimina `surchargeKindFromPercent()` duplicata (tieni quella in `sal-workflow.ts`)
- [x] 0.7 — Sostituisci 50+ `whileHover`/`whileTap` framer-motion con CSS transitions

**Verifica**: ✅ `npm run typecheck` + `cargo build` + `vitest run` passano. 33 test FE, 11 test Rust.

---

## FASE 1 — Pulizia Architetturale (8 ore)

### 1.1 — Centralizzazione UI primitives (2h)
- [x] 1.1.1 — Crea `components/shared/easings.ts` (unico `SPRING_EASE`)
  - 18 file aggiornati a importare da easings.ts invece di definire ciascuno la propria costante
- [ ] 1.1.2 — Crea `components/shared/ui-primitives.tsx` (esiste già `Panel.tsx`)
- [ ] 1.1.3 — Sostituisci tutte le copie nei vari file feature (da completare)

### 1.2 — Unificazione tipi SAL ✅ (2h)
- [x] 1.2.1 — Crea `packages/shared-types/src/sal.ts` (tipi canonici: SalProject, SalTariffVoice, SalLine, SalDocument, SalSurchargeKind, SalEconomicRules)
- [x] 1.2.2 — Aggiungi migration layer (v1) in `sal-workflow-store.ts`
- [x] 1.2.3 — Aggiornato `types.ts` come bridge: importa tipi canonici da shared-types, esporta anche locali
- [x] 1.2.4 — Ridotto `sal-workflow.ts` a puro adapter (tipi rimossi, re-export per retrocompatibilità)

### 1.3 — Consolidamento store ✅ (1h)
- [x] 1.3.1 — Riduci `sal-workflow-store.ts` da 17 a 10 metodi: unificati createProject/createProjectWithId, createSal/createSalWithLines/createSalDraftWithLines, updateLineQuantity/updateLineSurcharge
- [ ] 1.3.2 — Rimuovi `tariffVoices` dal persist localStorage (da fare)

### 1.4 — Blindatura FE/BE contract ✅ (2h)
- [x] 1.4.1 — `invokeWithValidation()` aggiunto in `tauri-wrapper.ts`, validazione Zod integrata in `createDesktopContract`/`updateDesktopContract`
- [x] 1.4.3 — `ErrorBoundary` React creato in `components/shared/ErrorBoundary.tsx`, avvolge ogni screen in `RouteRenderer.tsx`

**Verifica**: `npm run typecheck && cargo build && vitest run`

---

## FASE 2 — Performance Engineering (20 ore)

### 2.1 — Data fetching & caching (4h)
- [ ] 2.1.1 — Sostituisci `dispatchDataChanged` (CustomEvent) con store invalidation
- [ ] 2.1.2 — Introduci `lib/fetch-cache.ts` (TTL 5s)
- [ ] 2.1.3 — Installa e configura React Query per le 4 entità
- [ ] 2.1.4 — Prefetch route-level per navigazione fluida

### 2.2 — Virtual scrolling SAL (6h)
- [ ] 2.2.1 — `@tanstack/react-virtual` per tabella voci
- [ ] 2.2.2 — Calcoli delta (solo linea modificata, non tutte)
- [ ] 2.2.3 — Stabilizza `useMemo` dependencies

### 2.3 — Riduzione bundle (4h)
- [ ] 2.3.1 — Verifica tree-shaking framer-motion
- [ ] 2.3.2 — Lazy loading modali pesanti
- [ ] 2.3.3 — PurgeCSS audit (rimuovi stili inutilizzati)
- [ ] 2.3.4 — Valuta rimozione `@hello-pangea/dnd` se sostituibile con drag nativo

### 2.4 — Riduzione framer motion (6h)
- [ ] 2.4.1 — Sostituisci `whileHover` → CSS `:hover`
- [ ] 2.4.2 — Sostituisci `whileTap` → CSS `:active`
- [ ] 2.4.3 — Raggruppa `viewport` observers (1 per sezione, non 1 per card)
- [ ] 2.4.4 — Completa copertura `prefers-reduced-motion`
- [ ] 2.4.5 — Tieni solo animazioni di entrata con framer

**Verifica**: `npm run typecheck && cargo build && vitest run && playwright test`

---

## FASE 3 — Blindatura & Strumenti (15 ore)

### 3.1 — Test coverage (8h)
- [ ] 3.1.1 — Test per ogni calcolo dominio FE (sal-calculations, sal-comparison, money)
- [ ] 3.1.2 — Test per ogni repository Rust
- [ ] 3.1.3 — Integration test CRUD completo
- [ ] 3.1.4 — Visual regression Playwright per ogni screen

### 3.2 — Tooling (4h)
- [ ] 3.2.1 — Biome rule: blocca import tra feature diverse
- [ ] 3.2.2 — Knip per codice inutilizzato/duplicato
- [ ] 3.2.3 — Biome rule: blocca `number` per money values
- [ ] 3.2.4 — ADR in `docs/adr/`

### 3.3 — Developer experience (3h)
- [ ] 3.3.1 — DB seed script (popola SQLite con dati realistici)
- [ ] 3.3.2 — Error messages tradotti IT (Rust)
- [ ] 3.3.3 — HMR ottimizzato (preload routes in dev)

**Verifica**: `npm run check && cargo test`

---

## FASE 4 — Eccellenza Sistemica (20 ore)

### 4.1 — Port & Adapters FE (6h)
- [ ] 4.1.1 — Service hook intermediari (`useContractsService`, ecc.)
- [ ] 4.1.2 — Screen non importa mai store o @tauri-apps direttamente
- [ ] 4.1.3 — Ogni feature esporta solo hook pubblici in `index.ts`

### 4.2 — React Query completo (6h)
- [ ] 4.2.1 — Tutti i fetch convertiti a `useQuery`/`useMutation`
- [ ] 4.2.2 — Cache invalidation su ogni mutation
- [ ] 4.2.3 — Optimistic updates per CRUD

### 4.3 — Accessibility (4h)
- [ ] 4.3.1 — Audit aria-label/role/tabindex
- [ ] 4.3.2 — Verifica contrasto WCAG AA
- [ ] 4.3.3 — Zero colori hardcoded (tutto da tokens.css)

### 4.4 — Storybook (4h)
- [ ] 4.4.1 — Configura Storybook
- [ ] 4.4.2 — Stories per ogni primitiva shared
- [ ] 4.4.3 — Visual regression con Chromatic

**Verifica**: `npm run check && playwright test`
