# Melodino: Arbeitsanleitung für Codex

## Projekt und Spezifikation

Lies README.md und specs/001-melodino.md. Python-CLI in src/notenstimme,
statische Seite in docs/. Keine KI-API, Fotoerkennung oder eigener MCP-Server nötig.
Benutze die virtuelle Umgebung .venv; prüfe Systemwerkzeuge vor Installationen.
Arbeite auf main, sofern kein paralleler Arbeitsstand Isolation erfordert.
Keine fremden Änderungen verwerfen. Spezifikation bei Vertragsänderungen zuerst anpassen.

## Gewünschter Ablauf: Telefon → Codex → Abspielseite

Christian fotografiert die Notenseite mit dem Telefon und lädt sie in den Codex-Chat.
Du überträgst visuell, erzeugst und prüfst die Dateien in einer verbundenen Projektumgebung
und veröffentlichst auf seinen Auftrag über Git-Push nach main. Die Pipeline muss nicht
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
- Keine Begleitung, keinen Gesang und keine zusätzlichen Töne erfinden.
- JSON für einfache einstimmige Melodien, Wiederholungen ausdrücklich ausschreiben.
  Dauer in Vierteln; B-4 = deutsches B (B♭), B4 = H, rest = Pause.
- MusicXML für Akkorde/komplexere Notation. Klingende Tonhöhen werden exportiert.
  Klarinettenwahl verändert keine Tonhöhen und erzeugt keine geschriebene B♭-Stimme.
- Originalbilder nicht standardmäßig veröffentlichen, nicht unter docs/ ablegen,
  nicht committen. Temporäre Fotos allenfalls in ignoriertem private/ halten.
  Keine Liedtexte, Buchillustrationen oder sonstige Buchbestandteile übernehmen.
- Referenzlied: Takt 5 ist B-4, B-4, G4, G4. Niemals C5, C5, A4, A4 übernehmen.

## Rendern, Hinzufügen, Veröffentlichen

1. Bestätigte Eingabe unter examples/<lied>.json oder .musicxml speichern.
2. `.venv/bin/notenstimme render ... --output work/<lied> --bpm 88` zur Kontrolle.
3. MIDI/MusicXML und Taktlängen gegen die Vorlage prüfen; WAV/MP3 auf Dauer,
   hörbare Töne und Instrument prüfen. Für Klarinette vorhandenen GM-SF2-Pfad nutzen.
4. `.venv/bin/notenstimme add ... --slug <sicherer-slug> --bpm 104 --instrument clarinet`
   aktualisiert Hörprobe und Katalog. Ein Slug steht für eine Fassung; andere Instrumente
   erhalten andere Slugs. add lädt nichts hoch.
5. `.venv/bin/pytest -q`; bei Webänderungen responsive Ansicht und Bedienelemente prüfen.
6. Bei Veröffentlichungsauftrag gezielt nur Projektdateien committen und nach main pushen.
   Nie Fotos, .venv, work/, Soundbanks oder Zugangsdaten committen.
7. GitHub-Action bis zum Ergebnis verfolgen. Erst nach erfolgreichem Deployment die echte
   HTTPS-Seite, library.json und direkte MP3-Links prüfen, einschließlich /melodino/.
   Keine erfolgreiche Veröffentlichung behaupten, solange diese nicht geprüft wurde.

GitHub-Ziel: sichgeis/melodino. Anmeldungen/Berechtigungen tatsächlich prüfen.
Zugangsdaten nie ausgeben oder speichern. Keine Tokens als Kommandozeilenargumente.
