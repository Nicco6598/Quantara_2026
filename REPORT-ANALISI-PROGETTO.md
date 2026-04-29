# Report Analisi Progetto - Quantara 2026

> Aggiornato: 29 Aprile 2026
> Stato: refactor core completato, decomposizione UI ancora in corso

---

## Sintesi

Il progetto ha gia superato le fasi piu critiche: guardie sui calcoli, centralizzazione di helper condivisi, riduzione di logiche duplicate e primo split dei componenti piu grandi. Il check su `TariffsScreen.tsx` ha evidenziato un problema reale: i componenti erano stati estratti in `features/tariffs/components`, ma il file principale conteneva ancora le copie inline. Ho rimosso il duplicato e collegato gli import agli estratti.

Ho poi completato il refactor principale di `ProjectsScreen.tsx`: la schermata e passata da 953 a 461 righe tramite estrazione della vista appaltatore, dei flussi Excel, delle derivazioni portfolio e delle mutazioni CRUD. Anche `DashboardScreen.tsx` e stata ridotta a una screen di composizione, con le sezioni UI spostate in `DashboardSections.tsx`.

`npm run typecheck` passa dopo la correzione.

---

## Stato Per Fase

| Fase | Focus | Stato | Nota |
|------|-------|:-----:|------|
| 1 | Sicurezza e stabilita | Completata | Guardie su parsing, accounting, SAL e import |
| 2 | Decomposizione schermate grandi | In corso | Tariffs corretto, Projects e DashboardScreen ridotte sotto 500 righe |
| 3 | Centralizzazione logiche | Completata | Hook, wrapper desktop, formatter e grouping estratti |
| 4 | Performance | Completata | Map/useMemo introdotti nei punti principali |
| 5 | State management | Completata | CustomEvent quasi eliminati, stato spostato verso store |
| 6 | Cleanup | Completata | Dead code e duplicazioni principali rimosse |

---

## Check TariffsScreen

### Problema trovato

`TariffsScreen.tsx` non era davvero splittato: misurava 1502 righe e duplicava dentro lo stesso file componenti gia presenti in:

| Componente estratto | Righe |
|---------------------|------:|
| `TariffImportPreviewModal.tsx` | 205 |
| `EditableTariffVoicesGrid.tsx` | 144 |
| `TariffBookRow.tsx` | 120 |
| `TariffVoicesPreview.tsx` | 79 |
| `TariffMetric.tsx` | 43 |
| `QuickAction.tsx` | 40 |
| `ImportMetric.tsx` | 25 |
| `TariffEditField.tsx` | 20 |
| `ValidationLine.tsx` | 12 |

### Correzione fatta

- Rimossi fallback data inline da `TariffsScreen.tsx`.
- Usati `tariffs-data.ts` e `tariffs-types.ts`.
- Rimossi componenti inline duplicati.
- Usati `TariffBookRow`, `TariffImportPreviewModal`, `TariffMetric`, `QuickAction`, `TariffEditField` e `TariffVoicesPreview` dagli estratti.
- Usato `groupTariffVoices` da `utils/tariff-grouping.ts`.
- Sostituito tone non valido `violet` con `info`.

### Risultato

| File | Prima | Dopo | Delta |
|------|------:|-----:|------:|
| `TariffsScreen.tsx` | 1502 | 735 | -767 righe (-51%) |

---

## Check ProjectsScreen

### Correzione fatta

`ProjectsScreen.tsx` era gia parzialmente splittata, ma restavano dentro al componente principale troppi blocchi di responsabilita diverse. Ho completato il taglio principale con quattro estrazioni:

| Nuovo file | Scopo |
|------------|-------|
| `components/ContractorDetailView.tsx` | vista dettaglio appaltatore con header, metriche, filtri, workbench e rail |
| `hooks/useProjectMigration.ts` | import/export Excel, parsing, validazione e download workbook |
| `hooks/useProjectPortfolioView.ts` | cartelle appaltatori, filtri, metriche, coda, approvazioni e attivita visibili |
| `hooks/useProjectMutations.ts` | create/update/select/delete progetto e notifiche correlate |

### Risultato

| File | Prima | Dopo | Delta |
|------|------:|-----:|------:|
| `ProjectsScreen.tsx` | 953 | 461 | -492 righe (-52%) |

`ProjectsScreen.tsx` ora resta responsabile del wiring della pagina: stato modali, caricamento iniziale, navigazione, shortcut, input file e collegamento con lo store SAL.

---

## Check DashboardScreen

### Correzione fatta

`DashboardScreen.tsx` conteneva fetch dati, composizione pagina, componenti UI, rail laterali, tabella cantieri e funzioni builder. Ho spostato la UI in:

| Nuovo file | Scopo |
|------------|-------|
| `features/dashboard/components/DashboardSections.tsx` | hero, metriche, azioni prioritarie, cantieri, milestone, rail e builder dashboard |

### Risultato

