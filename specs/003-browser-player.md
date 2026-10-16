# Browser-Instrumente und taktgenaue Strophen

Status: implementiert; Python-/Engine-Tests und Browserprüfung ergänzen die Akzeptanz.

## Verhalten

Der Hauptplayer spielt die bestätigten Noten im Browser mit echten SoundFont-Samples.
Wählbar: Klarinette, Glockenspiel, Klavier und Flöte. Bestätigte Melodie und separat beauftragte Begleitspuren; siehe specs/008-main-arrangements.md.
Tempo 40–200 Viertel/Minute, Schnellwahl 75/100/125 % des Ausgangstempos.
Strophenzahl 1, 2, 3, 4 oder endlos. Start/Pause/Fortsetzen und Stop/zum Anfang.
Eine Änderung von Instrument oder Strophenzahl beginnt die Fassung nach erneutem Start neu;
Tempo darf während der Wiedergabe ohne Änderung der Tonhöhen wechseln.
Nur ein Lied spielt gleichzeitig. Keine Wiedergabe ohne Benutzeraktion.

## Daten und Timing

- CLI exportiert playback.json: schema_version 1, Titel, Tempo, quarters, notes:
  [{at, duration, midi}]. Einheiten sind Viertel und klingende MIDI-Tonhöhen.
  Bindungen werden zusammengeführt, Akkorde bleiben parallele Töne, Pausen sind Lücken.
- Die notierte Gesamtzeit plus die gewählte Strophenpause bestimmt den Loop. Keine MP3/WAV-Ausklingzeit und kein
  zusätzliches MIDI-Endpadding. Auftakt und verkürzter Schluss bleiben erhalten.
- Der Browser spielt daraus eine MIDI-Note-On/Off-Ereignisfolge mit SpessaSynth im AudioWorklet.
  Loops werden im Audio-Thread getaktet, nicht durch JavaScript-Timer neu gestartet.
  Instrumente erhalten ihre originalen SF2-Sustain-Loops und Hüllkurven.
- Sampler, Worklet und vier aus FluidR3 GM isolierte Presets werden selbst gehostet.
  Klangdaten werden bei Bedarf pro Instrument geladen und im Sitzungsspeicher gehalten.
  Keine Laufzeit-CDNs, API-Keys oder externen Dienste. Lizenznachweise werden mitgeliefert.
- add unterstützt --no-audio: Notendaten, MIDI, MusicXML, CSV und info.json ohne
  FFmpeg/FluidSynth; Hauptplayer funktioniert ohne MP3/WAV. render exportiert weiterhin
  standardmäßig Audio. Vorhandene Audiodownloads bleiben verfügbar.
- Katalog und Text werden sicher behandelt; Playback-Daten und alle relativen Pfade
  werden validiert. Fehler sind sichtbar, nach fehlgeschlagenem Laden erneut versuchen.
  Stop während des Ladens und Liedwechsel dürfen keine verspätete Wiedergabe auslösen.
- iPhone: AudioSession playback und Audiostart im Klick; für ältere Versionen
  Medienausgabe-Route, siehe specs/004-ios-audio.md. Unterbrechungen sichtbar pausieren.
  Betriebssystemunterbrechungen können keine Webanwendung ausschließen.

## Akzeptanz

Python: Playback entspricht MIDI/Quelle inkl. Pausen, Akkorden, Bindungen und Auftakt;
add/Ersetzen mit --no-audio funktioniert ohne Systemaudio-Werkzeuge.
JavaScript: Validierung, exakte MIDI-/Looplänge, endliche/unendliche Wiederholungen,
60 Strophen ohne Zeitdrift, Sample-Signal für jedes Instrument; echte Engine testen.
Browser: Start/Pause/Fortsetzen/Stop, Instrumentenwechsel, Tempo, Strophen, mobile
Darstellung, Ladezustände; neue und bestehende Dateien unter /melodino/ auf HTTPS prüfen.

Technische Präzisierung: SpessaSynth **Core 4.3.22** übernimmt die SF2-Synthese.
Ein kleiner eigener AudioWorklet-Sequenzer plant die MIDI-Note-On/Off-Ereignisse
auf absoluten Samplepositionen. Dadurch bleiben Rundungsreste über Strophen erhalten;
kein Neuankern der Uhr an jedem Loop. Die grafische Oberfläche erhält nur Statusmeldungen.

## Bereinigte Sammlung (15.10.2026)

Je ein Eintrag: „Schlaf, Kindlein, schlaf“ mit Klarinette/104 BPM (bisher Fassung 2),
„Was müssen das für Bäume sein“ mit Glockenklang/88 BPM (bisher Fassung 3).
Die beiden übrigen Exporte sind entfernt. Positionsabhängige Fassungsnummern entfallen;
die Instrumentenwahl bleibt für jedes Lied verfügbar.

## Strophenpause

Der Player bietet „keine / 1 Takt / 2 Takte“ als zusätzliche Atemzeit zwischen
Strophen. Die Pause folgt der vollständig gespielten Strophe, vor dem nächsten
Auftakt. Sie zählt im gewählten Tempo; Sample-Ausklingen bleibt erlaubt. Keine
Zusatzpause vor der ersten oder nach der letzten Strophe. Pause/Fortsetzen und
Tempoänderungen gelten auch in der Strophenpause; eine geänderte Auswahl setzt zurück.
Die Anzeige benennt die Strophenpause und hält den Strophenfortschritt am Ende.

`info.json` und Katalog erhalten `measure_quarters` (positive Taktlänge in Vierteln)
und `verse_gap_bars` (0, 1 oder 2). `render`/`add --verse-gap-bars` speichern den
gewählten Vorschlag, Standard für neue Exporte: 1. Ohne Metadaten gilt für alte
Kataloge weiterhin keine Pause. Bei wechselnder Taktart gilt der letzte Takt.
Noten, playback.json, MIDI, MusicXML und Einzelaufnahmen bleiben unverändert.
„Was müssen das für Bäume sein“ erhält 1 Takt (2 Viertel); bestehende andere
Fassungen behalten zunächst 0. Neue Vorschläge werden nach AGENTS.md beurteilt.

Akzeptanz: zusätzliche Dauer nur zwischen Strophen, unveränderte Tonfolge,
Auftakt, endlos ohne Drift, Tempowechsel/Pause innerhalb der Lücke und Validierung.

## Klangvarianten auf der Hauptseite

Solo, pur und warm, sanft begleitet und lebhaft begleitet. Die Begleitstimmen sind
eigene Arrangementvorschläge. Melodie, Begleitung und Rhythmus sind unabhängig
schaltbar; Instrumentenwahl verändert nur die Melodiespur. Erweiterte Einstellungen
stehen in einem aufklappbaren Bereich. Vertrag und Prüfung: specs/008-main-arrangements.md.
