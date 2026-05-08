# ADR-001: Centralizzazione delle costanti di easing

**Data**: 2026-05-08  
**Stato**: Accettato  

## Contesto
La costante `[0.22, 1, 0.36, 1]` era definita in 18 file diversi con 3 nomi diversi (BUTTER_EASE, SPRING_EASE, SOFT_EASE). Ogni modifica richiedeva di aggiornare tutti i file.

## Decisione
Creare un unico file `components/shared/easings.ts` che esporta tutte le varianti come alias della stessa costante. Tutti i file importano da li.

## Conseguenze
- 18 definizioni rimosse, 1 aggiunta
- Modifiche future a un solo file

---

# ADR-002: Tipi SAL in shared-types

**Data**: 2026-05-08  
**Stato**: Accettato  

## Contesto
I tipi del dominio SAL (SalDocument, SalLine, etc.) erano definiti in `features/sal/domain/sal-workflow.ts` e duplicati in `features/sal/types.ts`. Non c'era una fonte canonica.

## Decisione
Spostare i tipi principali in `packages/shared-types/src/sal.ts`. `types.ts` diventa un bridge che re-esporta da shared-types. La store aggiunge una migration layer per i dati localStorage.

## Conseguenze
- Unica fonte di verità per i tipi SAL
- Migration layer v2 per localStorage
- Retrocompatibilità garantita

---

# ADR-003: Cache dati con TTL invece di React Query

**Data**: 2026-05-08  
**Stato**: Accettato  

## Contesto
L'applicazione faceva fetch dei dati a ogni navigazione. Serviva caching per ridurre le chiamate al backend Tauri.

## Opzioni considerate
1. **React Query**: completo ma pesante (~12KB gzipped). Overhead eccessivo per un'app desktop Tauri.
2. **fetch-cache custom**: ~50 righe, TTL 5s, integrato con dispatchDataChanged.

## Decisione
Creare `lib/fetch-cache.ts` con TTL configurabile, invalidato automaticamente da `dispatchDataChanged`.

## Conseguenze
- Cache per contratti, tariffari, materiali, voci
- Zero dipendenze aggiuntive
- Invalidazione automatica su CRUD

---

# ADR-004: Confini tra feature modules

**Data**: 2026-05-08  
**Stato**: Accettato  

## Contesto
File di feature diverse si importavano tra loro (es. 5 feature importavano da `features/projects/components/workspace-ui.tsx`).

## Decisione
- I componenti UI condivisi vanno in `components/shared/`
- Le utility condivise vanno in `lib/shared-utils.ts`
- Uno script CI (`scripts/check-feature-boundaries.mjs`) blocca violazioni future

## Conseguenze
- `workspace-ui.tsx` → `components/shared/ui-primitives.tsx`
- `normalizeContractorName`, `readStringRecord` → `lib/shared-utils.ts`
- Violazioni ridotte da 28 a 16 (le restanti richiedono refactoring piu profondo)
