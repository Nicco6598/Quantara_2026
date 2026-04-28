# Quantara App - QOL Improvements

> **Status**: Migrazione Excel collegata alla UI, persistenza SAL attiva, parser RFI base operativo. QOL shell 0.1.43 completati: command palette ancorata alla search della topbar, shortcut globali, help scorciatoie, toast globali, modali update/patch notes theme-aware e dati progetto reali in Dashboard/Dettaglio.

## Panoramica

Questo documento raccoglie e riorganizza i principali miglioramenti QOL previsti per Quantara, con priorità, impatto, dipendenze tecniche e milestone operative. L'obiettivo è migliorare affidabilità, migrazione dati, produttività operativa e qualità dell'esperienza utente.

## Priorità alta

### 1. Import/Export Excel per migrazione dati

Questa funzionalità è fondamentale per acquisire nuovi clienti che provengono da sistemi legacy.

**Scenario previsto:** ogni cliente esporta dal proprio sistema, importa in Quantara e converge verso un formato standard unico definito dall'app.

**Linee guida:**
- Considerare il flusso come migrazione una tantum, non sincronizzazione continua.

**Campi da supportare**

```csv
# Progetti
title, frameworkAgreementCode, applicationContractCode, contractualAmount, tariffBookId, client, year, description

# SAL
title, projectTitle, date, description, notes, voiceCode, quantity, surcharge, unitPrice

# Materiali
code, description, category, unit, quantity, unitCost, supplier
```

**Stato tecnico:** formato standard, template workbook, parsing, validazione, download template, export e import UI sono collegati in `ProjectsScreen`. Il commit crea i contratti progetto validi; SAL e materiali restano validati in preview finché non esiste persistenza dedicata.

### 2. Parser tariffario PDF RFI

Funzionalità prioritaria per importare tariffari ufficiali RFI.

**Contesto:**
- Ogni categoria tariffaria (`BA`, `AM`, `AC`, `FA`, `OS`, `TC`, ecc.) può avere layout diverso.
- I codici seguono il formato `50XXXX`.
- Ogni voce contiene codice, descrizione, prezzo, unità e categoria.

**Approccio scelto:** hybrid parsing (`regex` + validazione UI)

```text
PDF → Text extraction → Regex patterns → Preview UI → Validazione manuale → Commit
```

**Stato tecnico:** il comando Tauri `import_tariff_pdf_preview` estrae testo PDF-like, inferisce metadati, crea preview e ora supporta anche codici RFI `50XXXX`.

**Da completare:**
- Colonne: Codice, Descrizione, Prezzo, Categoria, Status.
- Status: `✅ Valido`, `⚠️ Warning`, `❌ Errore`.
- Bulk actions: riclassifica categoria, deduplica.
- Correzioni manuali inline prima del commit.

### 3. Export strutturati

Serve un sistema di esportazione più completo e professionale.

**Da introdurre:**
- Export PDF dei SAL.
- Export CSV per compatibilità Excel.
- Report configurabili con campi selezionabili.
- Stampa unione per invio committenza.

**Integrazione:** collegare `packages/pdf-export` a `SalScreen.tsx`.

### 4. Bulk operations nelle tabelle

Per migliorare l'operatività su dataset più grandi servono azioni massive.

**Funzionalità richieste:**
- Selezione multipla con checkbox in testata.
- Azioni bulk: elimina selezionati, chiudi SAL multipli, export selezionati.
- Supporto a select all e invert selection.

**Componenti target:** `SalTable`, `ProjectsWorkbench`

### 5. Search e filter globale

La ricerca deve diventare trasversale all'intera applicazione.

**Stato tecnico 0.1.43:** introdotta command palette globale dalla topbar con shortcut `Ctrl+K`, renderizzata come popover agganciato al trigger reale della barra ricerca invece che come pannello scollegato vicino alla sidebar. La palette consente navigazione rapida tra pagine, lancio azioni principali (`Nuovo progetto`, `Nuovo SAL`, `Importa tariffario`) e cambio tema. La ricerca dati trasversale su dataset applicativi resta da completare.

**Obiettivi:**
- [ ] Ricerca unificata su progetti, SAL e materiali.
- Filtri salvati come template riutilizzabili.
- Quick filter predefiniti come “miei progetti”, “ultimi 7 giorni”, “bloccati”.

**Target UI:** command palette in topbar con shortcut `Ctrl+K` implementata e visivamente ancorata alla ricerca; restano da collegare ricerca dati e filtri salvati.

## Priorità media

