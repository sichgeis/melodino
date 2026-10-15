# iOS: hörbare Medienwiedergabe und sicherer Audiostart

Ausgangslage: Auf iPhones bleibt Melodino stumm, während Android und macOS funktionieren.
Ein konkreter iPhone-Fehler ist ohne Geräteprotokoll noch nicht reproduziert.
Bekannt ist die unterschiedliche Behandlung von Web Audio und HTML-Medien durch
WebKit bei aktiviertem Stummmodus. Unser Player hat bisher keine Audio-Session gesetzt.

## Verhalten

- Vor AudioContext-Erzeugung und bei erneutem Start/Fortsetzen, sofern unterstützt,
  navigator.audioSession.type = "playback" setzen. Nur Medienausgabe, kein Mikrofonzugriff.
- AudioContext.resume() und ein kurzer lautloser Buffer-Start passieren synchron im
  Benutzerklick, vor Downloads und await; kein Autoplay.
- Auf iOS/iPadOS ohne nutzbare AudioSession-API wird die echte Audioausgabe über
  MediaStreamAudioDestinationNode und ein per Benutzerklick gestartetes HTML-Audioelement
  geroutet. Es wird kein zweiter hörbarer Ton und keine separate Aufnahme erzeugt.
- Andere Browser verwenden weiterhin die direkte Web-Audio-Ausgabe.
- Die Audiofreischaltung bei Start/Fortsetzen erhält eine begrenzte Wartezeit und eine verständliche
  Fehlermeldung statt unbegrenzt „Instrument lädt …“. Fehlgeschlagene Freischaltung
  kann beim nächsten Klick erneut versucht werden.
- Unterbrechungen pausieren weiterhin sichtbar; Fortsetzen aktiviert den Ausgabepfad neu.
- Stop, Liedwechsel und Fehler stoppen auch eine eventuell verwendete Medienroute.
- Hinweise „Kein Ton?“ nennen Medienlautstärke, Bluetooth-Ausgabe und Öffnen in Safari.
  Falls der ältere Browserweg nicht funktioniert, Stummmodus ausschalten; vorhandene
  Aufnahme bleibt ein weiterer Ausweg. Keine Garantie für Hintergrund-/Sperrbildschirm.

## Belege

- WebKit 251532, Kommentare 6–8: AudioSession playback hilft gegen Stummschaltung:
  https://bugs.webkit.org/show_bug.cgi?id=251532
- Derselbe Bericht, Kommentar 3: MediaStreamAudioDestinationNode als möglicher Workaround.
- AudioSession API und Feature-Erkennung:
  https://developer.mozilla.org/en-US/docs/Web/API/AudioSession
- Medienstart unmittelbar aus einem Benutzerereignis:
  https://webkit.org/blog/6784/new-video-policies-for-ios/

## Prüfung

Tests decken Playback-Session, optionale/fehlschlagende API, iOS-Legacy-Medienroute,
Android/Desktop ohne Routingänderung, synchrone Aktivierung vor await, Timeout,
Pause/Stop und erneuten Start ab. Bestehende Klang-/Looptests bleiben unverändert.
Browser-Smoke-Test auf HTTPS; Erfolg auf einem physischen iPhone kann erst durch
Gerätetest bestätigt werden und wird nicht aus Desktop-Tests abgeleitet.