| File | Prima | Dopo | Delta |
|------|------:|-----:|------:|
| `DashboardScreen.tsx` | 648 | 64 | -584 righe (-90%) |

Nota: `DashboardSections.tsx` misura 592 righe perche raccoglie sezioni UI gia esistenti. Il comportamento e invariato; il prossimo eventuale passo e dividere quel file in `DashboardMetrics`, `DashboardOperations` e `DashboardRail`.

---

## File Grandi Rimasti

| File | Righe | Priorita |
|------|------:|:--------:|
| `TariffsScreen.tsx` | 735 | Media |
| `MaterialsScreen.tsx` | 649 | Media |
| `ProjectDetailScreen.tsx` | 636 | Media |
| `DashboardSections.tsx` | 592 | Media |
| `TeamScreen.tsx` | 561 | Media |
| `CreateProjectModal.tsx` | 508 | Media |
| `SettingsScreen.tsx` | 493 | Bassa |
| `ProjectsScreen.tsx` | 461 | Bassa |
| `CreateSalModal.tsx` | 443 | Bassa |
| `ContractorsWorkspace.tsx` | 426 | Bassa |
| `AccountingScreen.tsx` | 414 | Bassa |

Nota: la vecchia metrica "File > 500 righe = 0" non era corretta. Dopo il fix Tariffs e i refactor Projects/Dashboard sono ancora 6 file sopra 500 righe.

---

## Nuovi File Gia Presenti

### Tariffs

| File | Scopo |
|------|-------|
| `features/tariffs/tariffs-data.ts` | fallback data tariffari |
| `features/tariffs/tariffs-types.ts` | tipi condivisi |
| `features/tariffs/utils/tariff-grouping.ts` | grouping voci tariffarie |
| `features/tariffs/utils/tariffs-validation.ts` | validazione import, percentuali, ID |
| `features/tariffs/components/*` | componenti UI estratti |

### Projects

| File | Scopo |
|------|-------|
| `features/projects/projects-data.ts` | mock data estratti |
| `features/projects/types.ts` | tipi condivisi della feature |
| `features/projects/components/ContractorDetailView.tsx` | vista dettaglio appaltatore |
| `features/projects/components/ProjectsWorkbench.tsx` | workbench portfolio progetti |
| `features/projects/components/ContractorsWorkspace.tsx` | workspace appaltatori |
| `features/projects/components/CreateSalModal.tsx` | modal creazione SAL |
| `features/projects/components/SalModal.tsx` | modal SAL |
| `features/projects/components/ContractorModal.tsx` | modal appaltatore |
| `features/projects/components/ControlRailPanel.tsx` | panel segnali/feed |
| `features/projects/components/ProjectActionDialog.tsx` | dialog azioni progetto |
| `features/projects/components/workspace-ui.tsx` | componenti UI piccoli condivisi |
| `features/projects/hooks/useProjectMigration.ts` | workflow import/export Excel |
| `features/projects/hooks/useProjectMutations.ts` | mutazioni CRUD progetto |
| `features/projects/hooks/useProjectPortfolioView.ts` | derivazioni e filtri portfolio |
| `features/projects/utils/buildContractorFolders.ts` | cartelle appaltatori |
| `features/projects/utils/projects-helpers.ts` | helper search, storage, export e filtri |
| `features/projects/utils/project-mappers.ts` | mapper contract/project/SAL |

### Dashboard

| File | Scopo |
|------|-------|
| `features/dashboard/components/DashboardSections.tsx` | sezioni e builder della dashboard |

---

## Priorita Prossime

1. Split `MaterialsScreen.tsx`, perche e il file feature piu grande rimasto dopo Tariffs e contiene probabilmente lista, filtri, dettaglio e import nello stesso punto.
2. Split `ProjectDetailScreen.tsx`, separando header/dossier, metriche, tab operative e pannelli laterali.
3. Rifinire `TariffsScreen.tsx`, che e gia coerente ma ancora sopra 700 righe.
4. Dividere `DashboardSections.tsx`, perche `DashboardScreen.tsx` e stata pulita ma il nuovo aggregatore resta sopra 500 righe.
5. Split `TeamScreen.tsx` e poi `CreateProjectModal.tsx`, entrambi con rischio medio ma meno urgenti.
6. Validare visualmente le schermate dopo gli split, non solo TypeScript.

---

## Piano Operativo Rimanente

### 1. MaterialsScreen

| Voce | Piano |
|------|-------|
| File attuale | `features/materials/MaterialsScreen.tsx` - 649 righe |
| Obiettivo | portarlo sotto 350-400 righe |
| Estrazioni previste | `MaterialsHeader`, `MaterialsFilters`, `MaterialsTable`, `MaterialDetailPanel`, eventuale `useMaterialsView` |
| Rischio | Medio: possibile logica di filtri/stato accoppiata alla UI |
| Verifica | typecheck + apertura schermata materiali + test ricerca/filtro/dettaglio |

