# Changelog

All notable changes to Quantara follow SemVer.

## 0.2.1 - 2026-05-01

- **Creazione SAL** — rimossa la navigazione duplicata sopra la procedura guidata: la pagina ora mostra solo la toolbar operativa corretta, con un flusso piu pulito.
- **Nome SAL modificabile** — durante la creazione e ora possibile cambiare il nome della SAL prima della conferma finale.
- **Totali SAL nel dettaglio progetto** — dopo il salvataggio, il totale della SAL viene riportato correttamente nel dettaglio progetto e non resta piu a 0 euro.
- **Lista progetti dentro appaltatore** — le righe dei progetti ora mostrano dati collegati alle SAL reali: stato, importo SAL, avanzamento e indicazioni operative non sono piu valori statici di esempio.
- **Appaltatori** — aggiunto il menu a tre puntini sulle card appaltatore, con possibilita di eliminare una cartella appaltatore dal registro locale.
- **Pulizia appaltatori non reali** — rimossi dalla vista gli appaltatori placeholder come "Senza appaltatore" e "Impresa da contratto", che derivavano da dati incompleti e non dovevano essere gestiti come aziende reali.
- **Sidebar** — il contatore Appaltatori ora usa il numero reale delle cartelle appaltatore, mentre il contatore Progetti resta basato sui contratti presenti.

## 0.2.0 - 2026-04-30

- **Aspetto generale** — tutte le pagine ora hanno lo stesso layout pulito: titolo grande con badge, descrizione, indicatori numerici e pannelli laterali. I filtri e i campi di ricerca sono sempre nella stessa posizione, con lo stesso stile, su ogni schermata. Le notifiche toast sono state spostate in basso a destra e si distinguono meglio dallo sfondo.
- **Progetti** — la schermata principale e la vista dettaglio appaltatore sono state rese piu leggibili e coerenti col resto dell'app. I filtri (ricerca, importa, nuovo) sono ora integrati nel pannello principale, come nelle pagine Tariffe e Materiali. Le card degli appaltatori e dei progetti si aprono cliccando in qualsiasi punto, non solo sul pulsante "Apri".
- **Dettaglio progetto** — ogni SAL ora ha un menu a tre puntini: puoi **approvare** le bozze ed **eliminare** qualsiasi SAL (bozza o approvata). L'eliminazione e reale e definitiva, con conferma e notifica di avvenuta cancellazione.
- **Creazione SAL** — la procedura guidata e stata completamente rivista: la timeline in alto si anima passo dopo passo, i pulsanti "Indietro" e "Continua" sono ora dentro la pagina (non piu nella barra superiore). Il primo passo (impostazioni) ha un layout piu ordinato con la scelta del tariffario a card visive. Tutti i passi hanno lo stesso design coerente.
- **Dashboard** — ridisegnata con lo stesso schema delle altre pagine. La tabella dei cantieri e piu compatta e il pulsante di eliminazione appare solo passando col mouse.
- **Tariffe** — aggiornata con lo stesso design delle altre pagine: card metriche, pannelli laterali, ricerca e filtri sempre visibili.
- **Toast e notifiche** — le notifiche ora appaiono in basso a destra con una leggera animazione. Sono piu visibili e non si confondono con il contenuto della pagina. Eliminato il doppio feedback: ogni operazione mostra un solo messaggio, non piu banner e notifica insieme.
- **Modale nuovo appaltatore** — la finestra di creazione e piu chiara: controlla che il nome sia valido (almeno 2 caratteri), permette di inserire un referente opzionale e da conferma visiva prima di creare.
- **Sidebar** — animazioni ridotte per un'esperienza piu rapida. I tooltip informativi ora hanno un bordo e un'ombra per non sovrapporsi al contenuto delle pagine.
- **Prestazioni** — le schermate si caricano solo quando servono. I calcoli dei SAL sono piu efficienti. La sidebar e i dati si aggiornano automaticamente quando crei o elimini un progetto. Le animazioni di ingresso delle pagine sono state sostituite con CSS leggeri: la CPU non deve piu calcolare decine di motion.div all'avvio di ogni schermata, ma a video non si nota differenza.
- **Materiali** — riscritta da zero: ora puoi creare, modificare ed eliminare materiali. I dati sono reali (database locale) e non di esempio. Ogni operazione mostra una notifica di conferma.
- **Contabilita** — ora funziona: scegli appaltatore, progetto, periodo e stato, selezioni i SAL da includere e vedi il totale. Pronta per generare il certificato di pagamento.
- **Navigazione** — i pulsanti avanti e indietro sono ora sempre visibili, anche dalla Dashboard. Entrare in un appaltatore e tornare indietro non rimanda piu alla Dashboard.
- **Bordi, finestre e tema scuro** — i bordi di card e pannelli sono piu sottili. Tutte le finestre (creazione progetto, voci tariffarie, modifica) ora hanno lo stesso aspetto coerente. Il tema scuro e piu leggibile: bordi visibili, card distinguibili dallo sfondo, messaggi di stato (verde, giallo, rosso) piu riconoscibili.
- **Voci tariffarie** — la finestra e stata resa molto piu leggibile: navigazione nei gruppi di voci uno per volta, con vista dedicata. Niente piu lista infinita.
- **Import PDF multipli** — ora puoi selezionare piu file PDF contemporaneamente. La schermata di elaborazione mostra lo stato di ogni file (in attesa, in lettura, completato, errore). In preview puoi passare da un file all'altro, revisionare le voci e confermare solo dopo averle controllate tutte.
- **Campi di testo** — unificata altezza e forma dei campi nelle finestre. Il menu per scegliere l'appaltatore mostra subito tutte le opzioni disponibili.

