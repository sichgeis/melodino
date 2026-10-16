# Strophen auf der Hauptseite

Die im Mitsing-Labor bevorzugte Ansicht A wird in die normalen Liedkarten übernommen.
Eine Textstrophe mit aktiver Zeile, keine Karaoke-/Lauftext-Umschalter. Bei Liedern
mit geprüftem Text bestimmt die Strophenauswahl die Zahl der Musikdurchgänge.
Keine davon unabhängige Zahl und kein Endlos-Modus für diese Karten. Ohne Auswahl
kein Start. Auswahl unter „Strophen & Klang“, keine zusätzlichen Karten je Strophe.
Der bekannte Klang-/Instrument-/Tempo-/Mix-Player bleibt erhalten.

Textzuordnung liegt in docs/lyrics/catalog.json, getrennt vom CLI-Katalog. Sichere
bekannte Slugs/Dateipfade, Textdaten werden gegen die aktuelle rhythmische Quelle
geprüft. Fehlerhafte Texte deaktivieren bei diesem Lied die Textansicht mit einem
sichtbaren Hinweis; Instrumentalwiedergabe bleibt möglich. Schlaf nutzt den bereits
geprüften Text (3 ausgewählte historische Strophen); beide Melodiefassungen haben
denselben Rhythmus. Die recherchierte Fassung ist mit Text der Standard wie im Labor.
Originalnoten/Downloads bleiben erhalten. Andere Texte werden nur aus vorliegender
oder passend freier Quelle ergänzt; keine erfundenen Texte oder automatische
Web-Übernahme moderner Liedtexte. Lieder ohne geprüften Text behalten zunächst ihre
instrumentale Wiederholungswahl und einen verständlichen Hinweis.

Die Musik wird im Browser samplegenau pro ausgewählter Textstrophe wiederholt;
keine MP3-Verkettung, keine erfundenen Pausen in der Partitur. Gesamtdauer enthält
nur die ausgewählten Strophen und die Pausen dazwischen. Text folgt der Audio-Uhr
und bleibt bei Pause stehen. Bei Strophenwechsel aktuelle Auswahl korrekt abbilden
(z. B. 1+3 bedeutet zwei Durchgänge). Variante/Instrument/Quelle wechseln setzt zurück.

Neues Lied: „Schilf bleicht“ / „Kiefern im Wind“; instrumentale traditionelle
schwedische Melodie „Vårvindar friska“. Notenquelle, Rhythmus, Akkordplan und
musikalische Atemzeit separat prüfen. Der deutsche Text wird erst nach Bereitstellung
durch den Nutzer integriert, nicht vollständig aus dem Web übernommen.

Akzeptanz: Strophenauswahl/Zählung/Pause/Tempo und Strophenwechsel auf Hauptseite,
sicherer Textkatalog, Solofallback, unveränderte Originaldownloads, neues Lied
MIDI/XML/Playback/Arrange validiert, mobile Ansicht, Python/JS, Pages/HTTPS/Browser.

Alle HTML-Einstiegsseiten erhalten robots=noindex,nofollow. Keine robots.txt-Sperre:
Crawler müssen die Meta-Angabe lesen können. Das ist ein Indexierungswunsch und
keine Zugriffskontrolle; Pages und öffentliches Repository bleiben erreichbar.
