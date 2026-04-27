# Changelog

All notable changes to Quantara follow SemVer.

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