### 6. Table improvements

Per migliorare usabilità e performance delle tabelle:
- Sorting cliccabile su colonne.
- Column resizing.
- Virtualizzazione per liste grandi.
- Pagination o infinite scroll.
- Frozen columns per referenze lunghe.

**Libreria suggerita:** `@tanstack/react-virtual`

### 7. Form validation UX

La UX dei form va resa più robusta e leggibile.

**Interventi proposti:**
- Validazione inline più chiara.
- Errori raggruppati nell'header del form.
- Avviso di `unsaved changes` prima della navigazione.
- Auto-save draft ogni 30 secondi.

### 8. Keyboard shortcuts

Shortcut da consolidare o aggiungere:
- [ ] `Ctrl+S` per salvataggio rapido.
- [x] `Escape` per chiusura command palette e guida scorciatoie.
- [x] `Ctrl+K` per command palette.
- [x] `Ctrl+N` per nuovo progetto/SAL contestuale.
- [x] `Ctrl+/` per help shortcuts.
- [x] `Alt+Freccia sinistra/destra` per navigazione cronologia shell.

### 9. Undo/Redo base

Da introdurre almeno per le azioni distruttive.

**Scope iniziale:**
- Delete.
- Close SAL.
- History limitata alle ultime 10 azioni.
- Pulsante undo nel toast di conferma.

### 10. Auto-save draft

L'auto-save va considerato anche come feature autonoma, oltre che supporto ai form.

**Requisiti:**
- Salvataggio automatico ogni N secondi.
- Ripristino dopo crash o riavvio.
- Indicatore visivo “salvato” in interfaccia.

## Priorità bassa

### 11. Quick actions

- Action bar contestuale su selezione.
- Context menu con click destro.
- Shortcut di riga, ad esempio `E` per edit e `D` per delete.

### 12. Tutorial e onboarding

- Wizard di primo avvio.
- Tooltip per nuove feature.
- Dialog “What’s new” dopo gli aggiornamenti.

**Stato tecnico 0.1.43:** schermata nuovo update e conferma patch notes post-riavvio reworkate come modali centrati, coerenti con i token del tema chiaro/scuro e con gerarchia piu leggibile: versione, metadati release, note e azioni primarie.

### 13. Notification system

- Toast per feedback operativi.
- Integrazione con notifiche OS per eventi importanti.

**Stato tecnico 0.1.43:** introdotto `ToastProvider` condiviso con toni `info`, `success`, `warning` e `danger`, chiusura manuale, limite visuale, supporto ad azione opzionale ed evento globale `quantara-toast`. Collegati i toast alle azioni topbar principali, a creazione/modifica/eliminazione progetti, SAL e tariffari.

**Esempi:**
- “Progetto creato con successo”
- “SAL salvata”
- “Eliminazione annullata”

### 14. Dashboard personalizzabile

- Widget riordinabili.
- Show/hide widget.
- Layout persistito per utente.

### 15. Sticky headers

- Header tabella sempre visibile durante lo scroll.
- Sticky state anche nelle sidebar, dove utile.

### 16. QOL per tariffari e import

- Quick open degli ultimi tariffari usati, con pin dei preferiti.
- Ricerca tariffari con filtro persistito per categoria, anno e stato.
- Preview import con salto diretto alla riga errore/warning.
- Evidenza dei duplicati con proposta di merge o sostituzione.
- Confronto affiancato tra due versioni dello stesso tariffario.
- Export di un sottoinsieme filtrato, non solo dell'intero book.
- Cache locale dell'ultimo tariffario aperto per ridurre i tempi di riapertura.

### 17. File troppo grandi da spezzare

Ci sono alcuni file che oggi meritano una separazione più netta:

- `apps/desktop/src/features/projects/ProjectsScreen.tsx` - 2162 righe. È il principale candidato: conviene separare container pagina, toolbar, board/workbench, migrazione Excel e stato form in moduli diversi.
- `apps/desktop/src/features/sal/SalScreen.tsx` - 859 righe. Ha già `components/` e `domain/`, ma la schermata può essere ulteriormente divisa in shell, toolbar, modale SAL e sezioni progetto/voce.
- `apps/desktop/src/features/tariffs/TariffsScreen.tsx` - 607 righe. Buon candidato per estrarre tabella, pannello filtri, dialog di import e preview in componenti dedicati.
- `apps/desktop/src-tauri/src/infrastructure/tariff_repository.rs` - 528 righe. Conviene separare query, mapping, import preview e validazione in moduli `books`, `voices` e `import`.
- `apps/desktop/src/features/projects/dialogs/CreateProjectModal.tsx` - 434 righe. Può diventare più semplice dividendo schema form, rendering step e helpers di validazione.
- `packages/excel-import/src/index.ts` - 315 righe. Se continua a crescere, meglio dividerlo in `parse`, `serialize`, `validate` e tipi condivisi.
- `apps/desktop/src/theme/app.css` - 329 righe. Da tenere sotto controllo se il design system cresce: utile separare tokens, layout e component styles.