## 0.1.60 - 2026-04-30

- Fix import tariffari cross-platform: il bundle Tauri include ora il parser nella posizione corretta e la release desktop non dipende piu da `py -3` sul client.
- Fix caratteri speciali nell'import: l'output del parser viene letto in modo strict e con fallback Windows-1252, cosi accenti e simboli tecnici non diventano piu `?` o `�` nei nuovi import.
- Vari Fix applicati a schermate Dashboard, Creazione Progetto e Creazione SAL.
- Migliorata la UX dell'import: il parser gira senza finestra terminal visibile durante il caricamento.

## 0.1.55 - 2026-04-29

- Rework del flusso SAL: separati selezione voci, tabella di modifica e recap economico per avere una vista piu chiara e usabile.
- Resi modificabili i fattori delle righe SAL con ricalcolo automatico di quantita e importi.
- Catalogo SAL: descrizioni troncate in modo controllato e righe raggruppate con selezione piu leggibile.
- Riepilogo SAL: aggiunto il valore del ribasso gara applicato, calcolato sulla percentuale impostata nello step di contesto.
- Timeline SAL: sostituiti gli step numerici con una timeline a stati piu moderna e coerente con il workflow reale.
- Topbar SAL: rimossi elementi duplicati rispetto alla barra globale, lasciando solo i comandi del wizard.
- Cleanup prestazionale generale su store, Projects e SAL per ridurre rerender e calcoli ripetuti.

## 0.1.54 - 2026-04-28

- Pagina Progetti: la schermata si apre molto piu velocemente grazie a una riorganizzazione interna dei componenti.
- Catalogo Tariffari: rimosso il pannello voci dal dettaglio tariffario che rompeva il layout della pagina.
- Risolti 5 problemi di sicurezza nella gestione dei numeri e dei calcoli (importi vuoti, percentuali fuori scala, valori non validi).
- Migliorata la stabilita generale: meno errori imprevisti durante creazione progetti, import Excel e gestione SAL.
- La barra in alto e ora piu snella: legge le informazioni dallo stato dell'app invece di ricevere tanti parametri dalle schermate.

## 0.1.53 - 2026-04-28

- Corretto l'import RFI AC 2025: il parser PDF mantiene le descrizioni multilinea, filtra intestazioni e avvertenze di pagina, normalizza gli escape Unicode non validi e conserva la percentuale di manodopera per ogni singola sottovoce.
- Aggiornata la preview import tariffari con la colonna Manodopera editabile e persistita come dato separato dalla categoria della voce.
- Sistemati i filtri progetto del catalogo Tariffari: ora usano solo i contratti realmente presenti nel database locale e non mostrano piu dati dimostrativi quando l'app gira in desktop.
- Preparato il bundling del parser RFI per distribuire l'eseguibile aggiornato insieme alla release desktop.

