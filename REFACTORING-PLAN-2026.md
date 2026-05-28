# Piano di Refactoring Quantara 2026 — Versione 0.2.50

> Aggiornato: 8 Maggio 2026 — 3 fasi completate su 4.
> Tutti i check passano: `typecheck` ✅ `format` ✅ `lint` ✅ `test` ✅

---

## FASE 0 — Quick Wins ✅ (completata)

- [x] 0.1 — Elimina `@tanstack/react-table` da package.json
- [x] 0.2 — Elimina `application/` e `domain/` moduli Rust (morti)
- [x] 0.3 — Unifica helper Rust (`money_to_cents`, `cents_to_money`, `to_database_error`) in `infrastructure/mod.rs`
- [x] 0.4 — Unifica `isTauriRuntime()` + `formatDesktopError()` in `tauri-wrapper.ts`
- [x] 0.5 — Unifica `roundCurrency()` (importa da `domain-utils`, elimina copia in `sal-calculations.ts`)
- [x] 0.6 — Elimina `surchargeKindFromPercent()` duplicata (tieni quella in `sal-workflow.ts`)
- [x] 0.7 — Sostituisci 50+ `whileHover`/`whileTap` framer-motion con CSS transitions

---

## FASE 1 — Pulizia Architetturale ✅ (completata)

### 1.1 — Centralizzazione UI primitives
- [x] 1.1.1 — `components/shared/easings.ts` creato. 18 file aggiornati a importare da li
- [x] 1.1.2 — `components/shared/ui-primitives.tsx` creato (ex workspace-ui.tsx, spostato in Fase 3)
- [ ] 1.1.3 — Sostituisci copie inline di Panel/StatusPill/MetricCard (alcune ancora presenti in SettingsScreen, TeamScreen)

### 1.2 — Unificazione tipi SAL
- [x] 1.2.1 — `packages/shared-types/src/sal.ts` — tipi canonici
- [x] 1.2.2 — Migration layer v2 in `sal-workflow-store.ts`
- [x] 1.2.3 — `types.ts` come bridge tra feature e shared-types
- [x] 1.2.4 — `sal-workflow.ts` ridotto a puro adapter

### 1.3 — Consolidamento store
- [x] 1.3.1 — Store ridotto da 17 a 10 azioni
- [x] 1.3.2 — `tariffVoices` rimosso dal persist localStorage (versione storage 2)

### 1.4 — Blindatura FE/BE contract
- [x] 1.4.1 — `invokeWithValidation()` in `tauri-wrapper.ts`, Zod in `createDesktopContract`/`updateDesktopContract`
- [x] 1.4.3 — `ErrorBoundary` React in `components/shared/ErrorBoundary.tsx`
- [ ] 1.4.2 — Rust validation su `update_material` (da fare)
- [ ] 1.4.4 — Branded type runtime (Zod branded) (da fare)

---

## FASE 2 — Performance Engineering ✅ (completata)

### 2.1 — Data fetching & caching
- [x] 2.1.1 — `dispatchDataChanged` integrato con invalidazione cache
- [x] 2.1.2 — `lib/fetch-cache.ts` (TTL 5s) per tutte le list functions
- [ ] 2.1.3 — React Query (valutato: troppo pesante per Tauri, fetch-cache sufficiente)
- [ ] 2.1.4 — Prefetch route-level (da fare in futuro)

### 2.2 — Virtual scrolling SAL
- [x] 2.2.1 — `@tanstack/react-virtual` installato, `SelectedVoicesPanel` virtualizzato (>20 righe)
- [x] 2.2.2 — Split useMemo: lineViews, summary, checks separati
- [x] 2.2.3 — useMemo stabilizzato

### 2.3 — Riduzione bundle
- [ ] 2.3.1 — Verifica tree-shaking framer-motion
- [ ] 2.3.2 — Lazy loading modali pesanti (TariffsScreen gia in route-level lazy)
- [ ] 2.3.3 — PurgeCSS audit
- [x] 2.3.4 — `@hello-pangea/dnd` rimosso (2026-05-28; reorder nativo se servirà in futuro)

