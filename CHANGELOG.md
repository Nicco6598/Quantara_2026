# Changelog

All notable changes to Quantara follow SemVer.

## 0.5.0 — 2026-05-27

### SAL — copia, incolla e duplica come in un foglio di lavoro

- **Copia e incolla voci e misure** — nel registro misure puoi copiare un'intera voce o solo le righe di misura (fattori, quantità, note) e incollarle su un'altra riga o come nuova voce. Funziona con **tasto destro** sul registro, con **Ctrl+C / Ctrl+V** quando sei sulla riga, oppure incollando da un altro documento se Quantara riconosce il formato.
- **Duplica voce o riga misura** — dal menu contestuale puoi duplicare una voce già inserita (utile quando la stessa voce tariffaria compare più volte nel SAL con quantità diverse) oppure duplicare una singola riga misura sopra o sotto quella selezionata.
- **Aggiungi voce dalla ricerca col tasto destro** — nei risultati della barra di ricerca, clic destro → **Aggiungi al SAL** oppure **Copia codice**, senza uscire dalla ricerca.
- **La bozza salva subito ciò che incolli** — dopo incolla o duplica, la bozza locale viene aggiornata immediatamente. Non serve più uscire dal SAL o aspettare un salvataggio manuale per ritrovare la voce copiata riaprendo la bozza.
- **Indicatore di salvataggio in testata** — mentre compili il SAL vedi **Salvataggio…** / **Salvato** accanto al titolo, così sai quando la bozza è scritta su disco (oltre al salvataggio immediato dopo incolla).

**Come usarlo in pratica**

1. Vai allo step **Misure**.
2. Clic destro su una voce → **Copia voce**, poi clic destro su un'altra area del registro → **Incolla voce** (oppure **Ctrl+V** con la riga attiva).
3. Per le sole righe di misura: espandi la voce, clic destro sulla riga → **Copia riga** / **Incolla sopra** / **Incolla sotto**.
4. Controlla l'indicatore in alto: quando compare **Salvato**, puoi chiudere l'app senza perdere il lavoro.

### SAL — ricerca voci più precisa (anche per codice)

- **Ricerca per tratta di codice** — nella barra di ricerca puoi digitare il prefisso di una voce come la scrivi sul tariffario (es. `SS.AC.F.2` o `FA.PM.A.2001`): Quantara filtra per segmenti del codice, non solo per testo libero nella descrizione.
- **Ricerca più veloce su cataloghi grandi** — l'elenco delle voci tariffarie viene preparato in anticipo quando selezioni i tariffari nello step Progetto, così la ricerca nello step Misure resta scattante anche con decine di migliaia di voci.
- **Filtro per tariffario nella ricerca** — puoi restringere i risultati al solo tariffario che ti interessa (come nelle versioni precedenti, ma con indice più leggero e risposta più rapida).

**Suggerimento** — per trovare una voce lunga, inizia dal codice (es. `MO.AI.F.31`) e aggiungi parole della descrizione solo se serve restringere.

### SAL — maggiorazioni MG corrette sulle voci duplicate

