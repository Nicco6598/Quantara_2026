# Changelog

All notable changes to Quantara follow SemVer.

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
