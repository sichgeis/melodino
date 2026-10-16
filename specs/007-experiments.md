# Klangexperimente und Melodievergleich

Status: implementiert, Auftrag 16.10.2026. Automatisierte Engine-/Regressionstests
und Browserprüfung; Veröffentlichung über den bestehenden Pages-Workflow.

Separater, von der Startseite verlinkter Bereich experiments.html. Die reguläre Sammlung
und ihre bestätigten Quellen bleiben unverändert. Der Nutzer beauftragt hier ausdrücklich
zusätzliche Begleitstimmen und Rhythmus als eigene Arrangements, nicht als Fototranskription.

Für „Bäume“ und „Schlaf, Kindlein“ vier vergleichbare Einstellungen bei jeweils gleichem
Tempo: unveränderte Solo-Referenz, warme Solo-Interpretation mit Phrasendynamik/Raum,
sanfte Begleitung (Klarinette, Klavier, Bass), bewegte Begleitung (Flöte, Nylongitarre,
Bass, leiser Holzblock). Die letzten beiden sind neue Gestaltungsvorschläge.
Begleitlautstärke und Melodie an/aus, Tempo, 1/2/endlose Strophen, Pause/Stop.
Keine zufälligen Zeitverschiebungen. Gleiche Melodietonhöhen, Einsätze, Dauern und
Gesamtlängen; Expressivität betrifft Anschlag, Artikulation und Klang.
Strophenpause: Schlaf 0 (lange Schlussnote), Bäume 1 Takt wie Sammlung.

Browser-Daten schema_version 2: title, bpm, quarters und tracks (1–8):
role melody|backing, instrument aus erlaubter Liste, volume 0–127, pan 0–127,
notes [{at,duration,midi,velocity?}]. Zusätzlich room 0–1. Schema 1 bleibt kompatibel.
Alle Tracks verwenden dieselbe samplegenaue Uhr. Eigene MIDI-Kanäle verhindern
Note-Off-Konflikte zwischen Stimmen. Strophenpause und Tempo gelten für alle Tracks.
Neue isolierte FluidR3-Presets: Nylongitarre (24), akustischer Bass (32), Holzblock (115),
mit bestehender MIT-Lizenz. Keine neue Laufzeit-Abhängigkeit und keine externe Klang-CDN.

Schlaf-Vergleich: eigenständig übertragene gemeinfreie Reichardt-Melodie, anhand
Liederkiste und Sing Kinderlieder geprüft, in F und gleicher Dauerskalierung wie Bestand.
Keine fremden Notenblätter, Illustrationen, Liedtexte oder Aufnahmen veröffentlichen.
Beide Quellen stimmen in den unten dokumentierten Abweichungen überein. Quellenvergleich
ist kein Beweis, dass das ursprünglich fotografierte Buch dieselbe Variante benutzt:
Foto von Schlaf liegt in dieser Sitzung nicht vor. Deshalb keine stille Korrektur.
Die Hörvergleiche behalten gleiche 104 BPM, damit keine Tempowirkung verwechselt wird.

Akzeptanz: reguläre Sammlung unverändert; Melodiespur exakt quellegetreu; gültige
Begleitnoten/Slugs/Pfade; echter Synth nicht stumm/übersteuert; Mehrkanal-Loops/Pause/Tempo;
mobile Oberfläche und echte Browserwiedergabe; Python+JS; Push+Actions+HTTPS prüfen.