## 0.1.52 - 2026-04-28

- Hotfix Tariffario: ridisegnato il catalogo tariffari con layout a tre aree, KPI compatti, registro centrale esteso, pannello dettaglio e anteprima voci coerenti con il nuovo stile desktop.
- Hotfix Tariffario: fix dei pannelli che rimanevano visibili scorrendo.
- Migliorata la responsivita della pagina Tariffario su schermi piccoli, con gerarchia tipografica piu leggibile e azioni di import piu evidenti.

## 0.1.51 - 2026-04-28

- Ridisegnata la pagina Team in stile gestione workspace: metriche compatte, tabella membri, invito membro e riepilogo ruoli/permessi in una vista piu ordinata e responsive.
- Rimossa dalla pagina Team la duplicazione del titolo/gestione gia presente nella Topbar; l'azione principale ora mostra "Aggiungi membro" direttamente nella barra superiore.
- Migliorata la sidebar: testi allineati a sinistra, vista espansa piu compatta, pulsante di compressione riposizionato e tooltip informativi su hover/focus.
- Rinominata la voce "Progetti" in "Appaltatori" nella sidebar, con badge distinti per numero di appaltatori e numero totale di progetti.
- Aggiunti indicatori di rischio sui Materiali nella sidebar, con conteggi separati per materiali critici e materiali in esaurimento.
- Raffinata la pagina Materiali con dati esportabili verso la sidebar e correzioni di typecheck/lint.

## 0.1.50 - 2026-04-27

- Rinnovato completamente l'aspetto dell'app: tutti i pannelli, le card e le tabelle hanno ora uno stile uniforme e pulito su ogni schermata.
- La sidebar e ora comprimibile ed espandibile: cliccando la freccia in basso si possono vedere solo le icone, lasciando piu spazio al contenuto principale.
- Aggiunta la pagina Team, raggiungibile dalla sidebar: mostra i componenti del team, i ruoli, i progetti assegnati e il carico di lavoro di ciascun membro.
- Migliorata la pagina Impostazioni: ora ha un aspetto piu tecnico e ordinato, con informazioni chiare su versione, aggiornamenti e preferenze di interfaccia.
- Migliorata la pagina Dettaglio Progetto: i dati del progetto (budget, SAL, milestone, team) sono ora piu leggibili e ben organizzati.
- Migliorata la pagina Progetti: il riepilogo e ora piu chiaro, con metriche in evidenza e filtri sempre visibili.
- Uniformato l'aspetto di Tariffario, Materiali e Contabilita allo stesso stile delle altre pagine.
- Corretti diversi problemi di visualizzazione e di coerenza dei colori tra tema chiaro e tema scuro.
- La barra di scorrimento laterale e ora sottile, arancione e senza frecce, coerente con il tema dell'applicazione.

## 0.1.44 - 2026-04-27

- Riorganizzata la sezione Progetti attorno agli appaltatori: ora si parte dalle cartelle appaltatore e, entrando in una cartella, si vedono solo i progetti collegati.
- Aggiunta la creazione degli appaltatori direttamente dalla schermata Progetti, con una finestra dedicata e un flusso piu pulito.
- Migliorata la creazione dei progetti: quando si crea un progetto dentro una cartella viene agganciato automaticamente all'appaltatore scelto; dalla Topbar e invece possibile selezionarlo manualmente.
- Spostato il riepilogo delle ultime SAL nella vista appaltatori e migliorata la leggibilita: ogni SAL mostra chiaramente appaltatore, progetto, stato e data.
- Sostituito il vecchio comando "Nuova SAL" con un vero flusso guidato: scelta appaltatore, progetto, tariffari, voci tariffarie e creazione di una bozza SAL.
- Aggiunta una bozza SAL visuale dove si possono impostare quantita e maggiorazioni per le singole voci selezionate.
- Rimossa la vecchia schermata SAL separata, integrando la gestione SAL nel flusso dei progetti e degli appaltatori.
- Migliorata la vista interna alle cartelle appaltatore: il registro a righe e ora la vista principale, con la board lasciata come vista alternativa.

