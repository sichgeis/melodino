# Melodino

**Foto im Codex-Chat → bestätigte Noten → Browser-Instrumente → GitHub Pages.**
Du fotografierst eine Liederbuchseite mit dem Telefon und lädst sie im Codex-Chat hoch.
Codex liest die Noten visuell, klärt unsichere Stellen und führt die Python-Pipeline aus.
Die statische Seite spielt die Melodie mit Instrumenten-Samples direkt im Browser, ihr singt dazu.
Wählt Klarinette, Glockenspiel, Klavier oder Flöte und 1–4 Strophen oder endlose Wiederholung.
Die nächste Strophe beginnt im Takt, ohne die Ausklingpause einer Audiodatei abzuwarten.

- [Abspielseite](https://sichgeis.github.io/melodino/)
- [Spezifikation](specs/001-melodino.md) · [Anleitung für Codex](AGENTS.md)

Der ausführende Chat braucht Zugriff auf dieses Repository und eine Python-Umgebung
mit GitHub-Schreibrechten. Die Ausführung findet dort statt; das Telefon dient für
Foto, Chat und Wiedergabe. Ein isolierter Chat ohne Projektzugang kann nicht deployen.
Kein eigener Upload, keine automatische Fotoerkennung, keine KI-API und kein MCP-Server.

## Einrichtung auf macOS

Zuerst prüfen, was bereits da ist:

```sh
python3.11 --version
command -v ffmpeg
command -v fluidsynth
command -v gh
```

Falls nötig mit Homebrew installieren:

```sh
brew install python@3.11 ffmpeg fluidsynth gh
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
```

Python 3.11 oder neuer. Getestete Python-Pakete stehen in requirements-tested.txt.
FFmpeg erzeugt MP3. Ohne FFmpeg bleibt WAV verfügbar; der Katalog bietet dann kein MP3 an.
Klarinette benötigt FluidSynth **und eine GM-SF2-Soundbank mit Programm 72**.
Die mit FluidSynth mitgelieferte kleine Beispielbank ist keine vollständige GM-Bank.

Für diese Hörprobe wurde FluidR3 GM aus dem offiziellen Debian-Archiv verwendet
([Paketinhalt](https://packages.debian.org/bookworm/all/fluid-soundfont-gm/filelist)).
Die vollständige GM-Bank bleibt lokal. Vier daraus isolierte Presets liegen als gemeinsam
genutzte Browser-Klänge mit Lizenznachweis unter docs/samples/. Reproduzierbare Beschaffung:

```sh
mkdir -p work/soundfonts
curl -fL https://deb.debian.org/debian/pool/main/f/fluid-soundfont/fluid-soundfont-gm_3.1-5.3_all.deb -o work/soundfonts/fluid.deb
(cd work/soundfonts && ar -x fluid.deb && tar -xf data.tar.xz)
export MELODINO_SOUNDFONT="$PWD/work/soundfonts/usr/share/sounds/sf2/FluidR3_GM.sf2"
```

Alternativ `--soundfont /pfad/GM.sf2`. Auf Linux z. B.
`sudo apt-get install ffmpeg fluidsynth fluid-soundfont-gm`.
FluidR3: Frank Wen und Mitwirkende, MIT-Lizenz; siehe THIRD_PARTY_NOTICES.md.
Keine vollständige GM-Soundbank und keine absoluten lokalen Pfade werden veröffentlicht.

## CLI

Alle Befehle aus dem Projektordner mit aktivierter virtueller Umgebung ausführen:

```sh
notenstimme render examples/lied.json --output work/lied --bpm 88
notenstimme add examples/lied.json --slug mein-lied --bpm 104 --instrument clarinet --no-audio
notenstimme render examples/lied.json --output work/tiefer --bpm 88 --transpose -2
notenstimme render partitur.musicxml --output work/partitur --instrument clarinet --soundfont /pfad/GM.sf2
```

`render` erzeugt nur lokale Dateien. `add` erzeugt Dateien in `docs/assets/<slug>/`,
aktualisiert `docs/library.json` und damit automatisch die Liedkarten.
**add veröffentlicht nicht.** Ein vorhandener Slug wird ersetzt; verschiedene Fassungen
bekommen verschiedene Slugs. Erlaubt: Kleinbuchstaben a–z, Ziffern und einzelne Bindestriche,
maximal 80 Zeichen. Optional `--docs anderer/ordner` für einen anderen Katalog.

Pro Fassung immer playback.json (Viertelposition, Dauer und klingende MIDI-Tonhöhe),
melody.mid, score.musicxml, notes.csv und info.json. Mit `--no-audio` wird keine Aufnahme erzeugt;
für den Browserplayer sind FluidSynth, SF2 und FFmpeg dann nicht nötig.
Ohne diese Option zusätzlich melody.mp3 (mit FFmpeg) und melody.wav.

CSV enthält Takt, absoluten Beginn in Vierteln ab Liedanfang,
Ton und Dauer; Akkorde haben eine Zeile je Ton. info.json enthält Titel, Quelle,
BPM, Instrument, musikalische und tatsächliche Audiodauer, Viertelsumme, klingende
Tonanzahl, Transposition, Dateiverweise und ggf. den Soundbank-Dateinamen.
Die Audiodauer enthält die Ausklingzeit; sie kann länger sein als die Notendauer.

## Weitere Notenfotos

Beispielauftrag im mit diesem Projekt verbundenen Codex-Chat:

> Übertrage dieses Notenfoto gemäß AGENTS.md. Kläre unlesbare Stellen mit mir.
> Exportiere nach bestätigter Übertragung mit --no-audio eine Fassung mit 104 BPM,
> füge sie als „mein-lied“ hinzu und veröffentliche sie auf Melodino.
> Prüfe anschließend den Browserplayer und gib mir den Link zur Abspielseite.

Schlüssel, Vorzeichen, Notenlinien bei Schräglage, Rhythmus, Pausen, Bindungen,
Wiederholungen und Taktlängen werden vor der Klanggestaltung geprüft. Nur die
bestätigten Noten veröffentlichen; Buchfoto, Liedtext und Illustrationen bleiben draußen.

Einfache Melodie als JSON (Dauern in Vierteln):

```json
{
  "title": "Beispiel", "source": "Im Codex-Chat aus einem Notenfoto übertragen",
  "key": "F", "meter": "4/4", "bpm": 88,
  "measures": [
    [["A4", 2], ["G4", 1], ["G4", 1]],
    [["F4", 3], ["rest", 1]]
  ]
}
```

1 = Viertel, 2 = Halbe, 3 = punktierte Halbe, 0.5 = Achtel, 4 = Ganze.
`B-4` = deutsches B/B♭4, `B4` = H, `rest` = Pause.
Jeder JSON-Takt muss vollständig sein, Wiederholungen werden ausgeschrieben.
Für Auftakte, Akkorde, mehrere Stimmen und Bindungen MusicXML verwenden.
MusicXML-Wiederholungen werden durch music21 expandiert; komplexe Sprunganweisungen
müssen anschließend musikalisch kontrolliert werden. Transponierende Instrumente
in der Eingabe werden in klingende Tonhöhen umgerechnet.

## Beispiel und musikalische Grenzen

„Schlaf, Kindlein, schlaf“: F-Dur, 4/4, zehn Takte, 40 Viertel, 30 Noten.
**Takt 5 ist B♭–B♭–G–G.** Die überprüfte Folge liegt in examples/lied.json
und identisch in examples/schlaf-kindlein-schlaf.json.

Veröffentlicht ist die bisherige Fassung 2 mit Klarinette und 104 Vierteln/Minute
(GM 72, nullbasiert 71). Das Instrument ist im Browser frei wählbar.

Keine Begleitung, kein Gesang, keine expressive Interpretation. Beim Python-Audioexport sind Glocken synthetisch und Klarinette ein Sample-Instrument.
Im Browser verwenden alle vier Instrumente SoundFont-Samples. Instrumentenwahl ändert keine klingenden Tonhöhen;
die Ausgabe ist keine geschriebene B-Klarinettenstimme. Nur `--transpose` ändert die Tonhöhe.
Kurze Abstände in der Klarinetten-Audiodatei trennen wiederholte Töne; MIDI und MusicXML
behalten die vollen notierten Dauern und Bindungen. Einheitliches Exporttempo überschreibt
alle Tempoänderungen. Ganzzahlige MIDI-Tonhöhen 0–127, keine Mikrotonalität.
JSON-Vorzeichen werden explizit am Ton angegeben; `key` ergänzt keine impliziten Alterationen.

## Browserplayer

Der Browser lädt die Noten aus playback.json und spielt MIDI-Note-On/Off-Ereignisse
mit SpessaSynth Core 4.3.22 und originalen FluidR3-GM-Samples. Ein kleiner AudioWorklet-
Sequenzer plant die Noten auf absoluten Samplepositionen; kein JavaScript-Timer startet
Strophen neu. Auch Auftakt und verkürzter Schluss werden ohne zusätzliche Pause wiederholt.
Klänge dürfen über die Strophengrenze ausklingen. Details: specs/003-browser-player.md.

Instrumente ändern keine Tonhöhen. Tempo: 40–200 Viertel/Minute, auch während der
Wiedergabe änderbar; Schnellwahl 75/100/125 %. Strophenzahl 1, 2, 3, 4 oder endlos.
Pause friert Noten und Samples ein; Fortsetzen setzt an derselben Stelle fort.
Instrument/Strophenzahl wechseln setzt die Wiedergabe zurück; danach erneut starten.
Nur ein Player spielt. Ein Tippen aktiviert Audio auf iPhone/Safari; kein Autoplay.
Bei Betriebssystemunterbrechungen ggf. erneut auf Fortsetzen tippen. Hintergrundbetrieb
und gesperrter Bildschirm werden nicht von allen mobilen Browsern zuverlässig unterstützt.

Die Klänge werden pro Instrument einmal pro Sitzung bei Bedarf geladen:
Klarinette ca. 0,6 MB, Glockenspiel 0,6 MB, Flöte 1,3 MB, Klavier 7,8 MB.
Alle Dateien werden über dieselbe GitHub-Pages-Seite geladen, ohne CDN oder API.
Der Browsercache kann erneute Downloads vermeiden. Samples enthalten echte Sustain-Loops,
so dass auch lange Noten bei langsamem Tempo gehalten werden.

Bestehende Aufnahmen bleiben unter „Downloads & Aufnahme“ verfügbar. Sie behalten
ursprüngliches Instrument und Tempo; für taktgenaue Loops den Hauptplayer verwenden.
Neue Lieder brauchen mit --no-audio keine MP3/WAV-Dateien. Downloads für MIDI,
MusicXML und Notenliste bleiben erhalten. Bibliothek und Texte werden als Text ausgegeben;
Notendaten und relative Pfade werden validiert. Ladefehler werden sichtbar gemeldet.

### Entwicklung und Klangdaten reproduzieren

Die fertige Seite benötigt keinen Build. JavaScript-Tests laufen mit Node.js 20+:

```sh
npm test
```

Nur um das vendorte Synthesizer-Bundle oder die Klangdaten neu zu erzeugen:

```sh
npm ci
npm run vendor
node scripts/prepare-soundbanks.mjs work/soundfonts/usr/share/sounds/sf2/FluidR3_GM.sf2
```

Versionen sind in package-lock.json festgelegt. Die erzeugten Browserdateien werden
committed; node_modules/ bleibt ignoriert. Lizenznachweise: docs/samples/NOTICE.txt,
docs/vendor/ und THIRD_PARTY_NOTICES.md. Die SF2-Presets wurden isoliert, nicht klanglich verändert.
Tests prüfen u. a. 60 Strophen ohne Rundungsdrift, Pause/Tempo/Stop, alle vier echten
Soundbanks und lange gehaltene Windinstrument-Töne.

## Zweites Lied aus einem Chat-Foto

„Was müssen das für Bäume sein“ liegt als MusicXML in examples/:
G-Dur, 2/4, Achtelauftakt, 60 Töne und 36 Viertel. Der verkürzte Schluss
ergänzt den Auftakt. Der erste Systemwechsel unterbricht einen Takt;
dieser bleibt in der Übertragung zusammen. Es gibt keine Begleitung.
Veröffentlicht ist die bisherige Fassung 3 mit Glockenklang und 88 BPM.
Das Instrument ist im Browser frei wählbar.
Details und Prüfkriterien: [Liedspezifikation](specs/002-baeume.md).

## Tests und lokale Seite

```sh
pytest -q
python -m http.server 8000 --directory docs
# http://localhost:8000 öffnen (nicht file://)
```

Tests prüfen Takte und Takt 5, MIDI-Tonhöhen/-Dauern, Tempo, Transposition,
Klarinettenprogramm und klingende Tonhöhen, WAV/MP3-Decodierung und Signalpegel,
MusicXML mit Akkorden/Bindungen und transponierender Stimme, fehlendes FFmpeg,
Slug-Sicherheit, Hinzufügen/Ersetzen, Fehlererhalt und Katalogdateien.
Klarinetten-Audiotest benötigt FluidSynth und GM-SF2, sonst expliziter Skip.
GitHub CI installiert diese Abhängigkeiten und führt den vollständigen Test sowie `npm test` aus.

## GitHub Pages

Repository: [sichgeis/melodino](https://github.com/sichgeis/melodino).
Workflow `.github/workflows/pages.yml` testet main und veröffentlicht ausschließlich docs/.
Repository Settings → Pages → Source: **GitHub Actions**. Alternativ mit vorhandenem Admin-Zugang:

```sh
gh api repos/sichgeis/melodino/pages --method POST -f build_type=workflow
# Wenn Pages bereits existiert: --method PUT statt POST.
```

Neues Lied nach Kontrolle gezielt committen und pushen:

```sh
git add examples/ docs/
git commit -m "Add new instrumental song"
git push origin main
gh run list --workflow pages.yml --limit 1
gh run watch RUN_ID --exit-status
```

Danach https://sichgeis.github.io/melodino/, die Browser-Wiedergabe und Notendateien prüfen;
bei Audioexporten zusätzlich den direkten MP3-Link.
Alle Ressourcenpfade sind relativ und funktionieren unter `/melodino/`.
Keine Secrets ins Repository schreiben; Zugang über vorhandene GitHub-Anmeldung.
