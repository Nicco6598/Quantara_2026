# Persistenza dati — Quantara Desktop

## Fonti di verità

| Dominio | Runtime Tauri | Runtime browser (dev/preview) |
|---------|---------------|-------------------------------|
| Contratti, tariffari, materiali | SQLite | localStorage preview keys |
| Documenti SAL | SQLite | `quantara-sal-data-v1` (legacy preview) |
| Bozze SAL in corso | SQLite dopo primo save; localStorage solo prima del primo save | localStorage |
| Audit operativo | SQLite `audit_events` | cache legacy `audit-log-store` |
| Appaltatore su contratto | `contractorName` su contratto SQLite | legacy `projectContractors` fino a migrazione |
| Preferenze UI / tema | localStorage `shellPreferences` | idem |
| Navigazione workflow | app-store (+ `selectedProjectId` persistito) | idem |
| Bozze import tariffario | localStorage `quantara:tariff-import-preview:*` | idem |

## Sync tra schermate

Dopo ogni mutazione su SQLite: `dispatchDataChanged()` (`lib/sync-events.ts`).

Schermate dati: `useDataChangedListener` o refetch esplicito.

SAL in memoria: `syncSalWorkflowFromBackend(projectId?)` (`lib/sal-workflow-sync.ts`).

Scritture bozza SAL: `upsertSalDraftDocument` (`repositories/sal-repository.ts`).

## Bozze (DraftService)

- `persistence/draft-service.ts` — `loadDraft` / `saveDraft` / `clearDraft`
- `hooks/use-draft-autosave.ts` — debounce + intervallo condiviso
- `hooks/use-auto-save.ts` — progetti (wrapper)
- `useSalDraftAutosave` — SAL (localStorage o SQLite via callback)

## Navigazione workflow

`lib/workflow-navigation.ts` + campi in `app-store`. Migrazione legacy: `migrateWorkflowNavigationFromSession()` in `App.tsx`.

## Audit

- Backend: `list_audit_events` (Tauri) → `lib/audit-data.ts`
- UI: `useAuditLogEntries` (Dashboard, Impostazioni)
- Registro append-only: nessuna cancellazione in modalità desktop

## Appaltatori legacy

`migrateLegacyContractorsToDb()` copia `projectContractors` → `contractorName` e rimuove la mappa legacy.

`resolveContractorName()` / `readLegacyProjectContractors()` in `lib/contractor-resolve.ts`.

## Backup `.qbk`

Chiavi fisse: `BACKUP_STORAGE_KEYS` in `persistence/registry.ts`.

Bozze import tariffario dinamiche: `collectTariffImportDraftStorage()` in `persistence/tariff-import-backup.ts`, incluse in `lib/backup.ts`.
