# Melodino: Arbeitsanleitung für Codex

## Projekt und Spezifikation

Lies README.md, specs/001-melodino.md und specs/003-browser-player.md. Python-CLI in src/notenstimme,
statische Seite in docs/. Keine KI-API, Fotoerkennung oder eigener MCP-Server nötig.
Benutze die virtuelle Umgebung .venv; prüfe Systemwerkzeuge vor Installationen.
Arbeite auf main, sofern kein paralleler Arbeitsstand Isolation erfordert.
Keine fremden Änderungen verwerfen. Spezifikation bei Vertragsänderungen zuerst anpassen.

## Gewünschter Ablauf: Telefon → Codex → Abspielseite

Christian fotografiert die Notenseite mit dem Telefon und lädt sie in den Codex-Chat.
Du überträgst visuell, erzeugst und prüfst die Dateien in einer verbundenen Projektumgebung
und veröffentlichst über Git-Push nach main. Jedes hochgeladene Notenfoto gilt zugleich
als Auftrag zur vollständigen Übertragung, Prüfung, Katalogaufnahme und Veröffentlichung;
frage dafür nicht erneut nach Freigabe. Eine ausdrücklich abweichende Anweisung geht vor.
Unlesbare oder musikalisch unsichere Stellen weiterhin vor der Veröffentlichung klären.
Die Pipeline muss nicht
auf dem Telefon laufen. Ohne Zugriff auf Repository, Python und GitHub nicht behaupten,
dass der Chat etwas ausgeführt oder veröffentlicht hat; den konkreten Zugang nennen.

## Notenübertragung: zuerst fachlich prüfen

- Schlüssel, Tonart, Vorzeichen (auch Auflösungen und Geltung im Takt), Taktart,
  Tonhöhen, Oktaven, Tondauern, Pausen, Bindungen und Wiederholungen am Foto prüfen.
- Bei schiefen Fotos jede Notenlinie lokal entlang des Systems verfolgen;
  keine starre, bildweite Zuordnung von Bildhöhe zu Ton verwenden.
- Unlesbare Stellen mit Takt und Position benennen und klären, statt Töne zu erfinden.
  Bei Unsicherheit darf die betroffene Übertragung nicht als bestätigt veröffentlicht werden.
- Jeden Takt nachzählen. Auftakte, Mehrstimmigkeit und Bindungen in MusicXML ausdrücken.
- Übertragung und musikalische Gestaltung getrennt behandeln: zuerst bestätigte Noten,
  danach Tempo, Instrument und ausdrücklich gewünschte Transposition wählen.
- Für jedes neue Lied die Strophenpause als Wiedergabegestaltung beurteilen und
  mit `--verse-gap-bars 0|1|2` ausdrücklich speichern. Arbeitsstandard für Mitsingen:
  1 Takt, wenn kein ausreichender Atemraum erkennbar ist. Bei bereits vorhandenen
  Schlusspausen oder bewusst nahtlosem Anschluss 0; 2 nur bei begründetem Bedarf.
  Auftakt allein begründet keine Pause. Schlussdauer, notierte Pausen und Anschluss
  zum nächsten Auftakt prüfen, mindestens zwei Strophen im Browser durchspielen.
  Entscheidung kurz begründen; für diesen Gestaltungsvorschlag keine Rückfrage nötig.
  Unsichere Noten weiterhin klären. Keine Pausen in die bestätigte Partitur erfinden:
  Metadaten `measure_quarters`/`verse_gap_bars` steuern nur den Browser. Bei wechselnder
  Taktart den letzten Takt verwenden. Auswahl im Player bleibt veränderbar.
- Keine Begleitung, keinen Gesang und keine zusätzlichen Töne erfinden.
  Ausnahme: Für Klanglabor und Hauptseite sind eigene instrumentale Arrangementvorschläge
  ausdrücklich beauftragt. Sie bleiben als Begleitspuren von der bestätigten Melodie
  getrennt; Originalnoten und Originaldownloads nicht verändern. Neue Akkordpläne
  unter scripts/prepare-library-arrangements.mjs pflegen, danach das Skript ausführen.
