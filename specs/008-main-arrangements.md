# Klangvarianten auf der Hauptseite

Auftrag: Die bewährten Klanglabor-Varianten für alle Lieder auf die Hauptseite
übernehmen, Begleitstimmen ergänzen und die Bedienung kompakt halten.

Die bestätigte Melodie bleibt unverändert. Eigene instrumentale Begleitungen sind
nun ausdrücklich auch für die Sammlung beauftragt. Vier Klangvarianten: Solo,
pur und warm, sanft begleitet, lebhaft begleitet. Standard: sanft begleitet, sofern
ein geprüftes Arrangement vorhanden ist; sonst Solo. Kein Gesang.
Schlaf bietet die recherchierte Melodie als zusätzliche klar bezeichnete Auswahl
innerhalb derselben Karte; die bisherige Fassung bleibt auswählbar und Standard.

Sichtbar: Titel, Dauer, Klangvariante, Strophenzahl, Wiedergabe/Stop, Fortschritt.
Weitere Einstellungen in einem Details-Bereich: Instrument der Melodie (automatisch
passend zur Variante oder manuell), Tempo/Schnellwahl, Strophenpause, Lautstärke der
Begleitspuren und Checkboxen für Melodie, Begleitung, Rhythmus. Nicht verfügbare
Spuren deaktivieren ihre Auswahl. Entscheidungen bleiben beim Variantenwechsel
soweit anwendbar erhalten; Solo bleibt auch nach Ausschalten der Melodie hörbar.
Melodie-/Begleit-/Rhythmusschalter und Mischung wirken ohne Neustart; Instrument,
Melodiefassung, Variante, Strophenzahl und Pause setzen die Wiedergabe zurück.

Browserformat schema 2 erweitert role um rhythm. Gemeinsame Uhr und MIDI-Kanäle,
keine Tonhöhenänderung durch Instrumentenwahl. Alter Klanglabor-Player bleibt kompatibel.
Vorhandene Downloads beziehen sich ausdrücklich auf die ursprüngliche Melodie,
nicht auf das Arrangement oder die recherchierte Alternative.

Separater Arrangementkatalog docs/arrangements/catalog.json; sichere Slugs und
Dateipfade, keine freien URLs. CLI-Katalog und Quellen behalten ihren bisherigen
Vertrag. Neue Lieder ohne Arrangement bleiben bedienbar. Ein fehlgeschlagener
Arrangementkatalog fällt sichtbar auf Solo zurück. Beim Laden einer Begleitung
werden ihre Melodietöne und Dauern gegen die aktuelle Quelle geprüft: Veraltete
Begleitungen dürfen nach add/Ersetzen nicht unbemerkt andere Noten spielen.

Alle bestehenden fünf Lieder erhalten individuell gesetzte Akkordpläne. Bäume und
Schlaf übernehmen die Hörversuche; Schlaf süße erhält F/C7, Kuh G/D/Em,
Viel Glück D/G/A/Bm. Pausen, Auftakte und ausgeschriebene Wiederholungen werden
berücksichtigt; Begleitung wird auf die notierte Länge begrenzt. Vorhandene
Strophenpausen bleiben unverändert. Die ersten Auftakte bleiben ohne Begleitung.
Reproduzierbar: node scripts/prepare-library-arrangements.mjs nach Export/Änderung.

Akzeptanz: jede Arrangementmelodie exakt quellentreu, alte Daten unverändert,
Mehrspur-Audio nicht stumm/übersteuert, Strophen/Tempo/Pause, Spurenschalter und
Instrumentwechsel, veraltete Quellen abweisen, sichere Pfade und Solofallback;
responsive Bedienung real im Browser, Python/JS-Tests, GitHub Actions und Live-HTTPS.