File grandi da non trattare come target di refactor manuale:

- `apps/desktop/src-tauri/gen/schemas/desktop-schema.json`
- `apps/desktop/src-tauri/gen/schemas/windows-schema.json`

Sono artefatti generati e la loro dimensione non indica un problema architetturale del codice sorgente.

## Cambiamenti di flusso proposti

| Flusso attuale | Problema | Flusso proposto |
|---|---|---|
| Creazione progetto solo da modal | Non inline | Creazione inline + edit in-place |
| Messaggi di errore inline | Dispersi | Centralizzazione in toast |
| Delete confermato solo via dropdown | Clipping e rischio azione involontaria | Dialog fisso di azioni progetto + conferma eliminazione |
| Dashboard con righe statiche | Metriche non aderenti al portafoglio reale | Dashboard alimentata dai contratti progetto disponibili |
| Dettaglio progetto con fallback generico | KPI non collegati al dossier aperto | Dettaglio derivato dal progetto selezionato e dai contratti reali |

### Toast notification system

**Implementato 0.1.43:** il provider è disponibile in `apps/desktop/src/components/shared/ToastProvider.tsx` e avvolge la shell in `App.tsx`.

```typescript
function Toast({ message, type = 'info', onUndo }) {
  return (
    <div className="toast">
      <span>{message}</span>
      {onUndo && <button onClick={onUndo}>Undo</button>}
    </div>
  );
}

<ToastProvider>
  <App />
</ToastProvider>
```

### Dati reali in Dashboard e Dettaglio progetto

**Implementato 0.1.43:** `DashboardScreen.tsx` e `ProjectDetailScreen.tsx` leggono i contratti tramite `listDesktopContracts`, riusano il mapping progetto di `ProjectsScreen` e cadono sul portfolio demo solo quando non ci sono dati runtime. Le metriche principali ora derivano dal progetto/portfolio corrente: budget totale, avanzamento, stato, SAL, forecast, milestone, attività e distribuzione criticità.

Per naming enterprise, mantenere `Dashboard` come route primaria è preferibile: è un termine chiaro per executive overview e controllo portfolio. `Workbench` funziona meglio come sottovista operativa del registro progetti, dove l'utente lavora riga per riga.

## Cosa non cambiare

Le seguenti basi sono considerate solide e non richiedono modifiche strutturali:
- Layout generale con sidebar, topbar e pannelli.
- Componenti `MetricTile` e `StatusBadge`.
- Sistema di design token.
- Modal pattern per create/edit nei flussi complessi.
- Color palette con stati `danger`, `warning`, `success`, `info`.

## Milestones suggerite

### Milestone 1 — Migration e tariffario PDF
- [ ] Auto-save draft.
- [ ] Indicatore stato salvataggio.
- [ ] UI di validazione e preview parsing.
- [ ] Commit SAL e materiali dalla migrazione Excel quando esiste persistenza dedicata.

### Milestone 2 — Tabelle e ricerca
- [ ] Sorting colonne.
- [x] Command palette globale.
- [ ] Ricerca dati e filter globale.
- [ ] Bulk operations.

### Milestone 3 — UX improvements
- [x] Keyboard shortcuts.
- [x] Shortcut help dialog.
- [x] Toast notifications.
- [ ] Undo/Redo.

### Milestone 4 — Export e report
- [ ] Export PDF integrato.
- [ ] Export CSV.
- [ ] Report configurabili.

## Note tecniche

### Store pattern da replicare

```typescript
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({ /* actions */ }),
    {
      name: 'quantara-key',
      partialize: (state) => ({ /* campi da persistere */ }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Considerazioni performance

- Virtualizzazione solo oltre 50 elementi.
- Debounce ricerca a 300 ms.
- Memoizzazione per selettori complessi.
- Lazy loading per immagini e documenti.

### Accessibility

- Aggiungere ARIA labels dove mancanti.
- Migliorare focus management nei modali.
- Garantire keyboard navigation completa.
- Verificare contrasti colore secondo WCAG AA.