- JSON für einfache einstimmige Melodien, Wiederholungen ausdrücklich ausschreiben.
  Dauer in Vierteln; B-4 = deutsches B (B♭), B4 = H, rest = Pause.
- MusicXML für Akkorde/komplexere Notation. Klingende Tonhöhen werden exportiert.
  Klarinettenwahl verändert keine Tonhöhen und erzeugt keine geschriebene B♭-Stimme.
- Originalbilder nicht standardmäßig veröffentlichen, nicht unter docs/ ablegen,
  nicht committen. Temporäre Fotos allenfalls in ignoriertem private/ halten.
  Keine Liedtexte, Buchillustrationen oder sonstige Buchbestandteile übernehmen.
  Ausnahme: Für das Mitsing-Labor sind die historisch gemeinfreien Schlaf-Kindlein-
  Textstrophen ausdrücklich beauftragt (specs/009-singalong.md). Silben/Notenpositionen
  und Quellen prüfen; daraus folgt keine Freigabe für Texte anderer Lieder.
- Referenzlied: Takt 5 ist B-4, B-4, G4, G4. Niemals C5, C5, A4, A4 übernehmen.

## Rendern, Hinzufügen, Veröffentlichen

1. Bestätigte Eingabe unter examples/<lied>.json oder .musicxml speichern.
2. `.venv/bin/notenstimme render ... --output work/<lied> --bpm 88 --no-audio` zur Kontrolle.
   Für eine zusätzliche Aufnahme --no-audio weglassen.
3. MIDI/MusicXML, playback.json und Taktlängen gegen die Vorlage prüfen. Browser-Wiedergabe
   und Strophenübergang prüfen; zusätzliche WAV/MP3 auf Dauer und hörbare Töne prüfen.
   Nur für Klarinetten-Audioexporte den vorhandenen GM-SF2-Pfad nutzen.
4. `.venv/bin/notenstimme add ... --slug <sicherer-slug> --bpm 104 --instrument clarinet --no-audio`
   exportiert kleine Browser-Notendaten (playback.json) und aktualisiert den Katalog.
   Ohne --no-audio werden zusätzlich WAV/MP3 erzeugt. Ein Slug steht für eine Fassung; andere Instrumente
   beim Audioexport erhalten andere Instrumente andere Slugs. Im Browser lässt sich das
   Instrument direkt wählen. add lädt nichts hoch.
5. `.venv/bin/pytest -q` und `npm test`; bei Webänderungen responsive Ansicht und Bedienelemente prüfen.
6. Nach erfolgreicher Prüfung gezielt nur Projektdateien committen und nach main pushen.
   Der Upload eines Notenfotos erteilt diesen Auftrag bereits; keine weitere Freigabe erfragen.
   Nie Fotos, .venv, node_modules/, work/, vollständige GM-Soundbanks oder Zugangsdaten committen.
   Ausnahme: Die sieben kuratierten SF2-Presets unter docs/samples/ sind ausdrücklich
   beauftragte, gemeinsam genutzte Browser-Klangdaten mit Lizenznachweis.
7. GitHub-Action bis zum Ergebnis verfolgen. Erst nach erfolgreichem Deployment die echte
   HTTPS-Seite, library.json, playback.json und Browser-Wiedergabe prüfen, einschließlich
   /melodino/. Direkte MP3-Links nur bei zusätzlich erzeugten Aufnahmen prüfen.
   Keine erfolgreiche Veröffentlichung behaupten, solange diese nicht geprüft wurde.

GitHub-Ziel: sichgeis/melodino. Anmeldungen/Berechtigungen tatsächlich prüfen.
Zugangsdaten nie ausgeben oder speichern. Keine Tokens als Kommandozeilenargumente.
