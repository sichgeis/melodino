# Mitsingen mit Text: experimenteller Vergleich

Auftrag: Am Telefon gemeinsam singen können, ohne den Text zu kennen. Drei
Textansichten am Beispiel Schlaf, Kindlein, schlaf im experimentellen Bereich.
Die Hauptseite und ihre bisherigen Stropheneinstellungen bleiben zunächst unverändert.

## Prototyp und Bedienung

Eigene Seite singalong.html, prominent aus experiments.html verlinkt. Ein gemeinsamer
Player mit drei ohne Musikunterbrechung wechselbaren Ansichten:
A Strophenblatt (ganze aktuelle Strophe, aktive Zeile), B Karaoke (aktuelle und nächste
Zeile, aktive Silbe), C Lauftext (alle gewählten Strophen, große Schrift, automatische
zentrierte Zeilenfolge in einem begrenzten Textbereich). Automatisches Scrollen
abschaltbar, keine Bewegung bei prefers-reduced-motion, kein Scrollen der ganzen Seite.
Aktivität wird zusätzlich zu Farbe durch Umrandung/Unterstreichung markiert.

Drei historisch überlieferte Strophen als Auswahl: ursprüngliche Strophen 1, 2 und 4
(nach heutiger Auswahl als 1, 2, 3 angezeigt). Alle drei vorgewählt; einzelne Strophen
abwählbar. Keine davon unabhängige Wiederholungszahl und kein Endlos-Modus. Ein
musikalischer Durchgang je gewählter Strophe, in Textreihenfolge; letzte Strophe
endet ohne zusätzliche Strophenpause. Kein Text gewählt: Start deaktiviert.
Textauswahl/Arrangementwechsel setzen zum Anfang zurück. Sichtwechsel und
Melodie-an/aus ändern die Wiedergabe nicht. Keine synthetische Gesangsstimme.

Recherchierte Schlaf-Melodie in F, 40 Viertel; sanfte Begleitung als Standard,
wahlweise warmes Solo oder lebhafte Begleitung. Tempo 40–200, Pause/Fortsetzen/Stop,
Strophenpause 0/1/2 Takte; Standard 0 wegen langer Schlussnote. Die MIDI-Noten werden
im bestehenden Sequenzer entsprechend der Textauswahl wiederholt, nicht als MP3
aneinandergereiht. Kein erneuter Audio-Download je Strophe.

## Daten und Synchronisation

lyrics/schlaf-kindlein-schlaf.json: schema 1, Titel, quarters 40, Quellenangaben,
verse [{id,label,historical_number,lines:[{text,cues:[{at,duration,text,spaceAfter}]}]}].
Jede Silbe ist explizit einer Note zugeordnet; keine geschätzte Textdauer oder OCR.
Silben zusammengesetzt ergeben den angezeigten Text. Nach Satzende wird die ganze
Haltedauer markiert. Der Schluss der letzten Zeile bleibt bis Strophenende aktiv.
Ein Satz kann schon auf der letzten Viertel des vorherigen Takts beginnen (z. B.
„Der“ auf Viertelposition 7); Zeilenwechsel richten sich nach Text, nicht Taktstrichen.

Die Hervorhebung bezieht ihre Position aus AudioWorklet-Statusmeldungen (optional
30 Hz für diesen Versuch, sonst bisherige 5 Hz). Kein unabhängiger Text-Timer,
kein starres Sekundenraster; Tempo und Pause gelten automatisch. Strophenpause:
keine aktive Silbe, Vorbereitung auf nächste ausgewählte Strophe. Beim Neustart,
Liedwechsel und natürlichen Ende klare Darstellung. Die Bildschirmanzeige ist
nicht samplegenau; Geräte-Ausgabelatenz und Hintergrunddrosselung bleiben Grenzen.

Texte sind für diesen Auftrag ausdrücklich erlaubt: nur historisch gemeinfreie
Liedtexte mit Quellenbeleg, keine Buchbilder/Illustrationen oder modernen Bearbeitungen.
Die drei ausgewählten Texte stammen aus der historischen Überlieferung (1808),
Rechtschreibung/Satzzeichen leicht normalisiert. Quellen siehe research/singalong.md.
Andere Lieder erhalten hierdurch keine pauschale Text-Veröffentlichungsfreigabe.

Akzeptanz: 30 Silben je Strophe auf 30 Noten/40 Viertel, vollständige lineare Abdeckung,
richtige Zählung/Zuordnung bei Auswahl 1+3, echte Wiedergabe endet nach Textauswahl,
Tempo/Pause/Strophenpause/Ansichtswechsel, sichere Textausgabe, mobile 320/390px,
reduzierte Bewegung, JS/Python-Regression und Pages-Liveprüfung.
