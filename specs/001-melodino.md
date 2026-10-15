# Melodino – Spezifikation 1

Status: implementiert; Browser-Vertrag weiterentwickelt in specs/003-browser-player.md; Akzeptanz durch automatisierte Tests und reale Export-/Pages-Prüfung.

## Nutzerablauf

1. Christian fotografiert eine Notenseite mit dem Telefon und lädt sie im Codex-Chat hoch.
2. Codex mit Zugriff auf dieses Repository prüft das Foto visuell und klärt unlesbare Stellen.
3. Codex speichert die bestätigte Übertragung als JSON oder MusicXML. Das Foto bleibt privat.
4. Codex erzeugt Hörproben über die CLI, prüft Notation und Audio und ergänzt den Katalog.
5. Auf Veröffentlichungsauftrag committet und pusht Codex die Dateien; GitHub Actions veröffentlicht docs/.
6. Christian öffnet die HTTPS-Seite am Telefon und singt zur Instrumentalfassung.

Der ausführende Codex-Chat benötigt eine mit dem Repository verbundene Python-Umgebung,
Audio-Werkzeuge und GitHub-Schreibrechte. Das Telefon selbst führt keine Pipeline aus.
Ein Chat ohne Zugriff auf diese Umgebung kann Dateien vorschlagen, aber nichts veröffentlichen.

## Verträge und Akzeptanz

- JSON: Titel, Quelle, Tonart, Taktart, optional BPM; Takte als [Ton, Vierteldauer].
  Jeder Takt ist vollständig; Auftakte und Bindungen werden über MusicXML abgebildet.
  Positive endliche Dauern; explizite Oktaven; B-4 = B♭, B4 = H. Keine impliziten Wiederholungen.
- MusicXML: Akkorde, Stimmen, Bindungen, Pausen, Auftakte, ausgeschriebene bzw. expandierbare
  Wiederholungen. Klingende Tonhöhen sind maßgeblich; transponierende Stimmen werden nach
  concert pitch konvertiert. Exporttempo ist über die gesamte Partitur einheitlich.
- Instrument bell/clarinet ändert keine Tonhöhe. Nur --transpose ändert Halbtonschritte.
  MIDI-Klarinette GM 72 (Byte 71), ohne instrumentenbedingte B♭-Transposition.
- Render: WAV, MIDI, MusicXML, CSV, info.json; MP3 wenn FFmpeg verfügbar.
  Ohne FFmpeg Erfolg mit WAV und verständlichem Hinweis. FluidSynth/SF2 fehlen: klarer Fehler.
- Add: sichere ASCII-Slugs, relative Dateien unter docs/assets/<slug>; vorhandener Slug ersetzt.
  Renderfehler dürfen den bisherigen Katalog/Export nicht beschädigen. Kein Upload durch add.
  Katalogschreibvorgänge werden serialisiert; Verzeichnistausch und JSON-Schreiben erfolgen atomar.
- Seite: responsive, deutsch, selbst gehosteter Browser-Synthesizer, kein Autoplay,
  taktgenaue Strophen, Instrumentenwahl, Tempo, optionale Audio-Downloads und Ladefehler.
  Katalogwerte werden mit DOM-textContent ausgegeben; Dateipfade werden validiert.
- Referenz: F-Dur, 4/4, 10 Takte, 40 Viertel, 30 Noten.
  Takt 5 zwingend B-4/B-4/G4/G4. Bell 88, Clarinet 104 BPM.
- Grenzen: keine OCR/API, Begleitung, Gesang, Texte, Illustrationen oder Veröffentlichung der Fotos.

## Prüfnachweise

`pytest`: Takte, Referenzmelodie, MIDI, Tempo/Transposition, Klangprogramm,
MusicXML-Akkorde/Bindungen, nicht stummes Audio, fehlendes FFmpeg, Slugs/Katalog/Dateiverweise.
Browserprüfung und HTTPS-Checks ergänzen den Testlauf, siehe README.