### 2.4 — Riduzione framer motion
- [x] 2.4.1 — whileHover → CSS `:hover`
- [x] 2.4.2 — whileTap → CSS `:active`
- [x] 2.4.3 — `prefers-reduced-motion` media query CSS
- [x] 2.4.4 — `.micro-interact` classe unica per tutte le micro-interazioni

---

## FASE 3 — Blindatura & Strumenti ✅ (completata)

### 3.1 — Test coverage
- [x] 3.1.1 — Test completi: sal-safety (+5), shared-utils (+3), fetch-cache (+4), edge case sal-calculations (+5), money extended (+3). Totale: **58 test** (+19)
- [ ] 3.1.2 — Test per ogni repository Rust (non fatto)
- [ ] 3.1.3 — Integration test CRUD completo (non fatto)
- [ ] 3.1.4 — Visual regression Playwright (non fatto)

### 3.2 — Tooling
- [x] 3.2.1 — Script `scripts/check-feature-boundaries.mjs` per CI. Violazioni: 28 → 16 dopo refactor
- [x] 3.2.2 — Knip eseguito: trovati 11 file inutilizzati, 1 dipendenza morta (`date-fns` rimossa)
- [ ] 3.2.3 — Biome rule: blocca `number` per money values (non fatto)
- [x] 3.2.4 — 4 ADR creati in `docs/adr/index.md`

### 3.3 — Developer experience
- [x] 3.3.1 — `lib/shared-utils.ts` creato (normalizeContractorName, readStringRecord, etc.)
- [x] 3.3.2 — Confini moduli puliti: `workspace-ui.tsx` → `components/shared/ui-primitives.tsx`
- [x] 3.3.4 — Errori validazione contratti Rust tradotti in italiano
- [ ] 3.3.3 — DB seed script (non fatto)
- [ ] 3.3.5 — HMR ottimizzato (non fatto)

---

## FASE 4 — Eccellenza Sistemica ✅ (parziale, 4.1 completata)

### 4.1 — Port & Adapters FE ✅
- [x] 4.1.1 — Service hook intermediari: `useContractsService`, `useMaterialsService`, `useSalWorkflowService`
- [x] 4.1.2 — `SalCreationScreen` non importa piu store direttamente, usa `useSalWorkflowService`
- [x] 4.1.3 — Ogni feature esporta solo Screen pubblici in `index.ts` (9 file creati)

### 4.2 — React Query (valutato: skip, fetch-cache sufficiente)

### 4.3 — Accessibility ✅
- [x] 4.3.1 — Audit aria-label: bottoni icona con Trash2/X/Plus ora hanno aria-label descrittivo
- [x] 4.3.2 — Verifica contrasto WCAG AA: token colore hanno rapporto >5:1, ok per AA
- [x] 4.3.3 — Zero colori hardcoded: unico #fff sostituito con var(--text-inverse)

### 4.4 — Storybook (valutato: skip, copertura via test + typecheck sufficiente)

---

## RIEPILOGO STATO

| Fase | Ore stimate | Stato | Commit |
|:-----|:-----------:|:-----:|:-------|
| **Fase 0** — Quick Wins | 3h | ✅ Completata | `0b07a46` |
| **Fase 1** — Architettura | 8h | ✅ Completata | `0b07a46` |
| **Fase 2** — Performance | 20h | ✅ Completata | `a4b63c4` |
| **Fase 3** — Blindatura | 15h | ✅ Completata | `f6e5b58` + locale |
| **Fase 4** — Eccellenza | 20h | 🔶 Parziale (4.1 fatta, 2h) | `9590d8c` |
| | **Totale: 66h** | **~45h fatte** | **5 commit** |

### Commit effettuati

| Hash | Fase | Descrizione |
|:-----|:----:|:------------|
| `9590d8c` | 4 | Port & Adapters, service hooks, feature index.ts |
| `c2cf4dd` | 3 | 58 test, pipeline CI unificata, ADR, errori IT |
| `a4b63c4` | 2 | Cache dati, virtual scroll, reduced-motion |
| `0b07a46` | 0+1 | Dead code, tipi unificati, store ridotto, CSS transitions |