- **MG solo sulle righe che scegli tu** — se hai due o più istanze della stessa voce tariffaria (stesso codice, righe diverse nel registro), la maggiorazione MG si applica **solo alle righe spuntate** nel pannello di assegnazione, non a tutte le copie insieme.
- **Righe duplicate più riconoscibili** — nel dialog di assegnazione MG compaiono il numero di riga (**#2**, **#3**…) e l'etichetta **Istanza duplicata**, così capisci quale riga stai collegando alla maggiorazione.
- **Importi MG più fedeli al tariffario** — il calcolo della maggiorazione tiene conto della **quota manodopera** della voce (non solo del lordo intero), sia nel registro sia nella **ricevuta contabile** dello step Verifica/Riepilogo.
- **Clic destro sulla voce MG** — sulla chip o sulla riga MG in testata: **Assegna voci destinatarie**, **Disattiva maggiorazione** o **Rimuovi voce MG**.

**Come assegnare la MG su una sola copia**

1. Inserisci la voce MG (o usane una suggerita in testata).
2. Clic **Assegna voci** / **Modifica voci destinatarie**.
3. Spunta **solo** le righe che devono ricevere la maggiorazione (guarda il **#** se il codice è ripetuto).
4. Conferma con **Applica a N voci**.

### SAL — registro misure più comodo e più veloce

- **Intestazione colonne fissa** — scorrendo un SAL lungo, la riga con i titoli delle colonne (codice, descrizione, quantità, importi…) resta visibile in alto; non perdi il riferimento mentre compili le misure in basso.
- **Step Misure più reattivo** — con molte voci tariffarie il passaggio allo step Misure è sensibilmente più rapido: l'indice di ricerca si prepara già nello step Progetto e il registro non ricalcola tutto due volte all'ingresso.
- **Righe espanse senza sovrapposizioni** — aprendo il dettaglio misure di una voce, la riga sottostante non si sovrappone più al contenuto espanso sopra.
- **Espandi / comprimi tutto** — pulsante **Espandi** / **Comprimi** in testata al registro (scorciatoia **Ctrl+Shift+E**) per aprire o chiudere tutte le voci in un colpo solo.
- **Maggiorazioni in testata, registro a tutta larghezza** — le MG restano compatte sopra il foglio; il libretto misure usa tutta la larghezza utile dello schermo.

### SAL — bozze, ripresa e step Verifica

- **Riprendi la bozza con tutte le righe** — se avevi duplicato la stessa voce più volte, riaprendo la bozza le ritrovi tutte (non viene tenuta solo l'ultima occorrenza).
- **Regole MG e voci allineate al salvataggio** — salvataggio bozza e ripresa tengono insieme voci, misure e assegnazioni MG in modo coerente, anche dopo molte modifiche o un cambio tariffario sul progetto.
- **Materiali nello step Verifica sempre aggiornati** — se modifichi le giacenze in Magazzino mentre hai un SAL aperto, la lista materiali in Verifica si aggiorna senza dover ricaricare l'app.
- **Clic destro sui materiali in Verifica** — **Copia codice** o **Azzera quantità usata** sulla riga del materiale collegato al SAL.

### Dettaglio progetto e Dashboard — SAL e navigazione

- **Clic destro sulle card SAL** — nel dossier progetto: **Continua bozza**, **Invia in revisione** / **Approva** (a seconda dello stato) o **Elimina SAL**, senza aprire prima il menu a tre puntini.
- **Elenco SAL allineato al database** — bozze, SAL in revisione e confermati nel progetto e in Dashboard si aggiornano quando salvi o elimini un documento, senza restare su conteggi obsoleti.
- **Ripresa bozza più stabile** — il SAL che stavi riprendendo viene ricordato in modo più affidabile quando passi tra schermate (meno dipendenza da dati temporanei del browser).
- **Appaltatori sui progetti vecchi** — in Dashboard i nomi appaltatore sui cantieri importati o creati in passato vengono mostrati correttamente anche se erano salvati in un formato precedente.

### Menu contestuale — azioni rapide ovunque serve un clic destro

- **Progetti** — **Apri dossier**, **Modifica progetto**, **Elimina progetto**.
- **Tariffari** — **Mostra scheda**, **Segna / Rimuovi preferito**, **Modifica dettagli**, **Modifica voci**, **Elimina tariffario**; sulle singole voci: **Copia codice voce**, **Elimina voce**.
- **Materiali** — **Copia codice**, **Modifica**, **Elimina materiale**.
- **Team** — **Copia email**, **Rimuovi membro**.
- **Contabilità** — su ogni SAL in elenco: **Copia titolo**, **Apri progetto**.
- **SAL (registro misure)** — voci, righe misura, MG e risultati ricerca (vedi sezioni sopra).

**Suggerimento** — se un'azione è disabilitata (es. incolla senza nulla in memoria), passa il mouse sulla voce: spesso compare un suggerimento sul perché.

### Registro attività — cronologia reale dal database

- **Attività salvate sul disco** — creazioni, modifiche, conferme SAL, scarichi magazzino e altre operazioni importanti finiscono in un registro persistente (non solo in memoria fino al riavvio).
- **Dashboard e Impostazioni** — il pannello **Attività recenti** mostra ora azioni etichettate in italiano (es. *Salvataggio · SAL*, *Creazione · Materiale*) con orario, ricaricandosi quando qualcosa cambia nel database locale.

### Tariffari — import PDF più accurato

- **Codici voce con spazi corretti** — nell'import da PDF RFI, voci come `SS.AC.F.2 01.A` non vengono più compresse in codici illeggibili (`SS.AC.F.201.A`): il parser ripristina lo spazio nel numero voce quando il PDF lo perde in estrazione.
- **Parser sempre aggiornato in sviluppo** — se ricompili il parser tariffario, l'app desktop rileva il nuovo eseguibile e lo riavvia senza dover chiudere Quantara manualmente.

### Backup, ripristino e dati locali

- **Backup include anche le bozze di import tariffario** — un export/backup del database locale porta con sé anche le anteprime di import tariffari ancora in sospeso, utili se reinstalli o sposti il PC.
- **Dati di navigazione più coerenti** — progetto selezionato, bozza SAL da riprendere e sessioni di modifica progetto sono gestiti in modo uniforme, con migrazione automatica dai vecchi salvataggi nel browser.

### Dati sempre aggiornati tra una schermata e l'altra

- **Le liste si aggiornano da sole** — dopo aver creato o modificato progetti, SAL, materiali, tariffari o appaltatori, tornando alla Dashboard, al dettaglio progetto, alla sidebar o alle liste non resti bloccato su dati vecchi finché non riavvii l'app.

### Temi e interfaccia — cambio aspetto più fluido

- **Cambio tema più immediato** — passare da chiaro a scuro (o tra le palette Ambra, Foresta, Midnight…) non blocca più l'interfaccia né il registro SAL; le transizioni visive sono state alleggerite.
- **Impostazioni tema semplificate** — dalla schermata Impostazioni il cambio tema è diretto, senza ricaricamenti doppi inutili.

### Export e documenti (richiamo utile)

- **PDF e Excel dal SAL** — nello step **Conferma** restano disponibili export PDF (report, libretto, stampa contabile) e, dove previsto, export Excel. Usa i pulsanti in testata quando il SAL è pronto per la chiusura.

### Correzioni importanti

- **Niente più errore "Maximum update depth"** — incollando o inserendo voci non compare più il blocco dell'interfaccia che obbligava a ricaricare.
- **MG e bozza allineati alle righe reali** — risolti i casi in cui la spunta MG sembrava applicarsi a tutte le copie della stessa voce, o in cui la voce incollata non compariva riaprendo la bozza.
- **Importi MG in ricevuta** — allineati al nuovo calcolo sulla quota manodopera, coerenti con il registro misure.

## 0.4.32 — 2026-05-26

### UI generale — più coerenza tra schermate e componenti

- **Layout applicativo più uniforme** — riallineate molte schermate allo stesso linguaggio visivo: header più puliti, metriche compatte, pannelli coerenti, toolbar operative e spaziature più regolari.
- **Componenti condivisi più solidi** — ritoccati bottoni, card, panel, stati vuoti, metriche e primitive UI per ridurre differenze tra sezioni e rendere l'interfaccia più prevedibile.
- **Token e superfici più ordinati** — rivisti colori, bordi, ombre e stati soft per avere una resa più consistente nei diversi temi dell'app.

### Dashboard e progetto — viste operative più leggibili

- **Dashboard più orientata al controllo** — riorganizzate priorità, stato portafoglio, timeline, grafici e azioni rapide con una struttura più chiara per leggere subito cantieri, SAL e rischi.
- **Dettaglio progetto più coerente** — ridisegnata la vista progetto con header più sobrio, metriche in evidenza, registro SAL più centrale e pannelli laterali più utili.
- **Timeline progetto più pulita** — resa più simile agli altri pannelli operativi, con gerarchia tipografica e contenitori allineati al resto dell'app.

### Tariffari, SAL e materiali — flussi più ordinati

- **Tariffari più gestibili** — migliorata la schermata tariffari e aggiunto un flusso dedicato per inserire nuove voci, mantenendo i controlli più vicini al contesto di lavoro.
- **SAL più leggera** — alleggeriti pannelli e passaggi del flusso SAL, con una tabella misure più ordinata e meno elementi ridondanti intorno al registro.
- **Materiali e anagrafiche più coerenti** — ritoccate liste, schede e dettagli per avvicinare materiali, appaltatori, team e contabilità allo stesso sistema visivo.

### Impostazioni e manutenzione

- **Impostazioni riallineate** — la schermata impostazioni torna nel formato operativo dell'app, con header e card coerenti con Team, Materiali e Dashboard.
- **Pulizia generale del codice UI** — rimossi elementi duplicati o poco utili, semplificate alcune strutture e resi più omogenei gli stati interattivi.

## 0.4.31 — 2026-05-25

### Vari Fix di ottimizzazione e bug - Fix di performance e bug 

- **Bug e Performance Fix** — Velocizzate, ottimizzate e sistemate varie problematiche nell'app.

### Limata Grafica SAL - sistemato il layout grafico

- **SAL Refactor** — Leggermente ridisegnata la schermata di creazione SAL inclusa la tabella di inserimento voci.

## 0.4.30 — 2026-05-22

### SAL — PDF più chiari, bozze più fedeli, maggiorazioni più veloci

- **Export PDF SAL** — i documenti PDF (report SAL, libretto misure e situazione contabile) possono ora essere esportati.
- **Bozze SAL più affidabili** — quando riprendi una bozza, le voci che avevi già caricato vengono conservate e quelle del progetto vengono recuperate automaticamente. Niente più cancellazioni involontarie mentre il sistema carica il catalogo completo.
- **Maggiorazioni MG a portata di mano** — nello step Misure, le maggiorazioni applicabili vengono proposte direttamente nella parte superiore della tabella, con comandi per applicarle, scegliere a quali voci destinarle, escluderle o rimuoverle.

### Dettaglio progetto — bozze con il nome giusto

- **Bozze con il titolo originale** — quando riprendi una bozza dal dettaglio progetto, il nome che avevi scelto (ad esempio "SAL 01") rimane quello, senza rinumerazioni automatiche.

### Prestazioni e velocità

- **Step Misure più scattante su SAL grandi** — il passaggio allo step Misure è più rapido perché le righe non vengono più espanse tutte all'ingresso.
- **Cambio fase istantaneo** — passare da uno step all'altro (Progetto, Misure, Verifica, Conferma) è immediato, senza più quei rallentamenti quando tornavi indietro sullo step Misure.
- **Ricerca voci sempre pronta** — la barra di ricerca delle voci tariffarie resta attiva in ogni fase, senza doversi ricaricare. Funziona rapidamente anche con oltre 23.000 voci.
- **Selezione tariffari più intelligente** — quando selezioni o deselezioni tariffari (anche con "Seleziona tutto / Deseleziona tutto"), vengono caricate o rimosse solo le voci dei tariffari cambiati, senza ricaricare l'intero catalogo.
- **Ricerca che non blocca** — la ricerca tra le voci tariffarie non rallenta più l'interfaccia mentre elabora i risultati.
- **Indicatore di caricamento** — durante il caricamento delle voci o la selezione massiva dei tariffari, un'animazione ti mostra che l'operazione è in corso.

## 0.4.22 — 2026-05-22

### Stability Fix

- **Fix di import tariffari** — Test fix con segnalazione dell'errore specifico in produzione.

## 0.4.21 — 2026-05-21

### Stability Fix

- **Fix di import tariffari** — l'app poteva restituire errori vari nell'importare i tariffari.

## 0.4.2 — 2026-05-21

### Tariffari — import, parser e preview

- **Parser RFI con dati più ricchi e lettura corretta** — l'import conserva maggiorazioni, regole applicative, avvertenze e report di validazione. Risolto l'alias `valore` → `valore_euro` che faceva scartare silenziosamente tutte le voci. Le avvertenze vengono risolte record per record con `scope`, `refCode` e flag `isMaggiorazione` esposto a livello Rust.
- **Import multipli più intelligenti** — reimportando lo stesso tariffario, Quantara aggiorna l'esistente invece di duplicarlo. Nei batch grandi l'ultima revisione prevale e le operazioni vengono accorpate per non bloccare la UI.
- **Preview import ridisegnata** — il ledger vive sullo sfondo senza card bianca, le maggiorazioni hanno un pannello collassabile sopra le voci a prezzo, l'inspector laterale ha un tab "Avvertenze" con dettaglio, e la metrica in alto separa voci prezzo da MG.

### SAL — MG gestibili manualmente e regole più pulite

- **Dati parser filtrati per la SAL** — nel flusso SAL non vengono portati audit, confidence, source debug o issue tecnici. Restano solo maggiorazioni collegate e regole applicative, conservate anche dopo il riavvio.
- **MG assegnabili manualmente alle voci destinatarie** — cliccando sul badge MG nel toolbar si apre un dialog con la lista delle voci eleggibili (filtrate per prefisso tariffario). Spuntando o deselezionando le voci si decide manualmente dove applicare la maggiorazione, invece della distribuzione automatica per prefisso.
- **Disabilitazione esplicita e stati chiari** — deselezionando tutte le voci la MG viene disabilitata (`[]`) invece di cadere in auto-distribuzione. I badge cambiano colore: accent per manuale, neutro per automatica, danger per disabilitata. Se una voce destinataria viene eliminata, l'allocazione resta valida scartando gli ID orfani.

### UI coerente — stessi filtri, stessa selezione multipla, stesse card

- **Selezione multipla centralizzata con conferma** — nuovo hook `useMultiSelectDelete` e componente `MultiSelectBulkDeleteBar` usati da Tariffe, Materiali, Contabilità e Dettaglio progetto. Il confirm dialog mostra l'elenco (max 5 + "…e altri N") prima di eliminare. Le schermate SAL mantengono l'undo toast dopo la conferma.
- **Filtri con lo stesso stile ovunque** — `FilterSelect`, `FilterSearch`, `FilterDateInput` e `ClearFiltersButton` allineati al TeamScreen: `h-10`, `rounded-14px`, `border`, `text-13px`, focus ring coerente. In Contabilità i filtri Appaltatore e Progetto ora lavorano in AND indipendentemente.
- **MaterialScreen allineata** — categoria passa da FilterChip pill a `FilterSelect`. Hero mostra metriche stock invece di sidebar categorie. Card materiale ridisegnata come le tariff card (icona Package con status dot, riga stock/soglia compatta, dropdown tre puntini). Rimossi tre punti di accesso duplicati alla creazione materiale.
- **`AddMaterialModal` ora usa il `Dialog` condiviso** — il backdrop blur copre tutta l'app via `createPortal` invece di fermarsi al contenitore scrollabile.
- **Tariffari associati nel dettaglio progetto** — lista limitata a 5 con "Mostra tutti". Modal con "Seleziona tutti / Deseleziona tutti".

### Preview import — MG separate e lista avvertenze

- **Voci prezzo separate dalle maggiorazioni** — `MaggiorazioniPanel` raggruppa le MG in una sezione collassabile sopra il ledger. La `MetricsBar` passa da 4 a 5 colonne separando voci prezzo da MG.
- **Lista avvertenze nell'inspector** — nuovo tab "Avvertenze" con tutte le voci in warning. Cliccando si apre `WarningDetailModal` con ID, scope, refCode, titolo e corpo.

### TypeScript — tipi più rigorosi

- **Tipi allineati a `exactOptionalPropertyTypes`** — `onShowWarningDetail` usa `Type | undefined` invece di `?`. Rimossi import e parametri inutilizzati.

## 0.4.1 — 2026-05-21

### Temi scuri finalmente corretti

- **I temi scuri Ambra, Foresta e Midnight ora funzionano davvero** — focus ring, accenti e colori chart ereditavano sempre il blu del tema base ignorando la palette scelta. Ora ogni tema scuro ha la sua palette completa e coerente.
- **Bottoni, ombre e date picker corretti in tutti i temi scuri** — prima usavano gradienti e ombre del tema chiaro.
- **Transizioni fluide in tutta l'app** — 67 hover e cambi stato usavano la curva lineare di default del browser. Ora seguono la fluidità prevista dal design.
- **Ombre che si adattano al tema** — niente più ombre fisse pensate per lo sfondo chiaro su fondo scuro.
- **Token duplicati eliminati** — rimosse 72 varianti inutili nei temi e costanti motion ridondanti tra CSS e JavaScript.

### Dettaglio progetto — forecast più affidabile

- **CPI e SPI ricalcolati con logica condivisa** — il dettaglio progetto e la Dashboard ora usano la stessa funzione di forecast, basata su SAL impegnate, importo tipico e ritmo storico.
- **CPI non resta più bloccato a 1** — una bozza pesante o SAL più leggere della baseline ora influenzano l'indice. Test dedicati coprono scenari neutro, critico e favorevole.
- **Indicatori CPI/SPI ridisegnati** — una barra bidirezionale centrata su 1,00: sinistra rossa per sotto-performance, destra verde per margine positivo, con valore numerico grande e stato sintetico.

### Gantt e timeline più corretti

- **Gantt allineato alla fine prevista** — le barre usano la stessa data stimata del dettaglio progetto, niente più differenze tra previsione testuale e durata visualizzata.
- **Date SAL con la data periodo, non di chiusura** — una SAL chiusa oggi ma riferita a marzo non accorcia più artificialmente la timeline.
- **Timeline Dashboard pronte subito** — le SAL si caricano all'avvio, senza dover aprire e salvare una bozza per far comparire il progetto.

### SAL — step misure più leggibile

- **Registro misure a larghezza piena** — la tabella occupa tutto lo spazio disponibile senza essere compressa dal cockpit laterale.
- **Righe più distinguibili e libretto più coerente** — separazione maggiore tra le voci, stato espanso più evidente, intestazioni più chiare, comandi copia/elimina più visibili.
- **Maggiorazioni MG più compatte** — non occupano più un grande pannello sopra il registro: sono segnalate nella testata con chip compatti, totale dedicato e collegamento alla voce applicata.
- **Cockpit SAL meno invasivo** — non si apre più come pannello pesante nello step Misure. Lo stato resta compatto accanto al totale, senza coprire ricerca voci e template.
- **Virtualizzazione del registro migliorata** — libretti lunghi scorrono più fluidi grazie a un render migliore delle righe espanse.
- **Contrasti e leggibilità migliorati** — testi secondari, bordi e stati soft sono più leggibili in tutti i temi, il calendario è più visibile nei temi chiari.

### Appaltatori — schede, albero e conteggi

- **Scheda appaltatore ridisegnata** — rimossi gradienti decorativi, avatar col caschetto e footer "Apri" ridondante. Mostra nome, progetti, budget e metriche con icone di contesto. Passandoci sopra la card si solleva con un'ombra più marcata.
- **Mini cronologia dell'ultimo SAL** — in fondo a ogni scheda compare l'ultimo documento registrato: titolo, stato (Approvato / Bozza / Revisione), nome del progetto a cui appartiene e data relativa ("Oggi", "Ieri", "3 giorni fa").
- **Vista albero riscritta** — linee di connessione tra i livelli (appaltatore → progetto → SAL), raggi diversi per ogni livello, e il pulsante espandi non apre più la pagina dell'appaltatore.
- **Conteggio SAL finalmente corretto** — le schede non mostrano più "0 SAL su 2 workflow" quando i progetti hanno SAL registrate. Il conteggio ora usa la stessa assegnazione appaltatore dei progetti.
- **Tre puntini che funzionano** — il menu a tre puntini sulle card progetto è posizionato indipendentemente. Cliccare "Elimina" o "Modifica" non apre più il progetto per sbaglio.

## 0.4.0 — 2026-05-20

### Export Excel — report più controllabili

- **Export progetti con scelta esplicita** — il comando Export non scarica più tutto automaticamente: apre una finestra dove puoi scegliere quali progetti includere nel file.
- **Report Excel progetti più leggibile** — il nuovo workbook contiene un foglio Indice e un foglio per ogni progetto selezionato, con budget, SAL, residui e dettaglio righe.
- **Export SAL in Excel** — nello step Conferma SAL è disponibile l'export Excel dettaglio, con riepilogo del documento e foglio Libretto per le righe misura.
- **Salvataggio dove vuoi tu** — in app desktop gli export Excel aprono il selettore percorso, così puoi decidere cartella e nome file prima di salvare.

### SAL — creazione più veloce e controllabile

- **Cockpit misure più operativo** — durante l'inserimento voci ora hai totale corrente, residuo budget, voci incomplete e controlli rapidi sempre visibili accanto al registro. Non devi più arrivare allo step di verifica per capire se qualcosa non torna.
- **Verifica visiva mentre lavori** — le righe incomplete vengono evidenziate direttamente nel registro misure, con stato chiaro e più leggibile. L'operatore vede subito quali voci richiedono ancora quantità o correzioni.
- **Passaggi più morbidi tra gli step** — il cambio tra Progetto, Misure, Verifica, Conferma e completamento ora usa una transizione fluida, evitando lo stacco secco tra una vista e l'altra.
- **Header SAL più compatto** — la barra superiore è stata ridisegnata come barra di lavoro: titolo, progetto, avanzamento, totale e azioni principali occupano meno spazio e restano più facili da leggere.

### SAL — ricevuta contabile più leggibile

- **Riepilogo SAL semplificato** — la ricevuta economica è stata ripensata con una struttura più pulita: metriche essenziali in alto, sezioni lineari per lavorazioni, maggiorazioni MG e sicurezza, e formula economica laterale.
- **Dettagli solo quando servono** — misure, maggiorazioni e note si aprono riga per riga. La vista principale resta più leggera, ma il dettaglio contabile è ancora disponibile per il controllo puntuale.
- **Contrasti e testi migliorati** — aumentata la dimensione dei testi piccoli nella ricevuta e ridotto l'uso di testo troppo tenue. I temi scuri hanno colori secondari più leggibili, soprattutto per etichette, importi e stati.
- **Maggiorazioni MG più facili da controllare** — la sezione MG mostra base, percentuale, voci applicate e totale in modo più diretto, senza mischiare troppe informazioni nella stessa riga.

### SAL — prestazioni e manutenzione

- **Calcolo MG più efficiente** — le maggiorazioni non riscorrono più tutte le righe a ogni passaggio. Quantara usa indici e gruppi per prefisso tariffario, rendendo il calcolo più leggero su SAL grandi.
- **Lookup materiali più rapidi** — durante salvataggio e conferma SAL i materiali vengono cercati tramite indice, non con ricerche ripetute nella lista.
- **Autosave più stabile** — il salvataggio automatico della bozza è stato isolato e non marca più la SAL come modificata a ogni render inutile.
- **Codice SAL più manutenibile** — la schermata di creazione è stata alleggerita spostando azioni sulle righe, dati derivati, autosave e helper misura in moduli dedicati.

### Più sicuro

- **Backup protetti da passphrase** — in Impostazioni puoi attivare una passphrase prima di creare un backup. I dati vengono cifrati con AES-256-GCM. Durante il ripristino, se il file è crittografato, Quantara ti chiede automaticamente la passphrase — con feedback se è sbagliata.
- **Bug e Stability Fix** — risolti bug e problemi di stabilità/prestazioni dell'app.

## 0.3.32 — 2026-05-18

### SAL — libretto misure più vicino al lavoro reale

- **Registro SAL più leggibile** — le voci ora sono organizzate come un vero libretto misure: la riga principale resta compatta, mentre indici, note e dettaglio della misura si aprono sotto la voce quando servono.
- **Maggiorazioni MG più chiare** — le voci MG non vengono più mischiate alle righe normali del registro. Ora hanno uno spazio dedicato, con percentuale, base di calcolo, importo e voci a cui si riferiscono.
- **Voci OS separate** — gli oneri sicurezza sono raccolti in una sezione distinta e indicati come non soggetti a ribasso, così il totale è più facile da controllare.
- **Sommano sempre visibile nel dettaglio** — aprendo una voce, il dettaglio mostra la misura corrente e la riga "sommano", in modo più simile al libretto Excel usato in contabilità.
- **Fattore 1 default a zero** — quando aggiungi una voce al registro misure, il primo fattore parte da 0 invece di 1. La quantità iniziale è zero finché non inserisci tu le misure reali.

### SAL — tariffari coerenti con il progetto

- **Solo i tariffari del progetto** — nella creazione SAL (nuova o ripresa da bozza) vengono mostrati esclusivamente i tariffari associati al progetto nel dettaglio. Se un tariffario viene rimosso dal progetto, le voci che lo usavano nella bozza vengono silenziosamente escluse.
- **Selezione tariffari più ordinata** — quando ci sono molti tariffari, il selettore nello step Impostazioni ha un campo di ricerca e un'area scrollabile con pulsante "Mostra tutti", evitando la lista infinita di pill.

### Dettaglio progetto — gestione tariffari migliorata

- **Modal tariffari più ampio** — la finestra per aggiungere o rimuovere tariffari è ora più larga e responsive (`max-w-lg` → `lg:max-w-2xl`), con più spazio per i nomi lunghi.
- **Sezione "Associati" e "Disponibili"** — i tariffari già collegati compaiono in alto con stile distinto, quelli non ancora associati sotto. In ricerca la lista torna piatta.

### SAL — ricerca voci più ordinata

- **Risultati ricerca che non si sovrappongono** — descrizioni e titoli lunghi non invadono più la voce successiva. Ogni risultato ha il suo spazio e resta leggibile anche con testi molto estesi.
- **Codice voce più stabile** — il codice a sinistra occupa tutta l'altezza della riga e resta separato dalla descrizione, così si distingue subito quale voce stai selezionando.

## 0.3.31 — 2026-05-18

### Tariffari — import e revisione

- **I tariffari appena importati si vedono subito** — dopo un import non serve più chiudere e riaprire Quantara: il catalogo si aggiorna immediatamente e i filtri non nascondono il nuovo tariffario appena salvato.
- **Reimport più intelligente** — se carichi di nuovo lo stesso tariffario, Quantara aggiorna quello già presente invece di creare una copia inutile.
- **Revisione import più chiara** — nella preview import i controlli laterali mostrano lo stato complessivo di tutti i file caricati, così capisci subito se l'intero import è pronto o se c'è ancora qualcosa da sistemare.
- **Scorciatoie da tastiera nella preview** — puoi passare tra i file, segnare una revisione, salvare in bozza, confermare o rimuovere un file usando i comandi rapidi mostrati nella legenda.

### Progetti — selezione tariffari

- **Filtro anno nei tariffari del progetto** — quando crei o modifichi un progetto puoi filtrare i tariffari per anno, anche selezionando più annualità insieme.

### SAL — ricerca, date e nomi

- **Ricerca voci SAL più precisa** — se cerchi una sigla che identifica un tariffario, Quantara mostra prima le voci di quel tariffario. Ad esempio, cercando "AS" non vengono più mischiate voci di tutti gli altri tariffari.
- **Nomi SAL progressivi** — le nuove SAL non partono più tutte con lo stesso nome. Quantara propone automaticamente "SAL 01", "SAL 02", "SAL 03" e così via.
- **Date coerenti nei grafici** — i grafici del dettaglio progetto ora usano la stessa data SAL mostrata nel registro, non la data tecnica di chiusura.

### Aggiornamenti — note versione

- **Note update più ordinate** — il popup degli aggiornamenti gestisce meglio le note di versione anche quando arrivano in un formato più semplice, evitando righe tutte in grassetto e non espandibili.

## 0.3.30 — 2026-05-17

### SAL ora nel database

- **Le SAL non si perdono più** — prima i documenti SAL venivano salvati solo nella memoria locale del browser. Se cambiavi sessione o ricaricavi l'app, potevano scomparire. Ora le SAL sono salvate nel database principale, insieme a progetti e contratti. Restano al sicuro e sono sempre disponibili.
- **Migrazione automatica dei dati esistenti** — se avevi già delle SAL salvate, Quantara le sposta automaticamente nel database al primo avvio. Non devi fare nulla.

### Creazione SAL più pulita

- **"Conferma SAL" sempre a portata di mano** — il pulsante per confermare la SAL ora vive nella barra in alto (step 4), accanto a "Salva bozza". Niente più bisogno di cercare il bottone giusto in fondo alla pagina.
- **Meno pulsanti, meno confusione** — rimossi i bottoni "Continua" e "Conferma" dal fondo degli step. La navigazione avviene solo dalla barra superiore, così sai sempre dove sei e cosa puoi fare.
- **"Chiudi" conferma davvero** — quando completavi una SAL e cliccavi "Chiudi", a volte il documento restava in bozza invece di essere confermato. Ora il comportamento è corretto: ciò che vedi è ciò che ottieni.

### Dettaglio progetto più accurato

- **Date SAL corrette** — la data mostrata sulle card SAL ora riflette quella reale del documento, non una data di fallback. Prima in alcuni casi vedevi la data di chiusura del progetto invece di quella della SAL.
- **Registro SAL più leggibile** — le card SAL mostrano subito nome, importo, data, stato, percentuale sul contratto e numero di voci. Il numero progressivo della SAL resta visibile, ma non ruba più spazio al nome scelto dall'utente.
- **Ordinamento SAL corretto** — cliccando su "SAL", l'elenco viene ordinato in base al numero progressivo reale, non al testo del titolo. Le righe si riposizionano con un'animazione fluida.
- **Selezione multipla più chiara** — la checkbox compare solo quando attivi la selezione multipla e lo spazio del testo si adatta senza salti visivi.
- **Grafico SAL ridisegnato** — lo storico SAL ora mostra barre chiare sulle date reali dei documenti, con mesi evidenziati e giorni leggibili. Il grafico usa meglio lo spazio disponibile e il tooltip resta vicino al cursore.
- **Grafico budget più leggibile nel tempo** — anche il grafico dell'andamento budget ora separa i mesi dai giorni: i mesi sono più evidenti, le date restano leggere. È più facile capire dove ci si trova nel calendario.

### Esperienza più fluida

- **Movimenti più morbidi in tutta l'app** — aperture, cambi pagina, menu, finestre e righe ora hanno una risposta più naturale. L'interfaccia sembra meno rigida e segue meglio il ritmo del lavoro.
- **Wizard progetto e SAL più chiari** — gli step sono cliccabili direttamente, portano davvero alla schermata giusta e mostrano meglio dove ti trovi. Il passaggio tra gli step è più fluido e meno scattoso.
- **Azioni SAL più ordinate** — nella lista del progetto, stato e comandi sono separati meglio: lo stato resta leggibile, mentre "Continua", "Approva" e il menu azioni stanno nella zona comandi.
- **Meno doppioni visivi** — rimosse informazioni ripetute come lo stato "Approvata" mostrato due volte sulla stessa riga SAL.
- **Dati importanti più visibili** — importi, voci e stato bozza nelle schermate SAL hanno più peso visivo, così si capisce prima cosa conta davvero.
- **Barra superiore più pulita** — tolti gli stepper duplicati dalla toolbar quando stai creando progetti o SAL. La navigazione principale resta nella pagina, vicino ai contenuti.

### Più affidabile

- **Memoria locale gestita meglio** — quando lo spazio di archiviazione del browser è quasi pieno, Quantara ora riesce a liberare correttamente spazio vecchio per salvare i nuovi dati. Prima poteva bloccarsi senza salvare nulla.

## 0.3.25 — 2026-05-16

### Correzioni

- **Avvio corretto dopo l'aggiornamento** — risolto un problema che poteva far aprire Quantara con una schermata bianca nella versione installata, anche se l'app funzionava correttamente in sviluppo.
- **Dashboard di nuovo visibile in produzione** — la build desktop ora carica correttamente i file interni dell'app e mostra subito l'interfaccia principale all'avvio.
- **Aggiornamenti e dati locali più affidabili** — migliorata la stabilità del caricamento iniziale, così Quantara recupera preferenze, dati locali e controlli update senza bloccare l'interfaccia.
- **Comunicazione interna dell'app più stabile** — corretta la configurazione desktop per evitare avvisi e fallback durante il dialogo tra interfaccia e motore locale.

## 0.3.24 — 2026-05-16

### Correzioni

- **Modalità sviluppo più stabile** — risolti problemi di schermate bianche e crash.

## 0.3.21 — 2026-05-16

### Stabilità e affidabilità

- **Niente più schermata bianca all'avvio** — in alcune installazioni, Quantara si apriva con una pagina vuota. Ora l'app carica correttamente font e temi ad ogni avvio.
- **Se qualcosa va storto, te lo dice** — quando un errore impedisce il caricamento di una schermata, ora vedi un messaggio chiaro con la possibilità di riprovare. Prima restava tutto bianco senza spiegazione.
- **I temi non si perdono più** — se un tema salvato non è più disponibile, Quantara torna automaticamente a quello predefinito invece di mostrarti una pagina senza colori.
- **Database? Se non si apre, lo sai** — se il database ha un problema all'avvio, ora compare una finestra che ti spiega cosa fare. Prima l'app si chiudeva senza dire nulla.
- **Dati al sicuro anche con spazio pieno** — quando la memoria locale del browser è satura, Quantara libera automaticamente spazio per salvare il tuo lavoro. Prima poteva bloccarsi.

### Correzioni

- **Modalità sviluppo più stabile** — risolto un problema che lasciava lo schermo nero durante lo sviluppo.

## 0.3.2 — 2026-05-15

### Più veloce e leggera

- **Import tariffari fino a 100 volte più veloce** — quando importi PDF con migliaia di voci, il controllo duplicati ora usa un indice invece di confrontare ogni voce con tutte le altre. Un file con 3000 voci che prima richiedeva secondi ora è quasi istantaneo.
- **Scroll fluido anche con migliaia di voci** — l'esploratore tariffari e il registro SAL ora renderizzano solo le righe visibili sullo schermo. Prima caricavano tutto in memoria: con 2000+ voci la pagina rallentava. Ora lo scorrimento resta fluido indipendentemente dalla dimensione.
- **Finestra di import più stabile** — i pannelli interni della preview import (metriche, voci, tab file, footer) non vengono più ricreati da zero a ogni modifica. Prima perdevano lo scroll e il focus, ora mantengono lo stato interno.
- **Scroll alla nuova voce funzionante** — quando aggiungi una voce personalizzata nell'import tariffario, la tabella ora scorre automaticamente alla nuova riga. Prima non succedeva nulla.
- **Niente processi fantasma** — chiudendo Quantara, il motore di parsing PDF viene terminato correttamente. Prima poteva restare attivo in background dopo la chiusura.
- **Materiali più sicuri in bulk** — quando confermi una SAL con molti materiali, non riscontri più errori "duplicato" causati da timestamp identici. Ogni transazione ha ora un identificativo univoco.
- **Aggiornamenti materiali atomici** — modificare un materiale ora avviene in una transazione database: se qualcosa va storto, i dati non restano a metà.

### Grafici nuovo — andamento economico visivo

- **Andamento portafoglio** — nuovo grafico a curve cumulative che mostra l'evoluzione della spesa di tutti i progetti insieme, progetto per progetto, con filtro temporale (3, 6, 12 mesi o tutto). La linea del budget totale aiuta a capire se si sta andando fuori controllo. Nella Dashboard.
- **Trend di spesa per progetto** — nuovo grafico nel Dettaglio progetto che confronta la spesa effettiva cumulata con la proiezione budget. Con pochi dati usa una linea retta (sempre sensata), con dati sufficienti usa la curva S logistica standard per costruzioni. Ogni modifica ai costi aggiorna immediatamente la proiezione.
- **Istogramma spesa mensile** — nuovo grafico a barre che mostra la spesa mese per mese dal primo SAL fino a oggi, con la media sui mesi con attività sovrapposta. Niente più mesi vuoti o medie calcolate su dati inesistenti.
- **Filtro temporale su ogni grafico** — tutti i grafici hanno un selettore a comparsa (3M, 6M, 1Y, Tutto).

### Scegli tu la data della SAL

- **Data personalizzabile in creazione SAL** — nello step Impostazioni, accanto al nome SAL, trovi un campo "Data SAL" con selettore di calendario. Default sulla data odierna, ma puoi cambiarla per registrare SAL passate o future. La data scelta viene usata in tutta la SAL.

### Quadro economico con dati veri

- **CPI reale** — l'indice nel Dettaglio progetto ora confronta il budget contrattuale con la spesa effettiva (`budget / speso`). Se > 1 sei sotto budget, se < 1 sei sopra. La nota cambia dinamicamente: "Sotto budget", "In linea" o "Sopra budget". Prima era un calcolo senza senso (`approvato / totale`) con nota fissa.
- **Fine prevista** — non più un numero mockato ma stimata dal progresso reale: `giorni_trascorsi / (speso / budget)`. Mostra "Tra ~X mesi", "In chiusura" o "In linea". Coerente con le barre della Gantt in Dashboard, che ora usano la stessa formula.
- **Forecast Impact** — ora calcola la differenza economica reale (`speso - budget`) e mostra "€X sopra budget" o "€X sotto budget" a seconda del segno. Prima era una stringa fissa dai dati mock.
- **Note dinamiche** — il colore e il testo delle voci cambiano in tempo reale in base ai dati.

### Più fluida e robusta

- **Dati che restano dopo refresh** — le voci tariffarie (`tariffVoices`) ora vengono salvate nel localStorage insieme a tutto il resto. Prima un aggiornamento pagina azzerava tutti i grafici e i totali perché le voci non venivano trovate.
- **Stati hover cantieri e timeline** — il click del mouse sulle righe della Gantt e della lista cantieri ora è più reattivo.

### Accessibilità migliorata

- **Dropdown si chiudono con Escape** — i menu a tendina rispondono al tasto Escape per chiudersi.
- **Elementi interattivi corretti** — overlay e pulsanti icona ora usano elementi HTML semantici (`<button>`), riconoscibili da screen reader e navigabili da tastiera.

### Correzioni

- **Warning lint risolti** — eliminati avvisi di stile: non-null assertion, chiavi array, import type.
- **Array gestiti in sicurezza** — accessi con controlli espliciti invece di assertion implicite.

## 0.3.1 — 2026-05-15

### Riepilogo costi più chiaro

- **Nuovo "scontrino" dei costi** — nello step 3 (Verifica) e 4 (Conferma) della creazione SAL trovi un riepilogo stile ricevuta fiscale: categorie, maggiorazioni, ribasso e budget contratto, tutto in un colpo d'occhio. Niente più numeri sparsi in giro.
- **Budget in tempo reale nello step 2** — mentre inserisci le voci, un contatore animato ti mostra budget contratto, già impegnato, quanto stai inserendo e il residuo che si aggiorna da solo.
- **Passaggio in più nel calcolo** — l'equazione ora mostra "Voci lordo → + maggiorazioni → = Totale con maggiorazioni → − ribasso → = Totale netto SAL", così si capisce cosa succede a ogni passaggio.
- **Anteprima documento più moderna** — la preview del libretto misure ora ha lo stesso stile "scontrino" del riepilogo costi, con righe compatte e totali subito leggibili.

### Materiali in cantiere più facili da usare

- **Pannello materiali sempre aperto** — non devi più cliccare "Registra materiali" per vederli. Appena arrivi allo step 3, i materiali sono già lì.
- **Cerca materiali** — c'è un campo di ricerca che filtra in tempo reale per codice, descrizione o categoria. Utile quando hai tanti materiali.
- **Input più pratico** — invece di scrivere a mano la quantità, ora hai i pulsanti `−` e `+` intorno al numero. Se usi più materiali di quanti ne hai disponibili, compare un avviso "Eccesso".
- **Barra sempre visibile** — ogni materiale mostra subito quanto ne resta dopo l'uso, con un colore che cambia: verde se sei sopra la soglia, giallo se ti stai avvicinando, rosso se sei sotto.
- **Dettaglio subito leggibile** — per ogni materiale vedi: barra con percentuale, categoria, disponibilità, soglia, quanti ne stai usando e quanti restano.
- **Sync automatico** — se modifichi un materiale da un'altra schermata (es. Materiali), il pannello in SAL si aggiorna da solo. Niente più dati vecchi.
- **Zona gialla più ampia** — la soglia di attenzione ora parte dal 50% sopra la soglia critica invece del 25%, così hai più tempo per accorgerti che stai finendo.

### MaterialScreen più coerente con la SAL

- **Barre aggiornate** — le card dei materiali e il pannello dettaglio ora usano la stessa logica della SAL: barra sempre visibile, colore a 3 zone (verde/giallo/rosso), e label "X% disponibile · -N in SAL" per capire subito l'impatto degli impegni.

### Correzioni

- **Conferma SAL non perde aggiornamenti** — quando confermavi una SAL, a volte i materiali non venivano scalati correttamente perché la scrittura nel database partiva in ritardo rispetto alla notifica alla sidebar. Ora la sidebar aspetta che il database abbia finito prima di ricaricare.
- **Modifica materiale in MaterialScreen** — dopo aver modificato un materiale (es. soglia critica), le card si aggiornavano solo dopo un refresh. Ora il cambiamento è immediato.
- **Caricamento infinito in step 3** — a volte il pannello materiali continuava a mostrare "Caricamento..." senza fermarsi. Risolto.

## 0.3.0 — 2026-05-14

### Materiali in magazzino

- **Nuovo cruscotto materiali** — ogni materiale mostra quanto ne hai in stock, quanto è impegnato in SAL (bozze e conferme) e, se scende sotto la soglia minima, la barra diventa rossa.
- **Si scalano dall'inventario** — quando confermi una SAL, i materiali che hai usato vengono scalati automaticamente. Se cancelli la SAL, tornano disponibili. Le bozze non scalano nulla per evitare errori.
- **Badge materiali nella sidebar** — il menu laterale ora mostra quanti materiali sono "critici" e "in esaurimento" in tempo reale.

### 8 temi, non solo chiaro/scuro

- **4 temi chiari** — Naturale, Caldo, Freddo, Soft.
- **4 temi scuri** — Notte, Ambra, Midnight, Foresta.
- **Scegli i tuoi due preferiti** — in Impostazioni scegli il tema chiaro e quello scuro che preferisci, poi alterni con un click dall'alto.
- **I temi non appesantiscono** — vengono caricati solo quando li selezioni.

### Transizioni e aspetto generale

- **Cambio pagina più fluido** — passando da una sezione all'altra la pagina sfuma dolcemente, niente più scatti.
- **Bottoni più ordinati** — stesso stile in tutta l'app, niente più differenze tra una schermata e l'altra.
- **Finestre e menu uniformi** — tutte le finestre (conferme, messaggi, aiuti) hanno lo stesso aspetto e si comportano allo stesso modo.
- **Cruscotto e pannelli coerenti** — dashboard, metriche e timeline hanno animazioni e spaziature allineate.
- **Selezioni e filtri uguali ovunque** — il click per selezionare, i filtri e la selezione multipla funzionano allo stesso modo in tutte le schermate.
- **Indicatori e card condivisi** — metriche, sezioni vuote, azioni rapide e scheletri di caricamento sono gli stessi in tutta l'app.

### Cosa abbiamo sistemato

- **Campi che non si lasciavano scrivere** — nelle finestre di creazione appaltatore e simili, cliccare sul campo non funzionava perché un pulsante invisibile copriva tutto. Ora si scrive subito.
- **Materiali fantasma nell'inventario** — la cancellazione multipla materiali (dal menu contestuale) faceva solo finta. Ora elimina davvero.
- **Stati SAL fermi** — cambiando lo stato di una SAL (es. da "bozza" a "approvata") le altre schermate non lo vedevano. Ora Dashboard e Contabilità si aggiornano subito.
- **Tariffari silenziosi** — se creavi, modificavi o cancellavi un tariffario, i progetti collegati non lo sapevano. Ora l'app tiene tutto allineato.
- **Riferimenti a tariffari cancellati** — cancellando un tariffario, i progetti restavano con un riferimento rotto. Ora vengono puliti automaticamente.
- **Sidebar non aggiornata** — i badge "Critici" e "In esaurimento" accanto a Materiali restavano sempre a zero anche se avevi materiali sotto soglia. Ora mostrano i numeri veri.
- **Eliminazione progetto dalla Dashboard** — se cancellavi un progetto dalla Dashboard, i dati collegati (SAL, appaltatori) restavano in giro.
- **Dati non allineati tra schermate** — modificando qualcosa in una pagina, le altre pagine mostravano ancora i vecchi dati finché non ricaricavi. Ora tutto si aggiorna da solo.
- **Bottoni della titlebar più curati** — hover con leggero sollevamento e bagliore, effetto pressione al click, pulsanti finestra con angoli arrotondati.

## 0.2.64 — 2026-05-14

### MG (Maggiorazioni) come percentuali tariff-specifiche

- **MG ora funzionano** — le voci MG importate dai tariffari non vengono più perse: aggiunto campo `maggiorazioni` alla struct Rust `ParserOutput` (era assente, Serde le scartava silenziosamente). I record MG vengono ora concatenati a quelli normali durante il parsing.
- **MG = percentuale, non prezzo** — il `unitPrice` di una voce MG (es. 30) viene interpretato come percentuale, non come importo euro. La maggiorazione viene distribuita su tutte le voci tariffarie che condividono lo stesso prefisso (es. MG su AC → si applica solo alle voci AC).
- **Calcolo sull'importo lordo, sconto dopo** — la percentuale MG viene applicata sul `grossAmount` (prezzo base prima di qualsiasi sconto). Il ribasso gara viene poi calcolato su `(grossAmount + surchargeLinked + MG share)`, non prima della maggiorazione.
- **Equazione economica a scontrino** — il componente `EconomicEquation` è stato ridisegnato in stile ricevuta: ogni riga mostra operazione (`−` sconto, `+` MG), label e importo, con finale accentato per il totale. Presente in tutti e 3 gli step (Voci, Revisione, Conferma).

### UI griglia SAL migliorata

- **Campo note sotto la riga** — la colonna "Note riga" è stata rimossa dalla griglia; la textarea note ora vive sotto ogni riga come estensione verticale, sempre visibile con auto-resize. Griglia passata da 15 a 14 colonne.
- **Colonne allineate al contenuto** — la prima colonna (N.) non è più centrata ma allineata a sinistra come l'intestazione, con `justify-center` rimosso. In modalità non virtualizzata, l'intestazione "N." riceve `pl-7` per compensare i 28px della maniglia di drag (`DragDropReorder`), allineando perfettamente header e righe.
- **Tabella contabile allineata** — griglia `AccountingRows` aumentata da 10 a 11 colonne (aggiunta colonna `36px` per l'icona azioni), eliminando l'overflow dell'undicesimo elemento che finiva in una riga implicita.
- **Warning tooltip via portal** — il popup delle avvertenze (icona Info) non viene più tagliato dallo scroll container: usa `createPortal` a `document.body` con posizionamento fixed e flip automatico sopra/sotto.

### Parser PDF — keep-alive (macOS più veloce)

- **Processo Python persistente** — il parser RFI ora supporta la modalità `--serve`: legge i path da stdin e scrive i risultati su stdout, mantenendo il processo vivo tra una richiesta e l'altra. Su macOS, dove l'avvio del binario PyInstaller subisce i controlli Gatekeeper (1-3s ciascuno), si paga il costo UNA VOLTA sola invece che per ogni file.
- **`RfiParserClient` in Rust** — nuova struct thread-safe che avvia il parser in modalità `--serve` al primo utilizzo, comunicando via pipe. Se il processo crasha, viene droppato e ricreato alla richiesta successiva. Fallback trasparente al vecchio approccio "un subprocesso per file".

### Correzioni varie

- **Fix infinite loop su delete file multiplo** — l'effetto `LOAD_DRAFT` aveva `[loadedDraft, metadatas]` come dipendenze: quando `removeActiveFile` chiamava `onMetadatasChange`, il genitore aggiornava le metadatas e l'effetto scattava dispatchando `LOAD_DRAFT`, che sovrascriveva lo stato del reducer creando un loop. Risolto proteggendo l'effetto con un flag `initialSyncRef` che lo fa eseguire una sola volta al mount; il dispatch `LOAD_DRAFT` era ridondante (l'initializer di `useReducer` già gestisce lo stato iniziale).
- **Aria-expanded rimosso da input** — `aria-expanded` non è supportato su `<input>` senza `role="combobox"`. Rimosso dall'`<AutocompleteInput>` per rispettare le specifiche ARIA.
- **NoAccumulatingSpread** — sostituito spread operator in `.reduce()` con `Object.assign` per evitare complessità O(n²) in `TariffImportPreviewModal`.
- **useExhaustiveDependencies** — aggiunte tutte le dipendenze mancanti nei `useCallback`/`useEffect` di `SalCreationScreen`, `TariffsScreen`, `TariffImportPreviewModal`, `EditableTariffVoicesGrid`, `App`.

## 0.2.63 - 2026-05-12

### Creazione e modifica progetto in schermata intera

- **Nuova route `/project-create`** — creare un progetto non apre piu un modale, ma una schermata dedicata con la stessa navigazione lineare della creazione SAL. Anche "Modifica progetto" (dai 3 puntini sulle card) ora usa la stessa schermata, portando i dati del progetto da modificare.
- **Step e azioni nella toolbar** — i controlli (step Dati/Economico, pulsante Crea/Salva) sono nella barra superiore, come gia avviene per SAL e import tariffari. La schermata e piu pulita: niente footer button ne stepper duplicato.
- **Setup economico potenziato** — aggiunto campo "OS Esclusi da ribassi" con validazione (deve essere inferiore al budget). Sia importo contrattuale che OS hanno un flag opzionale "+ IVA al X%" che mostra BASE + IVA = TOTALE in tempo reale. La preview laterale mostra la scomposizione IVA, e i check rapidi sono passati da 3 a 5 (inclusi OS < budget e almeno un tariffario).

### Tariffari sotto controllo

- **Ogni progetto ha i suoi tariffari** — la selezione dei tariffari non avviene piu in creazione SAL, ma nel dettaglio del progetto. Un pannello "Tariffari associati" nella sidebar mostra quelli collegati e permette di aggiungerne o rimuoverne con un modal di ricerca. Quando crei una SAL, i tariffari vengono presi automaticamente dal progetto (modificabili per la singola SAL con un selettore a chip).
- **Cerca tariffari** — aggiunto campo di ricerca testuale nella selezione tariffari (sia in creazione progetto che nel dettaglio progetto). Filtra per nome, ente o anno, fondamentale con decine di tariffari.
- **Voci personalizzate** — nella modifica voci di un tariffario, il pulsante "+ Nuova Voce" e sempre visibile nell'intestazione della griglia (colonna Azioni), non piu relegato in fondo. Inserisce una riga vuota editabile per codice, descrizione, unita, prezzo e manodopera.

### Toolbar ridisegnata per chiarezza

- **Gruppi visivi separati** — ogni toolbar (SAL, tariffari, creazione progetto) ora divide i comandi in contenitori pillolati con sfondo leggero: step nav, metriche, azioni secondarie, azione primaria. Niente piu pulsanti appiattiti in una riga senza gerarchia.
- **Bottoni piu grandi** — i passaggi e i pulsanti azione passano da 32-36px a 40px, con font 12-13px. Su schermi stretti i controlli vanno a capo su due righe invece di venire tagliati.
- **Colori distintivi** — "Revisiona" e' color verde/success, "Salva bozza" e' color ambra/warning, "Approva import" eì color accent primario. Il pulsante "Elimina" (cestino) e' raggruppato con la navigazione, separato dalle azioni positive.
- **Notifiche nascoste durante preview** — il campanello notifiche non viene mostrato durante l'import tariffari per non distrarre.

### Sidebar con contesto navigabile

- **Breadcrumb contestuale sotto Appaltatori** — quando sei in un progetto o in un appaltatore, la sidebar mostra il nome dell'appaltatore e, se applicabile, il nome del progetto su righe separate (verticali, non troncati). Cliccando sull'appaltatore si torna alla vista filtrata, cliccando sul progetto si va al dettaglio.
- **Sidebar piu larga** — da 184px a 220px per dare respiro a nomi progetto lunghi.

### Dettaglio progetto ridisegnato

- **Hero piu dashboard** — rimossi i pulsanti "Nuova SAL" e "Presidio economico" (erano duplicati rispetto al pannello Registro SAL). Sostituita l'immagine stock con una card "Avanzamento finanziario": barra di progresso animata, valori di Budget, Residuo, Approvato e In bozza con pallini colorati. Il Residuo diventa rosso se negativo.
- **KPI card con badge informativi** — le quattro card in alto mostrano ora badge contestuali (percentuale budget usato, numero SAL, stato). I valori sono leggibili subito: Budget, Residuo, Approvato (con conteggio SAL) e Ultima SAL (con importo e data reale).
- **Breakdown Approvato / In bozza** — la card finanziaria separa chiaramente "Approvato" (SAL chiuse) da "In bozza" (SAL in draft/revisione), con importi distinti.
- **Date SAL reali** — le SAL non usano piu la data fissa del progetto (`project.periodEnd`) ma la data effettiva di creazione (`new Date().toISOString()`). SAL 1 avra la data di maggio, SAL 2 di giugno, ecc. La timeline progetto riflette automaticamente le date corrette.

### Tema scuro meno aggressivo

- **Colori stati attenuati** — i colori success, warning, danger, info e accent erano troppo neon/fluorescenti su fondo scuro. Ora sono piu morbidi e riposano meglio alla vista, mantenendo la distinguibilità.

### Correzioni varie

- **OS check funzionante** — il check rapido "OS esclusi < budget" diventa rosso se l'importo OS e uguale o superiore al budget (prima era sempre verde pur bloccando il submit).
- **Rust backend** — aggiunta colonna `os_excluded_amount_cents` alla tabella `contracts` con migrazione automatica. I comandi `create_contract` e `update_contract` gestiscono `osExcludedAmount`.
- **Tipi condivisi aggiornati** — `DesktopContractRecord`, `CreateDesktopContractRecordRequest` e schema Zod includono `osExcludedAmount`.

### Coerenza dati locale/produzione

- **Appaltatori allineati tra dev e release** — la creazione progetto ora carica gli appaltatori sia dal registro appaltatori sia dalle assegnazioni dei contratti reali. La select non dipende piu solo dalla mappa progetto-appaltatore in `localStorage`, quindi il comportamento resta coerente tra browser locale e build Tauri.
- **Associazione appaltatore corretta in modifica** — salvando un progetto esistente, il collegamento appaltatore viene scritto sull'id effettivo del contratto aggiornato, non sull'id temporaneo generato dal form.
- **Eliminazione appaltatore unificata** — eliminare un appaltatore rimuove il nome dal registro e scollega i progetti, senza cancellare i contratti. La modale, il comportamento locale e quello in produzione ora dicono e fanno la stessa cosa.
- **Fallback contratti persistente** — fuori da Tauri, `list/create/update/delete` dei contratti usano uno store locale di anteprima. Questo evita differenze tra stato React temporaneo e successive riletture dei dati.
- **Backup aggiornato** — inclusa la chiave dei contratti di anteprima nei backup, cosi i dati usati in locale restano ripristinabili insieme al resto dello stato app.

## 0.2.62 - 2026-05-12

### Creazione e modifica progetto in schermata intera

- **Nuova route `/project-create`** — creare un progetto non apre piu un modale, ma una schermata dedicata con la stessa navigazione lineare della creazione SAL. Anche "Modifica progetto" (dai 3 puntini sulle card) ora usa la stessa schermata, portando i dati del progetto da modificare.
- **Step e azioni nella toolbar** — i controlli (step Dati/Economico, pulsante Crea/Salva) sono nella barra superiore, come gia avviene per SAL e import tariffari. La schermata e piu pulita: niente footer button ne stepper duplicato.
- **Setup economico potenziato** — aggiunto campo "OS Esclusi da ribassi" con validazione (deve essere inferiore al budget). Sia importo contrattuale che OS hanno un flag opzionale "+ IVA al X%" che mostra BASE + IVA = TOTALE in tempo reale. La preview laterale mostra la scomposizione IVA, e i check rapidi sono passati da 3 a 5 (inclusi OS < budget e almeno un tariffario).

### Tariffari sotto controllo

- **Ogni progetto ha i suoi tariffari** — la selezione dei tariffari non avviene piu in creazione SAL, ma nel dettaglio del progetto. Un pannello "Tariffari associati" nella sidebar mostra quelli collegati e permette di aggiungerne o rimuoverne con un modal di ricerca. Quando crei una SAL, i tariffari vengono presi automaticamente dal progetto (modificabili per la singola SAL con un selettore a chip).
- **Cerca tariffari** — aggiunto campo di ricerca testuale nella selezione tariffari (sia in creazione progetto che nel dettaglio progetto). Filtra per nome, ente o anno, fondamentale con decine di tariffari.
- **Voci personalizzate** — nella modifica voci di un tariffario, il pulsante "+ Nuova Voce" e sempre visibile nell'intestazione della griglia (colonna Azioni), non piu relegato in fondo. Inserisce una riga vuota editabile per codice, descrizione, unita, prezzo e manodopera.

### Toolbar ridisegnata per chiarezza

- **Gruppi visivi separati** — ogni toolbar (SAL, tariffari, creazione progetto) ora divide i comandi in contenitori pillolati con sfondo leggero: step nav, metriche, azioni secondarie, azione primaria. Niente piu pulsanti appiattiti in una riga senza gerarchia.
- **Bottoni piu grandi** — i passaggi e i pulsanti azione passano da 32-36px a 40px, con font 12-13px. Su schermi stretti i controlli vanno a capo su due righe invece di venire tagliati.
- **Colori distintivi** — "Revisiona" e' color verde/success, "Salva bozza" e' color ambra/warning, "Approva import" eì color accent primario. Il pulsante "Elimina" (cestino) e' raggruppato con la navigazione, separato dalle azioni positive.
- **Notifiche nascoste durante preview** — il campanello notifiche non viene mostrato durante l'import tariffari per non distrarre.

### Sidebar con contesto navigabile

- **Breadcrumb contestuale sotto Appaltatori** — quando sei in un progetto o in un appaltatore, la sidebar mostra il nome dell'appaltatore e, se applicabile, il nome del progetto su righe separate (verticali, non troncati). Cliccando sull'appaltatore si torna alla vista filtrata, cliccando sul progetto si va al dettaglio.
- **Sidebar piu larga** — da 184px a 220px per dare respiro a nomi progetto lunghi.

### Dettaglio progetto ridisegnato

- **Hero piu dashboard** — rimossi i pulsanti "Nuova SAL" e "Presidio economico" (erano duplicati rispetto al pannello Registro SAL). Sostituita l'immagine stock con una card "Avanzamento finanziario": barra di progresso animata, valori di Budget, Residuo, Approvato e In bozza con pallini colorati. Il Residuo diventa rosso se negativo.
- **KPI card con badge informativi** — le quattro card in alto mostrano ora badge contestuali (percentuale budget usato, numero SAL, stato). I valori sono leggibili subito: Budget, Residuo, Approvato (con conteggio SAL) e Ultima SAL (con importo e data reale).
- **Breakdown Approvato / In bozza** — la card finanziaria separa chiaramente "Approvato" (SAL chiuse) da "In bozza" (SAL in draft/revisione), con importi distinti.
- **Date SAL reali** — le SAL non usano piu la data fissa del progetto (`project.periodEnd`) ma la data effettiva di creazione (`new Date().toISOString()`). SAL 1 avra la data di maggio, SAL 2 di giugno, ecc. La timeline progetto riflette automaticamente le date corrette.

### Tema scuro meno aggressivo

- **Colori stati attenuati** — i colori success, warning, danger, info e accent erano troppo neon/fluorescenti su fondo scuro. Ora sono piu morbidi e riposano meglio alla vista, mantenendo la distinguibilità.

### Correzioni varie

- **OS check funzionante** — il check rapido "OS esclusi < budget" diventa rosso se l'importo OS e uguale o superiore al budget (prima era sempre verde pur bloccando il submit).
- **Rust backend** — aggiunta colonna `os_excluded_amount_cents` alla tabella `contracts` con migrazione automatica. I comandi `create_contract` e `update_contract` gestiscono `osExcludedAmount`.
- **Tipi condivisi aggiornati** — `DesktopContractRecord`, `CreateDesktopContractRecordRequest` e schema Zod includono `osExcludedAmount`.

## 0.2.61 - 2026-05-11

### Menu a tre puntini uguali ovunque

- I menu a tre puntini ora hanno lo stesso aspetto in tutta l'app: Tariffari, Progetti, Dettaglio SAL, Appaltatori. Stessa animazione, stessi bordi, stesse icone. Niente piu stili diversi tra una schermata e l'altra.
- Cliccare "Elimina progetto" dal menu non apriva il progetto invece di eliminarlo — risolto.
- Le azioni nei dropdown non attivano piu la card sottostante per errore.

### Navigazione piu comoda

- I pulsanti avanti e indietro sono sempre visibili nella barra in alto, non piu nascosti nel menu cronologia. Tieni premuto il tasto indietro (o avanti) per vedere la cronologia completa.
- Rimossa la vecchia briciola di pane (breadcrumb) per non duplicare la navigazione.
- Su Windows compaiono i pulsanti minimizza, massimizza e chiudi nell'angolo in alto a destra (mancavano completamente).
- La spaziatura a sinistra per i pulsanti finestra Mac ora e applicata solo su Mac, non spreca spazio su Windows.

### Backup ora funziona davvero

- Il backup dei dati SAL non funzionava: cercava una chiave sbagliata nel salvataggio locale, quindi progetti, documenti e stati di avanzamento non venivano mai inclusi nel file .qbk. Ora il backup contiene tutto correttamente.
- Aggiunte al backup anche le preferenze di favore, le bozze SAL e le bozze progetto.
- Rimossa una chiave fantasma che non conteneva mai dati.

### Eliminazione a cascata

- Quando elimini un appaltatore, tutti i suoi progetti e le relative SAL vengono eliminati automaticamente. Niente piu progetti orfani.
- Quando elimini un progetto, tutte le SAL collegate vengono eliminate insieme.

### Dashboard con dati veri

- La timeline Gantt mostra le date reali delle SAL (prima e ultima SAL registrata per ogni progetto). Barre colorate per stato, percentuale di progresso e tooltip con intervallo date (ANCORA IN TEST).
- Le card dei cantieri ora hanno lo stesso design della lista progetti dentro un appaltatore.
- La sezione "Attivita recenti" mostra le operazioni realmente registrate, non orari fissi di esempio.
- Il pulsante "Apri" sui cantieri funziona davvero e porta al dettaglio progetto.

### Pagina Impostazioni rinnovata

- Stesso design del resto dell'app: bordi squadrati, stessi componenti, niente piu stili diversi.
- Nuova sezione "Verifica database" che controlla se il database locale esiste, la sua dimensione e lo stato generale.
- Pulsanti backup con icone chiare (freccia che scarica / freccia che carica) e feedback visivo di completamento.

### Finestre di aggiornamento piu pulite

- Le finestre di "Aggiornamento disponibile" e "Note di rilascio" ora hanno lo stesso aspetto delle altre finestre dell'app.
- Il testo delle note release non mostra piu asterischi, hashtag e markdown: solo testo pulito e leggibile.
- Le note release ora sopravvivono al riavvio dell'app anche su Windows (prima si perdevano).
- Le finestre si adattano bene a qualsiasi schermo, dal portatile 13" al monitor 4K.

### Creazione SAL piu efficiente

- Gli step "Impostazioni" e "Voci" sono ora visibili contemporaneamente: a sinistra il progetto e i tariffari, a destra la tabella voci. Niente piu avanti e indietro tra le schermate.
- La pagina usa tutta l'altezza disponibile dello schermo invece di lasciare spazi vuoti.
- Il pannello tariffari resta visibile anche mentre inserisci le voci.

### Correzioni varie

- Fixato il backup che non includeva i dati SAL.
- Fixati i menu a tre puntini che attivavano la card sottostante.
- Fixata la navigazione dalla dashboard al dettaglio progetto.
- Fixata la persistenza delle note release su Windows.
- Aggiunta conferma prima di eliminare un progetto.
- Aggiunte icone animate sui pulsanti di verifica e backup.

## 0.2.60 - 2026-05-11

### Ricerca globale potenziata

- **Cerca ovunque** — la Command Palette (Ctrl+K) non cerca piu solo comandi. Ora cerca anche tra progetti, materiali e tariffari con risultati raggruppati per categoria. Basta iniziare a digitare per trovare tutto in un colpo solo.
- **Bottoni titlebar non si bloccano piu** — quando la Command Palette era aperta, cliccare sui bottoni della titlebar (sidebar, tema, aggiornamenti) richiedeva due click: uno per chiudere la palette e uno per l'azione. Ora funziona al primo colpo: la palette si chiude e l'azione parte insieme.
- **Menu sezione si chiude da solo** — quando apri la Command Palette, il menu "Cambia sezione" nella titlebar si chiude automaticamente.

### Cerca voci SAL — dropdown piu ricco

- **Niente piu limite di 12 risultati** — la ricerca voci nella creazione SAL mostra tutte le corrispondenze trovate, senza taglio. Il dropdown arriva fino a 500px di altezza con scorrimento.
- **Dropdown fuori dai contenitori** — il menu dei risultati non viene piu tagliato dal bordo della sezione. Ora usa un overlay fisso ben posizionato sotto il campo di ricerca, sempre completamente visibile.
- **Tooltip con dettagli completi nel menu cerca** — passando col mouse su una riga, un tooltip mostra codice, descrizione completa e metadati.
- **Badge laterale col codice** — ogni risultato ha un badge colorato con le prime lettere del codice voce, per riconoscere subito il tipo.

### Tabella voci SAL — righe piu leggibili

- **Manodopera in evidenza** — la percentuale di manodopera non e piu un numerino grigio perso tra i metadati. Ora e un badge colorato ben visibile nella riga, con pallino e colore accent.
- **Note che crescono** — il campo note non e piu una riga singola che scrolla in orizzontale. Ora e una textarea che parte da 4 righe, va a capo da sola e la card si espande automaticamente quando scrivi.
- **Ogni riga e indipendente** — se aggiungi la stessa voce due volte, cancellarne una non cancella piu tutte le copie. Modificare fattori, note o maggiorazioni di una riga non tocca le altre con la stessa voce.
- **Niente "(copia)" negli incolli** — quando copi e incolli una riga, il codice voce non viene piu modificato con "(copia)". Le note non vengono piu copiate.

### Marchio allineato

- **Logo aggiornato** — il logo Quantara e le icone dell'app sono passati dal vecchio arancione al blu brand `#3b7dd8`, lo stesso della palette ufficiale. Ora il colore del marchio è coerente in tutta l'app: sidebar, titlebar, icona applicazione e installer. Anche l'icona nel menu Start, nel Dock macOS e nella home del telefono (Android/iOS) ha il nuovo colore.

## 0.2.50 - 2026-05-08

### App piu scattante e codice piu pulito

- **Easing centralizzata** — la curva di animazione `cubic-bezier(0.22, 1, 0.36, 1)` era definita in 18 file diversi con 3 nomi diversi (BUTTER_EASE, SPRING_EASE, SOFT_EASE). Ora vive in un unico posto `components/shared/easings.ts` e tutti i file la importano da li. Coerente e facile da modificare.
- **Tipi SAL condivisi** — i tipi principali di SAL (SalDocument, SalLine, SalProject, SalTariffVoice, SalEconomicRules) sono stati spostati in `@quantara/shared-types/src/sal.ts`, la libreria centrale dei tipi. Le funzioni di dominio continuano a funzionare grazie a re-export automatici. Aggiunto sistema di migrazione automatica per i dati salvati localmente (versione 1), pronto per evoluzioni future.
- **Store SAL piu snello** — ridotto il numero di azioni dello store da 17 a 10. Unificate le funzioni di creazione progetto (con/senza ID), creazione SAL (vuota/con linee/con bozza) e aggiornamento linea (quantita/maggiorazione in un unica funzione).
- **Validazione dati** — aggiunto un sistema di validazione con Zod prima delle chiamate al backend: i contratti vengono controllati prima di essere inviati al database. Se i dati non sono validi, l'errore compare subito senza arrivare al backend.
- **Schermate protette** — ogni scherma dell'app e ora avvolta in un "cuscinetto" (ErrorBoundary): se qualcosa va storto in una pagina, le altre continuano a funzionare. Appare un messaggio chiaro con pulsante per riprovare.

- **Meno animazioni pesanti** — tutte le micro-animazioni al passaggio del mouse (effetto "sollevamento" di card, pulsanti e chip) sono state sostituite da CSS leggero invece di JavaScript. L'app ora consuma meno CPU, reagisce subito, ma a video non si nota differenza. Le animazioni di ingresso delle pagine sono rimaste invariate.
- **Rimosso codice inutile** — eliminate parti del programma che non servivano piu: moduli Rust vuoti (application/, domain/), una libreria JavaScript mai usata (`@tanstack/react-table`, risparmio ~40KB), un comando backend mai chiamato dall'interfaccia (`preview_sal_total`).
- **Unificate funzioni duplicate** — funzioni identiche che facevano la stessa cosa in file diversi sono state centralizzate: controllo se siamo in ambiente desktop o browser, formattazione errori, arrotondamento degli importi in euro e alcune logiche di servizio nei comandi Rust. Meno codice = meno bug.
- **Transizioni CSS unificate** — aggiunta una classe `.micro-interact` che gestisce in un solo posto tutte le micro-interazioni (hover sollevato, tap schiacciato). Applicata a oltre 50 pulsanti in tutte le schermate.

### Performance

- **Cache dati intelligente** — contratti, tariffari e materiali ora vengono tenuti in cache per 5 secondi. Se cambi pagina e torni indietro, i dati sono gia pronti senza ricaricarli. Quando fai una modifica, la cache si svuota automaticamente.
- **Tabella voci SAL virtualizzata** — quando hai piu di 20 voci in SAL, vengono renderizzate solo quelle visibili sullo schermo invece di tutte. Scorrendo, le righe si caricano al volo. Per liste piccole (<20 voci) rimane il drag & drop.
- **Calcoli SAL separati** — i controlli contabili (verifica budget, sforamento, ecc.) non vengono piu ricalcolati a ogni singola modifica di una voce, ma solo quando necessario. La tabella voci e il riepilogo economico sono separati: modifichi un valore e solo quello che serve si aggiorna.
- **Animazioni rispettose** — se il sistema operativo ha le animazioni ridotte (accessibilita), l'app disattiva tutte le micro-interazioni e le transizioni. Niente movimento forzato.

### Confini tra moduli

- **Spostati componenti condivisi** — `BezelSurface`, `ProjectControlButton`, `MetricCard` e altri componenti che erano nella cartella Progetti ma usati da tutte le schermate sono stati spostati in `components/shared/ui-primitives.tsx`. Ogni scherma li importa dalla posizione condivisa, non piu dalla cartella di un'altra feature.
- **Utility condivise** — `normalizeContractorName`, `readStringRecord`, `createDesktopVoiceKey` e `writeJson` spostate in `lib/shared-utils.ts` per essere usate da qualsiasi modulo senza violare i confini.
- **Controllo automatico** — aggiunto script `scripts/check-feature-boundaries.mjs` che verifica che una feature non importi codice da un'altra feature. Le uniche eccezioni consentite sono librerie condivise (`@/components/`, `@/lib/`, `@/store/`, `@/hooks/`, `@/generated/`, `@quantara/`).

### Test e qualita

- **Più test automatici** — aggiunti test di confronto SAL (differenze tra versioni, rilevamento modifiche/aggiunte/rimozioni). Ora 39 test totali, tutti verdi.
- **Knip integrato** — trovata e rimossa una libreria inutilizzata (`date-fns`), identificati 11 file potenzialmente candidati alla pulizia futura.
- **Decisioni architetturali documentate** — creati 4 ADR (Architecture Decision Records) in `docs/adr/` per tracciare le scelte fatte: easing centralizzata, tipi SAL in shared-types, cache TTL vs React Query, confini moduli.
- **Errori backend in italiano** — i messaggi di errore di validazione dei contratti ora parlano italiano invece di inglese, per chiarezza nell'interfaccia.

### Performance griglia tariffari

- **Contenimento CSS per import voci** — aggiunto `content-visibility: auto` e `contain-intrinsic-size` alle righe della griglia tariffari nella preview di import. Le righe fuori schermo non vengono renderizzate, con miglioramento significativo per file con centinaia di voci.

### Test e pipeline CI

- **58 test automatici** (+19 nuovi): aggiunti test per confronto SAL, rilevamento voci OS, cache TTL, shared-utils, edge case sui calcoli. Copertura su sal-calculations, sal-comparison, sal-safety, money, shared-utils, fetch-cache.
- **Pipeline unificata** — `pnpm format:check` ora esegue: format + typecheck + lint + test + boundary check in un unico comando. Un fallimento in uno qualsiasi blocca il comando.

### Layer servizi

- **Service hooks** — creato il layer `services/` con `useContractsService`, `useMaterialsService`, `useSalWorkflowService`. Le schermate ora possono interfacciarsi con hook dedicati invece di chiamare direttamente lo store o il backend. `SalCreationScreen` e il primo caso migrato.
- **Feature index.ts** — aggiunto `index.ts` in tutte le 9 feature (accounting, dashboard, materials, project-detail, projects, sal, settings, tariffs, team). Ogni feature esporta solo il componente Screen pubblico.

### Accessibilita

- **Aria-label aggiunti** — bottoni icona senza testo (elimina materiale, cancella ricerca, elimina cantiere) ora hanno `aria-label` descrittivi per screen reader e navigazione da tastiera.
- **Colori hardcoded rimossi** — sostituito `#fff` con `var(--text-inverse)` in TopToolbar. I colori hardcoded rimasti sono solo nella preview documento (simulazione carta stampata, voluta).
- **Contrasto WCAG AA verificato** — i token colore (text-primary #0e131d su surface-base #f7f8fa, accent-primary #ef3f22, dark mode #ececf0 su #121214) hanno tutti rapporto di contrasto superiore a 5:1, ampiamente sopra la soglia AA.

## 0.2.41 - 2026-05-08

- **Tariffari modificati** — Si possono ora salvare in bozza, eliminare e revisionare dall'import, una volta importati possono anche essere modificati dalla schermata generale (icona a 3 puntini) dei tariffari.
- **Fix Parser** — Fix di logica su come importava alcune voci il parser.

## 0.2.40 - 2026-05-08

- **Cambio Motore Parser** — Aggiornato il motore da pdfplumber a pypdfium2, velocizzando di molto il parsing dei file (Pdf con 300 pagine passato da 39s a 0.76s).
- **Fix Vari** — Vari fix apportati nella schermata tariffari per allineare la grafica, Risolti nella pagina di import e revisione alcuni bug relativi a importi negativi e caricamento voci (ora si caricano tutte subito).

## 0.2.35 - 2026-05-07

- **Bug Fixes** — Bug fix generali e correzione parser.

## 0.2.34 - 2026-05-07

- **Modale aggiornamento responsive** — la finestra che segnala un update disponibile ora resta dentro lo schermo anche su laptop e viewport piccoli: header e azioni rimangono accessibili, mentre le note scorrono internamente.
- **Release notes post-riavvio fixate** — la modale mostrata all'apertura dopo un aggiornamento non sborda piu con changelog lunghi: contenuto scrollabile, testi a capo correttamente e pulsante Continua sempre raggiungibile.
- **Niente scroll orizzontale nelle note** — descrizioni molto lunghe, nomi estesi e righe duplicate vengono gestiti con wrapping controllato senza rompere il layout.
- **Fix titlebar MacOS/Linux** — fix layout della titlebar per sistemi operativi basati su linux.

## 0.2.33 - 2026-05-07

- **Titlebar desktop ridisegnata** — la finestra ora usa una barra superiore personalizzata con navigazione sezione, comandi rapidi, cambio tema, controllo aggiornamenti e pulsante per espandere o compattare la sidebar.
- **Controlli finestra ripristinati** — minimizza, massimizza e chiudi funzionano correttamente anche con la titlebar custom, grazie ai permessi Tauri dedicati e a una gestione separata dell'area trascinabile.
- **Sidebar piu integrata** — rimossa la sensazione di pannello incapsulato: la sidebar ora vive direttamente sul background dell'app, dando piu profondita alla vista principale e riducendo i bordi doppi.
- **Toolbar superiore piu pulita** — rimossi doppioni come ricerca globale, cambio tema e aggiornamenti dalla toolbar principale, ora concentrati nella titlebar. La toolbar resta dedicata alle azioni della pagina corrente.
- **Cronologia di navigazione a tendina** — sostituito il vecchio breadcrumb ingombrante con un menu cronologico compatto, piu leggibile e meno invasivo nella barra superiore.
- **Breadcrumb semplificato** — il percorso pagina e stato ridotto a un chip piu compatto, evitando testo lungo e caos visivo nella testata.

## 0.2.32 - 2026-05-07

- **Import Tariffari** — fixati bug di duplicati presi dalle descrizioni, possibilità di resettare un singolo campo o eliminare direttamente la riga, ora il pannello di check rimane sempre visibile.

## 0.2.31 - 2026-05-05

- **Campo note nelle voci SAL** — aggiunto un campo note opzionale per ogni voce nella tabella SAL, utile per annotazioni tecniche o interne direttamente sulla riga.
- **Copia e incolla sempre disponibile** — la funzionalità copia e incolla (cliccare su icona apposita nella voce e poi incollare con Ctrl+V, dopo il primo incolla bisogna ri-copiare) ora funziona su tutte le voci SAL in qualsiasi stato, non solo in bozza.
- **Bug fix import tariffario da revisionare** — risolti problemi minori nella schermata di revisione import, con feedback piu coerente durante la navigazione tra le voci.
- **Scorri rapido "Carica altre voci"** — nella schermata di revisione import, il pulsante per caricare altre voci ora Scrolla automaticamente la pagina per mostrare le nuove righe aggiunte.
- **Ottimizzazioni varie** — performance e stabilità migliorate in diverse aree dell'applicazione.

## 0.2.3 - 2026-05-04

### Ribasso d'asta sul progetto

- **% ribasso gara spostata sul contratto** — la percentuale di sconto si imposta una sola volta in creazione progetto (e nella modifica progetto), non piu nella SAL. Inseriscila nello step economico insieme all'importo contrattuale.
- **Ribasso automatico in SAL** — quando crei una nuova SAL, il ribasso viene letto dal progetto e non e piu modificabile. Niente piu dimenticanze o discrepanze tra progetto e SAL.
- **Rimossi definitivamente gli oneri sicurezza dal contratto** — il vecchio campo "Oneri sicurezza non soggetti a ribasso" e stato eliminato dal database, dal form di creazione progetto e da tutti i tipi condivisi. Le voci OS vengono riconosciute automaticamente dalla categoria della voce (campo `isSafetyCost`) e continuano a essere escluse dal ribasso.
- **Template non sovrascrivono il ribasso** — quando applichi un template SAL, il ribasso del progetto rimane invariato. I template salvano solo voci, fattori e maggiorazioni.
- **Migrazione automatica del database** — all'avvio, il database esistente viene aggiornato: la colonna `safety_costs_not_subject_to_discount_cents` viene eliminata e viene aggiunta `tender_discount_percent` con valore predefinito 0.

### Budget residuo e metriche piu leggibili

- **Budget residuo nella conferma finale** — ora trovi il budget residuo (in verde o rosso) nell'ultima pagina del wizard, sia in fase Conferma che nella schermata Completata. Prima era visibile solo durante l'inserimento voci.
- **Metriche piu grandi e chiare** — nella fase Conferma, i tre indicatori (Totale SAL, Budget residuo, Voci/importo lordo) sono aumentati a 26px e incorniciati in card dedicate. Anche il riepilogo economico sottostante ha testi piu grandi.
- **Rimosso il budget residuo dalla fase Voci** — durante l'inserimento, lo spazio e dedicato alla tabella voci. Il budget si controlla in fase di verifica finale.

### Ricerca voci migliorata

- **Gerarchia invertita nell'autocomplete** — il codice voce appare ora in grassetto colorato come elemento principale, seguito dalla descrizione. Categoria, unita di misura e prezzo sono secondari. Prima era il contrario e il codice era meno visibile.

### Audio toast affidabile

- **Audio suono notifiche risolto per macOS e WebView** — il contesto audio viene sbloccato al primo clic o tocco dell'utente (requisito dei browser moderni). Se WebAudio rimane sospeso, viene usato un fallback silenzioso senza bloccare l'interfaccia.

### Layout piu adattivo

- **Griglie elastiche** — le card delle metriche, i riquadri dei tariffari e le righe di output ora usano `grid-template-columns: repeat(auto-fit, minmax(...))` invece di colonne fisse. I layout si adattano meglio a schermi da 1280px, 1512px e 1728px.
- **Overflow delle tabelle SAL gestito** — la tabella delle voci nella fase Voci ora scorre orizzontalmente invece di tagliare il contenuto su schermi stretti.
- **Utility CSS** — aggiunte classi `responsive-grid-elastic`, `responsive-table-wrap`, `min-w-0` e `break-words` per layout controllati senza hardcode.

### Performance

- **Lookup voci ottimizzato** — le ricerche di voci nei flussi template e cronologia SAL ora usano una `Map` invece di `.find()` in loop, riducendo la complessita da O(n*m) a O(n+m).
- **Opzioni autocomplete memoizzate** — l'array di opzioni per la ricerca voci non viene piu ricreato a ogni render, ma solo quando cambia l'elenco delle voci.
- **Riduzione render** — rimossi state derivati e funzioni che causavano re-render non necessari nella creazione SAL.

### Dashboard rinnovata

- **Nuova hero con budget totale** — la dashboard apre con un'intestazione chiara (saluto in tempo reale), il budget totale del portafoglio e il conteggio dei cantieri. Via l'indice operativo astratto.
- **Azioni prioritarie compatte** — le azioni urgenti sono in una card singola invece di due pannelli separati, con messaggio chiaro.
- **Pannello laterale riscritto** — distribuzione stato con grafico donut, attivita recenti dai dati reali e azioni rapide (Nuova SAL, Importa tariffario, Crea progetto).
- **Stato vuoto** — se non ci sono progetti, la dashboard mostra messaggi espliciti invece di dati di esempio.

### Team dinamico

- **Membri e ruoli letti dai dati reali** — conteggi aggiornati automaticamente, non piu valori fissi.
- **Ricerca e filtro per ruolo** — cerca membri per nome/email e filtra per ruolo con menu a tendina.
- **Paginazione reale** — navigazione tra pagine (10 per pagina).
- **Avatar con iniziali** — niente piu immagini esterne Unsplash.

### Import tariffari nella toolbar

- **Toolbar dedicata per anteprima import** — quando importi un PDF, la toolbar superiore mostra i controlli di navigazione tra file, conteggio voci, stato revisione e pulsante "Approva import". Niente piu modale separata.
- **Navigazione multi-file** — passa da un file all'altro dalla toolbar, con menu a comparsa e indicatori di avanzamento.
- **Import parallelo** — i PDF vengono elaborati in parallelo sfruttando tutti i core disponibili. Fino a 5 file elaborati contemporaneamente invece che uno dopo l'altro.

### Stati SAL estesi

- **Nuovi stati: In revisione e Approvata** — le SAL ora possono essere "Bozza", "In revisione", "Approvata" o "Chiusa". Il cambio stato si fa dal menu a tre puntini nel dettaglio progetto.
- **Filtro per stato** — in Contabilita e Dettaglio progetto puoi filtrare le SAL per stato specifico.
- **Salvataggio bozze SAL** — puoi salvare una bozza della creazione SAL e ritrovarla nel registro progetti. Le bozze vengono anche salvate automaticamente nel localStorage locale.

### Card appaltatori ridisegnate

- **Effetto cartella con indicatore di stato** — le card mostrano "Stabile" o "Presidio" in base alle criticità, con menu azioni che appare solo all'hover.
- **Intera card cliccabile** — clicca in qualsiasi punto per aprire il workspace.

### Parser RFI migliorato

- **Pattern code automatico** — il parser riconosce automaticamente il formato del codice voce tra 4 varianti, senza hardcode.
- **Unione codici su piu righe** — i codici spezzati su piu righe nel PDF vengono ricostruiti correttamente.
- **Estrazione avvertenze** — le note e avvertenze presenti nel tariffario vengono estratte come dati strutturati.
- **Deduplicazione voci** — le voci duplicate vengono filtrate automaticamente.
- **Campione per pattern matching** — la selezione del pattern di parsing analizza solo 200 righe campione invece di tutto il PDF, riducendo i tempi di avvio parsing.
- **Dettaglio pagine** — il parser restituisce pagine totali e pagine elaborate del PDF.

### Performance backend

- **Connessioni database centralizzate** — tutte le connessioni al database sono gestite con stato Tauri (`DbConnection` managed), riducendo aperture/chiusure multiple.
- **Import PDF asincrono** — il parsing dei PDF non blocca piu l'interfaccia.
- **Parsing multi-file parallelo** — quando importi piu tariffari, ogni file viene processato su un thread separato usando tutti i core CPU disponibili.

## 0.2.2 - 2026-05-02

### Navigazione e interfaccia generale

- **Breadcrumb di navigazione** — sotto le frecce avanti/indietro compare il percorso delle pagine visitate (es. "Progetti > Edificio Scala A > SAL 03"). Clicca su un passaggio intermedio per tornare direttamente a quella pagina. Se il percorso è lungo, viene mostrato compatto.
- **Escape universale** — il tasto ESC chiude qualsiasi finestra, menu o pannello aperto.
- **Selezione multipla e azioni bulk** — in Contabilità e Dettaglio progetto puoi selezionare più elementi con le caselle di spunta e fare azioni in blocco (eliminare, esportare). La barra azioni mostra il conteggio e scompare quando deselezioni tutto.
- **Indicatore di salvataggio** — nella barra in alto appare un indicatore dello stato di salvataggio (salvato, in salvataggio, modifiche da salvare).
- **Componenti filtro condivisi** — creati FilterSelect, FilterSearch, FilterDateInput e ClearFiltersButton con stile pill uniforme (rounded-full, bg-muted, ring-1). Utilizzati in Contabilità, Tariffari, Materiali, modale SAL e Dettaglio appaltatore: ricerca, dropdown e date picker hanno lo stesso aspetto su tutte le schermate. I filtri in Tariffari ora mostrano solo opzioni realmente presenti nei dati (es. stato "Attivo" / "Bozza" / "Validato" in italiano, derivati dal database).
- **Tema chiaro rivisto** — palette neutra riprogettata: sfondo e pannelli non sono più bianco puro (#ffffff) ma hanno tonalità calde e profonde (#f7f8fa, #ebedf0). Superfici e bordi hanno contrasti più morbidi, texture più ricca e meno affaticamento visivo.
- **Tema scuro rivisto** — sfondo carbon black caldo (#121214) al posto del blu notte, tonalità pastello calde per pannelli e superfici. Testi più morbidi (bianco caldo #e8e8ed, grigio #94949e), bordi meno aggressivi. I colori di stato sono più saturi e "neon" per maggiore contrasto su fondo scuro (verde #22d06a, ambra #f0a030, rosso #f05048, azzurro #4090f0).

### Creazione SAL — completamente rinnovata

- **Navigazione a step nella barra superiore** — i passaggi (Impostazioni, Voci, Verifica, Conferma) sono integrati nella barra in alto al posto del pulsante "+ Nuovo". Ogni step è cliccabile per navigare avanti e indietro.
- **Layout più snello e compatto** — ogni fase mostra solo le informazioni essenziali. Titoli più piccoli, pannelli più stretti, niente doppie barre o spazi sprecati. Le azioni principali (Continua, Conferma) sono sempre visibili in fondo.
- **Ricerca voci con autocomplete** — basta iniziare a digitare un codice o descrizione per trovare e aggiungere voci al volo, senza più il vecchio pannello catalogo. Supporta anche Enter rapido: scrivi il codice e premi Invio per aggiungere direttamente.
- **Modifica diretta dei fattori** — click sul valore nella tabella → modifica → Invio conferma / Escape annulla. Nessun modale.
- **Riordino voci con drag & drop** — trascina le voci per riordinarle. Utile per raggruppare voci simili prima della stampa. Durante il trascinamento la riga si solleva con un'ombra per feedback visivo.
- **Copia e incolla voci tra SAL** — Ctrl+C copia le voci selezionate, Ctrl+V le incolla in un'altra bozza. Funziona anche tra sessioni diverse (passa dagli appunti di sistema).
- **Tabella voci ridisegnata** — righe alternate, campi editabili visivamente distinti da quelli di sola lettura, pulsante "Dettaglio" per espandere misure e maggiorazioni.
- **Template SAL** — in fase Voci, dopo aver inserito voci e ribasso, clicca "Salva come template". La prossima volta che crei una SAL con lo stesso tariffario, clicca "Template (1)" e scegli il template: voci e regole vengono applicati automaticamente.
- **Confronto SAL** — in fase Verifica, se esiste una SAL precedente, puoi confrontarle riga per riga: voci aggiunte in verde, rimosse in rosso, modificate in giallo, con differenze di quantità e importo.
- **Ribasso gara modificabile ovunque** — la percentuale di sconto si può cambiare sia in fase Impostazioni che in fase Voci. Lo sconto applicato è sempre visibile.
- **Budget, residuo e SAL corrente sempre sotto controllo** — in fase Voci compaiono tre card: l'importo della SAL, il budget residuo (verde/rosso) e il controllo del ribasso con calcolo dello sconto in tempo reale.
- **Fase Verifica** — controlli contabili come pillole colorate, riepilogo economico e anteprima documento affiancati, dettaglio voci collassabile.
- **Fase Conferma** — totale SAL, riepilogo sintetico, pulsanti di output e conferma finale.
- **Fase Completata** — metriche finali, pulsanti "Chiudi" e "Nuova revisione".
- **Messaggi di errore chiari** — se manca un contratto o un tariffario, il messaggio spiega esattamente cosa fare per proseguire.

### Dettaglio progetto

- **Timeline progetto** — nella sidebar compare una timeline visiva con l'elenco cronologico delle SAL, milestone di avvio/chiusura, stato (completata, in corso, in ritardo) e importi.
- **Selezione multipla SAL** — ogni card SAL ha una casella di spunta, puoi selezionarne più di una e cancellarle tutte insieme.

### Contabilità

- **Selezione multipla e azioni bulk** — seleziona più SAL, eliminale o esportale in blocco.
- **Viste filtro salvate** — in Contabilità, imposta i filtri che vuoi (appaltatore, progetto, stato, date), clicca "Viste" → "Salva vista corrente" e dagli un nome. Per riapplicarli, clicca "Viste" → clicca sulla vista salvata.
- **Filtro appaltatore** — ora mostra i nomi reali degli appaltatori invece di "Senza appaltatore". I dati vengono letti dal registro progetti dello store SAL (campo client), unificati con i contratti caricati da filesystem. Risolto il bug di inizializzazione che lasciava il filtro su un valore "all" non presente tra le opzioni.
- **Pulsante Viste salvate più visibile** — separato dai filtri con un divisore verticale, evidenziato con colore info-soft e ring accentato.

### Impostazioni

- **Backup e ripristino database** — crea un backup completo del database in formato `.qbk` con un click. Ripristina caricando un file precedentemente salvato. Il backup include SAL, appaltatori, progetti, materiali e preferenze.
- **Registro attività** — sezione che mostra le ultime operazioni eseguite con data e ora.

### Varie

- **Indicatore di salvataggio globale** — nella barra in alto.
- **Performance backend** — migrazioni database eseguite una volta sola all'avvio, non più a ogni comando.
- **Affidabilità** — gestione errori più robusta nel backend Rust.

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