## 0.1.43 - 2026-04-26

- Add a global command palette opened from the Topbar or `Ctrl+K`, now anchored to the actual Topbar search trigger as a compact popover instead of a detached panel near the sidebar.
- Add application-wide keyboard shortcuts for contextual creation with `Ctrl+N`, shortcut help with `Ctrl+/`, shell history navigation with `Alt+ArrowLeft/Right` and Escape close behavior for shortcut surfaces.
- Add a shared toast notification provider with typed tones, manual dismiss, optional actions and global event support, then wire feedback into Topbar actions, project CRUD, SAL and tariff workflows.
- Convert the Topbar search field into a command palette trigger with a visible `Ctrl K` affordance.
- Redesign update availability and post-install patch notes as centered, theme-aware modal dialogs with clearer release metadata, notes and primary actions in both light and dark mode.
- Rework project actions so board/register rows use a fixed action dialog and delete confirmation instead of clipped inline dropdowns.
- Connect Project Detail to the selected real project record, deriving budget, committed/executed values, SAL rows, milestones, team context and activity feed from that project.
- Connect Dashboard portfolio rows and metrics to the real project list, including live budget totals, status distribution, escalation counts, SAL signals and project-detail navigation.
- Prepare the QOL updates for manual verification without starting the preview server.

## 0.1.42 - 2026-04-25

- Add Excel migration workflow in Projects with standard template download, local export, `.xlsx` import preview, validation summary and commit for valid project contracts.
- Add user feedback for migration actions, including loading states, disabled controls while busy, accessible status messages and reset for import previews.
- Persist SAL workflow data through the existing `zustand` store pattern and split SAL table rendering into reusable table/group/pagination components.
- Replace ad-hoc navigation events with a shared navigation hook and direct Topbar action callbacks.
- Add shared desktop accounting types and Euro amount parsing helpers to reduce duplicated parsing and local type drift.
- Extend tariff PDF preview parsing to support RFI-style `50XXXX` tariff codes.

## 0.1.41 - 2026-04-25

- Rework the desktop screens around shared enterprise UI primitives for consistent spacing, panels, metrics and summary rows.
- Improve Projects, Register and Project Detail UX with real project navigation, working edit flow, safer project creation validation and no tariff import inside the project modal.
- Align Topbar actions across screens while keeping tariff import available only where it belongs.
- Redesign the sidebar with a cleaner logo lockup, expandable project focus switcher, refined demo account block and generated app version.
- Add subtle app-wide aura/grain depth, pointer cursors and GPU-friendly sidebar/interactive microinteractions.
- Simplify the updater flow so patch notes are shown before install and the first relaunch only confirms the latest version is operational.

## 0.1.40 - 2026-04-24

- Accept user data input for projects management.
- Implement clear SAL workflow with defined input steps and validation.
- Prepare infrastructure to accept new data types in future releases.

## 0.1.32 - 2026-04-24

- Add ad-hoc macOS code signing for test DMG builds so Gatekeeper no longer reports the app as damaged on Apple Silicon.
- Publish GitHub release notes from the matching `CHANGELOG.md` version section.
- Keep the in-app post-update patch notes aligned with the release notes shown after restart.

## 0.1.31 - 2026-04-23

- Replace the native updater prompt with a branded in-app release cockpit showing notes, progress and install state.
- Repair Windows shell identity on startup so updated builds realign Start Menu and desktop shortcut icons with the current executable.
- Sync desktop release metadata to the new updater flow and release version.

## 0.1.2 - 2026-04-23

- Fix CI quality gate formatting and lint alignment.
- Keep release workflow tied to GitHub tags and updater artifacts.

## 0.1.1 - 2026-04-23

- Add automatic updater flow with GitHub Releases.
- Add branded Windows installers and macOS DMG assets.
- Add release notes dialog shown after updater relaunch.

## 0.1.0 - Unreleased

- Bootstrap enterprise workspace for Phase A foundations.
- Add centralized UI token system and desktop shell baseline.
- Add initial accounting domain rules for tariff priority, SAL totals and OS exclusion from discounts.