Cosa farei: prima isolare componenti puramente presentazionali, poi spostare derivazioni e filtri in hook solo se il file resta troppo grande. Evitare refactor dati se non serve.

### 2. ProjectDetailScreen

| Voce | Piano |
|------|-------|
| File attuale | `features/project-detail/ProjectDetailScreen.tsx` - 636 righe |
| Obiettivo | portarlo sotto 350-420 righe |
| Estrazioni previste | `ProjectDetailHeader`, `ProjectKpiGrid`, `ProjectTimeline`, `ProjectDocumentsPanel`, `ProjectAccountingPanel` |
| Rischio | Medio-alto: riceve dati da `sessionStorage` e fallback, quindi va preservato comportamento di apertura dossier |
| Verifica | typecheck + apertura da Projects/Dashboard verso dettaglio + fallback senza sessionStorage |

Cosa farei: mantenere nel file principale solo recupero progetto selezionato e composizione sezioni. Tutti i pannelli diventano componenti.

### 3. TariffsScreen rifinitura

| Voce | Piano |
|------|-------|
| File attuale | `features/tariffs/TariffsScreen.tsx` - 735 righe |
| Obiettivo | scendere sotto 450 righe |
| Estrazioni previste | `TariffsHeader`, `TariffsToolbar`, `TariffsFilters`, `TariffDetailPanel`, eventuale `useTariffImport` |
| Rischio | Medio: Tariffs e gia stato corretto, quindi qui va evitato rompere wiring import/modal |
| Verifica | typecheck + import preview + selezione tariffario + modifica campo |

Cosa farei: non toccare i componenti gia estratti. Tagliare solo blocchi ancora inline nel file principale.

### 4. DashboardSections

| Voce | Piano |
|------|-------|
| File attuale | `features/dashboard/components/DashboardSections.tsx` - 592 righe |
| Obiettivo | nessun file dashboard sopra 300-350 righe |
| Estrazioni previste | `DashboardMetrics.tsx`, `DashboardOperations.tsx`, `DashboardRail.tsx`, `dashboard-builders.ts` |
| Rischio | Basso: e UI gia spostata, basta separare per dominio |
| Verifica | typecheck + visual check dashboard |

Cosa farei: split meccanico, nessun cambio logica. Spostare i builder fuori dai componenti UI.

### 5. TeamScreen

| Voce | Piano |
|------|-------|
| File attuale | `features/team/TeamScreen.tsx` - 561 righe |
| Obiettivo | portarlo sotto 350-400 righe |
| Estrazioni previste | `TeamHeader`, `TeamStats`, `TeamMembersGrid`, `TeamActivityRail`, `TeamRoleFilters` |
| Rischio | Medio: probabili filtri e stati UI accoppiati |
| Verifica | typecheck + filtri/azioni team |

Cosa farei: dopo Materials/Detail, usare lo stesso schema: componenti prima, hook solo se necessario.

### 6. CreateProjectModal

| Voce | Piano |
|------|-------|
| File attuale | `features/projects/dialogs/CreateProjectModal.tsx` - 508 righe |
| Obiettivo | portarlo sotto 300-350 righe |
| Estrazioni previste | `ProjectIdentityFields`, `ProjectContractFields`, `ProjectTariffFields`, `useCreateProjectForm` |
| Rischio | Medio-alto: form/modal, validazione e submit possono rompersi facilmente |
| Verifica | typecheck + crea progetto + modifica progetto + default appaltatore da cartella |

Cosa farei: ultimo, perche ProjectsScreen e gia pulita. Qui conviene procedere con patch piccole e test manuale del form.

### 7. Cleanup finale

| Voce | Piano |
|------|-------|
| Import inutilizzati | passare typecheck e lint se disponibile |
| Report | aggiornare conteggi finali dopo ogni split |
| Visual QA | controllare Dashboard, Projects, Materials, Detail, Tariffs |
| Git hygiene | non toccare modifiche esterne come `CHANGELOG.md` se non richiesto |

Target finale realistico: nessuna screen principale sopra 450 righe; eventuali aggregatori sopra 500 solo se temporanei e documentati.

---

## Verifiche

```bash
npm run typecheck
```

Esito: passa.

---

## Giudizio Tecnico

Il refactor va nella direzione giusta, ma il report precedente era troppo ottimista. La decomposizione dei tariffari era incompleta perche gli estratti esistevano senza essere davvero usati dal file principale. Ora `TariffsScreen.tsx` e coerente con la struttura estratta e compila.

`ProjectsScreen.tsx` non e piu la priorita principale: e scesa sotto 500 righe e le responsabilita principali sono separate. `DashboardScreen.tsx` e ora molto piccola, anche se il nuovo aggregatore `DashboardSections.tsx` andra eventualmente diviso. Resta lavoro di decomposizione UI soprattutto su `MaterialsScreen`, `ProjectDetailScreen`, `TeamScreen`, `TariffsScreen` e, se si vuole rifinire ulteriormente Projects, su `CreateProjectModal.tsx`.
